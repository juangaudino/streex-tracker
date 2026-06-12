#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

const args = new Map();
for (let i = 2; i < process.argv.length; i += 1) {
  const arg = process.argv[i];
  if (!arg.startsWith("--")) continue;
  const key = arg.slice(2);
  const next = process.argv[i + 1];
  if (!next || next.startsWith("--")) {
    args.set(key, "true");
  } else {
    args.set(key, next);
    i += 1;
  }
}

const required = ["zip", "old-user-id", "new-user-id", "project-ref", "project-url", "publishable-key"];
const missing = required.filter((key) => !args.get(key));
if (missing.length > 0) {
  console.error(`Missing required args: ${missing.map((key) => `--${key}`).join(", ")}`);
  console.error("");
  console.error("Example:");
  console.error(
    "node scripts/prepare-owner-staging-migration.mjs --zip ~/Downloads/streex-migration.zip --old-user-id OLD_UUID --new-user-id NEW_UUID --project-ref NEW_REF --project-url https://NEW_REF.supabase.co --publishable-key sb_publishable_xxx",
  );
  process.exit(1);
}

const zipPath = resolve(args.get("zip").replace(/^~(?=$|\/)/, process.env.HOME ?? ""));
const oldUserId = args.get("old-user-id");
const newUserId = args.get("new-user-id");
const projectRef = args.get("project-ref");
const projectUrl = args.get("project-url");
const publishableKey = args.get("publishable-key");
const outputDir = resolve(repoRoot, ".migration-output", `staging-${projectRef}`);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (!UUID_RE.test(oldUserId) || !UUID_RE.test(newUserId)) {
  throw new Error("Both --old-user-id and --new-user-id must be UUIDs.");
}

function unzipText(pathInZip) {
  return execFileSync("unzip", ["-p", zipPath, pathInZip], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 50,
  });
}

function cleanSchema(sql) {
  return [
    "-- Streex owner-only staging migration schema",
    "-- Generated locally. Review before running. Do not run against production.",
    "",
    "create extension if not exists pgcrypto with schema extensions;",
    "",
    ...sql
      .split(/\r?\n/)
      .filter((line) => {
        const trimmed = line.trim();
        if (trimmed.startsWith("\\restrict") || trimmed.startsWith("\\unrestrict")) return false;
        if (/^CREATE SCHEMA public;$/i.test(trimmed)) return false;
        if (/^COMMENT ON SCHEMA public IS /i.test(trimmed)) return false;
        if (/^SET /i.test(trimmed)) return false;
        if (/^SELECT pg_catalog\.set_config/i.test(trimmed)) return false;
        return true;
      }),
    "",
  ].join("\n");
}

function parseCopyBlocks(sql) {
  const lines = sql.split(/\r?\n/);
  const blocks = [];
  for (let i = 0; i < lines.length; i += 1) {
    const header = lines[i];
    const match = header.match(/^COPY public\.([a-zA-Z0-9_]+) \((.+)\) FROM stdin;$/);
    if (!match) continue;

    const rows = [];
    i += 1;
    while (i < lines.length && lines[i] !== "\\.") {
      if (lines[i].length > 0) rows.push(lines[i]);
      i += 1;
    }

    blocks.push({ table: match[1], header, rows });
  }
  return blocks;
}

function copyBlock(header, rows) {
  return `${header}\n${rows.join("\n")}\n\\.\n`;
}

const coreTables = new Set([
  "admin_users",
  "weeks",
  "earnings_snapshots",
  "user_achievements",
  "user_settings",
  "xp_events",
]);

const optionalTables = new Set([
  "account_access_controls",
  "feedback_items",
  "email_preferences",
]);

function buildOwnerData(sql, mode) {
  const blocks = parseCopyBlocks(sql);
  const output = [
    "-- Streex owner-only staging data",
    "-- Generated locally. Review before running. Do not run against production.",
    `-- Old owner user_id: ${oldUserId}`,
    `-- New owner user_id: ${newUserId}`,
    "",
    "begin;",
    "",
  ];

  const selected = [];
  for (const block of blocks) {
    const isCore = coreTables.has(block.table);
    const isOptional = optionalTables.has(block.table);
    if (mode === "core" && !isCore && block.table !== "app_runtime_config") continue;
    if (mode === "optional" && !isOptional) continue;

    let rows = block.rows.filter((row) => row.includes(oldUserId));

    if (block.table === "app_runtime_config" && mode === "core") {
      rows = block.rows.map((row) => {
        const cols = row.split("\t");
        if (cols.length >= 7) {
          cols[4] = "\\N"; // forced_logout_after
          cols[5] = newUserId; // updated_by
        }
        return cols.join("\t");
      });
    }

    rows = rows.map((row) => row.split(oldUserId).join(newUserId));
    if (rows.length === 0) continue;
    selected.push({ table: block.table, rows: rows.length });
    output.push(`-- ${block.table}: ${rows.length} row(s)`);
    output.push(copyBlock(block.header, rows));
  }

  output.push("commit;");
  output.push("");
  return { sql: output.join("\n"), selected };
}

