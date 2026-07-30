import { createClient } from "@supabase/supabase-js";

const required = [
  "STREEX_SUPABASE_URL",
  "STREEX_SUPABASE_PUBLISHABLE_KEY",
  "STREEX_QA_EMAIL",
  "STREEX_QA_PASSWORD",
  "STREEX_QA_ALT_EMAIL",
  "STREEX_QA_ALT_PASSWORD",
];

for (const name of required) {
  if (!process.env[name]) {
    throw new Error(`Missing required QA environment variable: ${name}`);
  }
}

const url = process.env.STREEX_SUPABASE_URL;
const key = process.env.STREEX_SUPABASE_PUBLISHABLE_KEY;

function qaClient() {
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

async function signIn(email, password) {
  const client = qaClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    throw new Error("An isolated QA identity could not sign in.");
  }
  return { client, userId: data.user.id };
}

async function visibleOwnerTables(client, userId) {
  const tables = ["user_settings", "user_onboarding", "weeks"];
  const visible = [];

  for (const table of tables) {
    const { count, error } = await client
      .from(table)
      .select("user_id", { count: "exact", head: true })
      .eq("user_id", userId);
    if (error) throw new Error(`Owner read failed for ${table}: ${error.message}`);
    if ((count ?? 0) > 0) visible.push(table);
  }

  if (!visible.length) {
    throw new Error("The QA identity needs at least one owner-visible settings, onboarding, or week row.");
  }
  return visible;
}

async function assertForeignRowsHidden(client, foreignUserId, tables) {
  for (const table of tables) {
    const { count, error } = await client
      .from(table)
      .select("user_id", { count: "exact", head: true })
      .eq("user_id", foreignUserId);
    if (error) throw new Error(`Cross-account read check failed for ${table}: ${error.message}`);
    if ((count ?? 0) !== 0) {
      throw new Error(`RLS boundary failed: a QA identity can read another user's ${table} rows.`);
    }
  }
}

const primary = await signIn(process.env.STREEX_QA_EMAIL, process.env.STREEX_QA_PASSWORD);
const alternate = await signIn(process.env.STREEX_QA_ALT_EMAIL, process.env.STREEX_QA_ALT_PASSWORD);

try {
  const primaryTables = await visibleOwnerTables(primary.client, primary.userId);
  const alternateTables = await visibleOwnerTables(alternate.client, alternate.userId);

  await assertForeignRowsHidden(alternate.client, primary.userId, primaryTables);
  await assertForeignRowsHidden(primary.client, alternate.userId, alternateTables);
  console.log(`RLS certification passed across two isolated identities and ${new Set([...primaryTables, ...alternateTables]).size} owner-scoped table types.`);
} finally {
  await Promise.allSettled([
    primary.client.auth.signOut(),
    alternate.client.auth.signOut(),
  ]);
}
