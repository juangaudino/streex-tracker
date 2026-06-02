import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
  Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

type SupabaseClient = ReturnType<typeof createClient>;
type FeedbackStatus = "new" | "reviewed" | "planned" | "resolved" | "dismissed";
type FeedbackType = "suggestion" | "bug" | "general";
type AccountStatus = "active" | "blocked" | "deleted_pending";

type DayEntry = {
  date?: string;
  apps?: Record<string, number>;
  shifts?: { startTime?: string; endTime?: string }[];
};

type WeekRow = {
  user_id: string;
  start_date: string;
  end_date: string;
  entries: DayEntry[] | string;
  created_at: string;
  updated_at: string;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function parseEntries(entries: DayEntry[] | string | null): DayEntry[] {
  if (Array.isArray(entries)) return entries;
  if (!entries) return [];
  try {
    const parsed = JSON.parse(entries);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function dayTotal(day: DayEntry): number {
  return Object.values(day.apps ?? {}).reduce((sum, value) => sum + (Number(value) || 0), 0);
}

function compactUser(user: any) {
  return {
    id: user.id,
    email: user.email ?? null,
    createdAt: user.created_at ?? null,
    lastSignInAt: user.last_sign_in_at ?? null,
  };
}

async function getAdminUser(req: Request, anon: SupabaseClient, service: SupabaseClient) {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return { error: json({ error: "Missing authorization." }, 401) };

  const { data: userData, error: userError } = await anon.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user?.id) {
    return { error: json({ error: "Invalid authorization." }, 401) };
  }

  const email = String(user.email ?? "").toLowerCase();
  const { data: admin, error: adminError } = await service
    .from("admin_users")
    .select("*")
    .eq("enabled", true)
    .or(`user_id.eq.${user.id},email.eq.${email}`)
    .maybeSingle();

  if (adminError || !admin) {
    return { error: json({ error: "Admin access required." }, 403) };
  }

  if (!admin.user_id) {
    await service
      .from("admin_users")
      .update({ user_id: user.id, email, updated_at: new Date().toISOString() })
      .eq("id", admin.id);
  }

  return { user, admin };
}

async function getRuntimeConfig(service: SupabaseClient) {
  const { data } = await service
    .from("app_runtime_config")
    .select("*")
    .eq("singleton", true)
    .maybeSingle();

  return data ?? {
    latest_version: "5.7.2",
    update_required: false,
    update_message: "A new Streex update is available. Refresh to get the latest version.",
    forced_logout_after: null,
    updated_at: new Date().toISOString(),
  };
}

function buildUsageStats(weeks: WeekRow[]) {
  const byUser = new Map<string, {
    totalWeeks: number;
    totalShiftBlocks: number;
    activeDays: number;
    lastEntryDate: string | null;
    lastActivityAt: string | null;
  }>();

  for (const week of weeks) {
    const stats = byUser.get(week.user_id) ?? {
      totalWeeks: 0,
      totalShiftBlocks: 0,
      activeDays: 0,
      lastEntryDate: null,
      lastActivityAt: null,
    };

    stats.totalWeeks += 1;
    stats.lastActivityAt = [stats.lastActivityAt, week.updated_at, week.created_at]
      .filter(Boolean)
      .sort()
      .at(-1) ?? stats.lastActivityAt;

    for (const day of parseEntries(week.entries)) {
      const shifts = Array.isArray(day.shifts) ? day.shifts : [];
      stats.totalShiftBlocks += shifts.length;
      const isActiveDay = dayTotal(day) > 0 || shifts.length > 0;
      if (isActiveDay) {
        stats.activeDays += 1;
        if (day.date && (!stats.lastEntryDate || day.date > stats.lastEntryDate)) {
          stats.lastEntryDate = day.date;
        }
      }
    }

    byUser.set(week.user_id, stats);
  }

  return byUser;
}

async function getAdminOverview(service: SupabaseClient) {
  const [{ data: authUsers }, { data: weeks }, { data: accessRows }, { data: admins }] = await Promise.all([
    service.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    service.from("weeks").select("user_id,start_date,end_date,entries,created_at,updated_at"),
    service.from("account_access_controls").select("*"),
    service.from("admin_users").select("*").order("created_at", { ascending: true }),
  ]);

  const usage = buildUsageStats((weeks ?? []) as WeekRow[]);
  const accessByUser = new Map((accessRows ?? []).map((row: any) => [row.user_id, row]));
  const users = (authUsers?.users ?? []).map((user: any) => {
    const stats = usage.get(user.id) ?? {
      totalWeeks: 0,
      totalShiftBlocks: 0,
      activeDays: 0,
      lastEntryDate: null,
      lastActivityAt: null,
    };
    const access = accessByUser.get(user.id);
    return {
      ...compactUser(user),
      status: access?.status ?? "active",
      blockedAt: access?.blocked_at ?? null,
      deleteRequestedAt: access?.delete_requested_at ?? null,
      ...stats,
    };
  });

  const recentUsers = [...users]
    .sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")))
    .slice(0, 12);
  const inactiveUsers = users
    .filter((u) => !u.lastActivityAt)
    .slice(0, 12);
  const blockedUsers = users.filter((u) => u.status === "blocked");

  return {
    totals: {
      users: users.length,
      recentUsers: recentUsers.length,
      inactiveUsers: inactiveUsers.length,
      blockedUsers: blockedUsers.length,
      admins: (admins ?? []).filter((admin: any) => admin.enabled).length,
    },
    users,
    recentUsers,
    inactiveUsers,
    blockedUsers,
    admins: admins ?? [],
  };
}

async function setUserStatus(service: SupabaseClient, adminUserId: string, body: any) {
  const userId = String(body.userId ?? "");
  const status = String(body.status ?? "") as AccountStatus;
  if (!userId || !["active", "blocked", "deleted_pending"].includes(status)) {
    return json({ error: "Invalid user status request." }, 400);
  }
  if (userId === adminUserId && status !== "active") {
    return json({ error: "Admins cannot restrict their own account." }, 400);
  }

  const now = new Date().toISOString();
  const patch = status === "active"
    ? {
      user_id: userId,
      status,
      unblocked_at: now,
      unblocked_by: adminUserId,
      updated_at: now,
    }
    : status === "blocked"
    ? {
      user_id: userId,
      status,
      blocked_at: now,
      blocked_by: adminUserId,
      internal_note: body.internalNote ?? null,
      updated_at: now,
    }
    : {
      user_id: userId,
      status,
      delete_requested_at: now,
      delete_requested_by: adminUserId,
      internal_note: body.internalNote ?? "Soft-delete requested from Streex Admin.",
      updated_at: now,
    };

  const { error } = await service
    .from("account_access_controls")
    .upsert(patch, { onConflict: "user_id" });

  if (error) return json({ error: error.message }, 500);
  return json({ ok: true });
}

async function updateAppConfig(service: SupabaseClient, adminUserId: string, body: any) {
  const latestVersion = String(body.latestVersion ?? "").trim();
  if (!latestVersion) return json({ error: "latestVersion is required." }, 400);

  const { data, error } = await service
    .from("app_runtime_config")
    .upsert({
      singleton: true,
      latest_version: latestVersion,
      update_required: Boolean(body.updateRequired),
      update_message: String(body.updateMessage || "A new Streex update is available. Refresh to get the latest version."),
      updated_by: adminUserId,
      updated_at: new Date().toISOString(),
    }, { onConflict: "singleton" })
    .select("*")
    .single();

  if (error) return json({ error: error.message }, 500);
  return json({ config: data });
}

async function forceSignOutAll(service: SupabaseClient, adminUserId: string) {
  const now = new Date().toISOString();
  const { data, error } = await service
    .from("app_runtime_config")
    .upsert({
      singleton: true,
      forced_logout_after: now,
      updated_by: adminUserId,
      updated_at: now,
    }, { onConflict: "singleton" })
    .select("*")
    .single();

  if (error) return json({ error: error.message }, 500);
  return json({ config: data });
}

async function updateFeedback(service: SupabaseClient, body: any) {
  const id = String(body.id ?? "");
  const status = String(body.status ?? "") as FeedbackStatus;
  if (!id || !["new", "reviewed", "planned", "resolved", "dismissed"].includes(status)) {
    return json({ error: "Invalid feedback update." }, 400);
  }
  const { data, error } = await service
    .from("feedback_items")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) return json({ error: error.message }, 500);
  return json({ feedback: data });
}

async function deleteFeedback(service: SupabaseClient, body: any) {
  const id = String(body.id ?? "");
  if (!id) return json({ error: "Feedback id is required." }, 400);
  const { error } = await service.from("feedback_items").delete().eq("id", id);
  if (error) return json({ error: error.message }, 500);
  return json({ ok: true });
}

async function addAdminByEmail(service: SupabaseClient, adminUserId: string, body: any) {
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) return json({ error: "Valid email is required." }, 400);

  const { data: existing } = await service
    .from("admin_users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  const query = existing?.id
    ? service
      .from("admin_users")
      .update({
        role: body.role === "owner" ? "owner" : "admin",
        enabled: true,
        invited_by: adminUserId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select("*")
      .single()
    : service
      .from("admin_users")
      .insert({
      email,
      role: body.role === "owner" ? "owner" : "admin",
      enabled: true,
      invited_by: adminUserId,
    })
      .select("*")
      .single();

  const { data, error } = await query;
  if (error) return json({ error: error.message }, 500);
  return json({ admin: data });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: "Admin service is not configured." }, 503);
  }

  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const access = await getAdminUser(req, anon, service);
  if ("error" in access) return access.error;

  const body = await req.json().catch(() => ({}));
  const action = String(body.action ?? "");

  try {
    if (action === "overview") return json(await getAdminOverview(service));
    if (action === "runtimeConfig") return json({ config: await getRuntimeConfig(service) });
    if (action === "updateAppConfig") return updateAppConfig(service, access.user.id, body);
    if (action === "forceSignOutAll") return forceSignOutAll(service, access.user.id);
    if (action === "setUserStatus") return setUserStatus(service, access.user.id, body);
    if (action === "listFeedback") {
      const { data, error } = await service
        .from("feedback_items")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(250);
      if (error) return json({ error: error.message }, 500);
      return json({ feedback: data ?? [] });
    }
    if (action === "updateFeedback") return updateFeedback(service, body);
    if (action === "deleteFeedback") return deleteFeedback(service, body);
    if (action === "listAdmins") {
      const { data, error } = await service.from("admin_users").select("*").order("created_at", { ascending: true });
      if (error) return json({ error: error.message }, 500);
      return json({ admins: data ?? [] });
    }
    if (action === "addAdminByEmail") return addAdminByEmail(service, access.user.id, body);
    return json({ error: "Unknown admin action." }, 400);
  } catch (error) {
    console.error("admin-ops failed", error);
    return json({ error: "Admin operation failed." }, 500);
  }
});