function buildAiLogs(sql) {
  const blocks = parseCopyBlocks(sql);
  const output = [
    "-- Optional Streex AI usage logs for owner-only staging",
    "-- These logs may contain prompt previews. Import only if you intentionally want them in staging.",
    "",
    "begin;",
    "",
  ];
  const selected = [];
  for (const block of blocks) {
    if (block.table !== "ai_usage_logs") continue;
    const rows = block.rows
      .filter((row) => row.includes(oldUserId))
      .map((row) => row.split(oldUserId).join(newUserId));
    if (rows.length === 0) continue;
    selected.push({ table: block.table, rows: rows.length });
    output.push(`-- ${block.table}: ${rows.length} row(s)`);
    output.push(copyBlock(block.header, rows));
  }
  output.push("commit;");
  output.push("");
  return { sql: output.join("\n"), selected };
}

mkdirSync(outputDir, { recursive: true });

const schema = cleanSchema(unzipText("01_schema_public.sql"));
const publicData = unzipText("02_data_public.sql");
const aiData = unzipText("03_data_ai_usage_logs.sql");
const coreData = buildOwnerData(publicData, "core");
const optionalData = buildOwnerData(publicData, "optional");
const aiLogs = buildAiLogs(aiData);

writeFileSync(resolve(outputDir, "01_schema_staging_clean.sql"), schema);
writeFileSync(resolve(outputDir, "02_owner_core_data_remapped.sql"), coreData.sql);
writeFileSync(resolve(outputDir, "03_owner_optional_data_remapped.sql"), optionalData.sql);
writeFileSync(resolve(outputDir, "04_owner_ai_usage_logs_optional_remapped.sql"), aiLogs.sql);
writeFileSync(
  resolve(outputDir, ".env.staging.example"),
  [
    `VITE_SUPABASE_URL=${projectUrl}`,
    `VITE_SUPABASE_PUBLISHABLE_KEY=${publishableKey}`,
    `VITE_SUPABASE_PROJECT_ID=${projectRef}`,
    "",
  ].join("\n"),
);
writeFileSync(resolve(outputDir, "config.toml.staging.example"), `project_id = "${projectRef}"\n`);
writeFileSync(
  resolve(outputDir, "README.md"),
  [
    "# Streex Owner-Only Supabase Staging Package",
    "",
    "Generated locally from `streex-migration.zip`.",
    "",
    "Do not commit this folder. It contains remapped owner production data.",
    "",
    "## Project",
    "",
    `- Project ref: \`${projectRef}\``,
    `- Project URL: \`${projectUrl}\``,
    `- Old owner user_id: \`${oldUserId}\``,
    `- New owner user_id: \`${newUserId}\``,
    "",
    "## Files",
    "",
    "- `01_schema_staging_clean.sql`: cleaned public schema for a disposable staging project.",
    "- `02_owner_core_data_remapped.sql`: owner core app data with user_id remapped.",
    "- `03_owner_optional_data_remapped.sql`: optional feedback/preferences/access rows with user_id remapped.",
    "- `04_owner_ai_usage_logs_optional_remapped.sql`: optional AI logs; may contain prompt previews.",
    "- `.env.staging.example`: frontend staging env example.",
    "- `config.toml.staging.example`: Supabase CLI project ref example.",
    "",
    "## Suggested import order",
    "",
    "1. Confirm the staging project is disposable.",
    "2. Ensure the new owner Auth user exists.",
    "3. Run `01_schema_staging_clean.sql` using `psql`.",
    "4. Run `02_owner_core_data_remapped.sql` using `psql`.",
    "5. Optionally run `03_owner_optional_data_remapped.sql`.",
    "6. Optionally run `04_owner_ai_usage_logs_optional_remapped.sql`.",
    "7. Deploy Edge Functions and set secrets.",
    "8. Point a Vercel preview to this staging Supabase project.",
    "",
    "Do not run these scripts against production.",
    "",
    "## Row counts",
    "",
    "Core:",
    ...coreData.selected.map((item) => `- ${item.table}: ${item.rows}`),
    "",
    "Optional:",
    ...optionalData.selected.map((item) => `- ${item.table}: ${item.rows}`),
    "",
    "AI logs:",
    ...aiLogs.selected.map((item) => `- ${item.table}: ${item.rows}`),
    "",
  ].join("\n"),
);

console.log(`Generated staging package at ${outputDir}`);
console.log("Core rows:", coreData.selected);
console.log("Optional rows:", optionalData.selected);
console.log("AI log rows:", aiLogs.selected);
