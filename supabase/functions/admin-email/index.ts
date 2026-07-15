import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
  Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") ?? "Streex <onboarding@resend.dev>";
const APP_PUBLIC_URL = Deno.env.get("APP_PUBLIC_URL") ?? "https://streex.app";
const REPLY_TO_EMAIL = Deno.env.get("REPLY_TO_EMAIL");

type SupabaseClient = ReturnType<typeof createClient>;
type Audience = "test" | "specific" | "inactive" | "all_active";

type DayEntry = {
  date?: string;
  apps?: Record<string, number>;
  shifts?: unknown[];
};

type WeekRow = {
  user_id: string;
  entries: DayEntry[] | string;
  updated_at: string;
};

type Recipient = {
  userId: string | null;
  email: string;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function html(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizeEmail(email: unknown): string {
  return String(email ?? "").trim().toLowerCase();
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

async function getAdminUser(req: Request, anon: SupabaseClient, service: SupabaseClient) {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return { error: json({ error: "Missing authorization." }, 401) };

  const { data: userData, error: userError } = await anon.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user?.id) {
    return { error: json({ error: "Invalid authorization." }, 401) };
  }

  const email = normalizeEmail(user.email);
  const { data: admin, error: adminError } = await service
    .from("admin_users")
    .select("*")
    .eq("enabled", true)
    .or(`user_id.eq.${user.id},email.eq.${email}`)
    .maybeSingle();

  if (adminError || !admin) {
    return { error: json({ error: "Admin access required." }, 403) };
  }

  return { user, admin };
}

async function ensurePreference(service: SupabaseClient, recipient: Recipient) {
  const email = normalizeEmail(recipient.email);
  const { data: existing } = await service
    .from("email_preferences")
    .select("*")
    .eq("user_email", email)
    .maybeSingle();

  if (existing) return existing;

  const { data, error } = await service
    .from("email_preferences")
    .insert({
      user_id: recipient.userId,
      user_email: email,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

async function getActivityByUser(service: SupabaseClient) {
  const { data: weeks } = await service
    .from("weeks")
    .select("user_id,entries,updated_at");
  const activity = new Map<string, string>();

  for (const week of (weeks ?? []) as WeekRow[]) {
    let active = false;
    for (const day of parseEntries(week.entries)) {
      const shifts = Array.isArray(day.shifts) ? day.shifts : [];
      if (dayTotal(day) > 0 || shifts.length > 0) {
        active = true;
        break;
      }
    }
    if (!active) continue;
    const current = activity.get(week.user_id);
    if (!current || week.updated_at > current) activity.set(week.user_id, week.updated_at);
  }

  return activity;
}

async function resolveRecipients(service: SupabaseClient, args: {
  audience: Audience;
  specificEmail?: string;
  adminEmail?: string | null;
}) {
  const { data: authUsers } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const users = (authUsers?.users ?? [])
    .map((user: any) => ({
      userId: String(user.id),
      email: normalizeEmail(user.email),
    }))
    .filter((user) => user.email);

  const { data: accessRows } = await service
    .from("account_access_controls")
    .select("user_id,status");
  const blocked = new Set(
    (accessRows ?? [])
      .filter((row: any) => row.status === "blocked" || row.status === "deleted_pending")
      .map((row: any) => row.user_id),
  );

  const optedOut = new Set(
    ((await service
      .from("email_preferences")
      .select("user_email")
      .eq("marketing_opt_out", true)).data ?? [])
      .map((row: any) => normalizeEmail(row.user_email)),
  );

  const eligible = users.filter((user) => !blocked.has(user.userId) && !optedOut.has(user.email));

  if (args.audience === "test") {
    const email = normalizeEmail(args.specificEmail || args.adminEmail);
    return email ? [{ userId: null, email }] : [];
  }

  if (args.audience === "specific") {
    const email = normalizeEmail(args.specificEmail);
    return eligible.filter((user) => user.email === email);
  }

  if (args.audience === "inactive") {
    const activity = await getActivityByUser(service);
    const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
    return eligible.filter((user) => {
      const lastActivity = activity.get(user.userId);
      return !lastActivity || Date.parse(lastActivity) < cutoff;
    });
  }

  return eligible;
}

function renderEmail(args: {
  body: string;
  appUrl: string;
  unsubscribeUrl: string;
}) {
  const escapedBody = escapeHtml(args.body)
    .replace(/\{\{app_url\}\}/g, escapeHtml(args.appUrl))
    .replace(/\n/g, "<br />");
  const appUrl = escapeHtml(args.appUrl);
  const unsubscribeUrl = escapeHtml(args.unsubscribeUrl);

  return `
    <div style="font-family:Inter,Arial,sans-serif;line-height:1.55;color:#111827;max-width:560px;margin:0 auto;padding:24px">
      <div style="font-size:12px;letter-spacing:0.22em;text-transform:uppercase;color:#2563eb;font-weight:800;margin-bottom:14px">Streex</div>
      <div style="font-size:15px">${escapedBody}</div>
      <div style="margin:24px 0">
        <a href="${appUrl}" style="background:#2563eb;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:700;display:inline-block">Open Streex</a>
      </div>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0" />
      <p style="font-size:12px;color:#6b7280">
        You're receiving this because you have a Streex account.
        <a href="${unsubscribeUrl}" style="color:#2563eb">Unsubscribe</a>
      </p>
    </div>
  `;
}

async function sendResendEmail(args: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured.");

  const payload: Record<string, unknown> = {
    from: RESEND_FROM_EMAIL,
    to: [args.to],
    subject: args.subject,
    html: args.html,
    tags: [{ name: "source", value: "streex_reengagement" }],
  };
  if (REPLY_TO_EMAIL) payload.reply_to = REPLY_TO_EMAIL;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `Resend failed with ${res.status}`);
  return data?.id ? String(data.id) : null;
}

async function sendCampaign(service: SupabaseClient, adminUserId: string, adminEmail: string | null, body: any) {
  const audience = String(body.audience ?? "test") as Audience;
  if (!["test", "specific", "inactive", "all_active"].includes(audience)) {
    return json({ error: "Invalid audience." }, 400);
  }

  const subject = String(body.subject ?? "").trim();
  const campaignBody = String(body.body ?? "").trim();
  const appUrl = String(body.appUrl || APP_PUBLIC_URL).trim();
  const specificEmail = normalizeEmail(body.specificEmail);
  const name = String(body.name || `Re-engagement ${new Date().toISOString().slice(0, 10)}`).trim();

  if (!subject || !campaignBody || !appUrl) {
    return json({ error: "Subject, body, and app URL are required." }, 400);
  }
  if ((audience === "specific" || audience === "test") && !normalizeEmail(specificEmail || adminEmail)) {
    return json({ error: "A recipient email is required." }, 400);
  }

  const recipients = await resolveRecipients(service, { audience, specificEmail, adminEmail });
  if (!recipients.length) return json({ error: "No eligible recipients found." }, 400);
  if (audience !== "test" && body.confirmBroadcast !== true) {
    return json({ error: "Broadcast confirmation is required." }, 400);
  }

  const now = new Date().toISOString();
  const { data: campaign, error: campaignError } = await service
    .from("email_campaigns")
    .insert({
      created_by: adminUserId,
      name,
      audience,
      subject,
      body: campaignBody,
      app_url: appUrl,
      status: "sending",
      requested_count: recipients.length,
      metadata: { specificEmail: specificEmail || null },
    })
    .select("*")
    .single();
  if (campaignError) return json({ error: campaignError.message }, 500);

  let sentCount = 0;
  let failedCount = 0;

  for (const recipient of recipients) {
    let recipientRow: any = null;
    try {
      const preference = await ensurePreference(service, recipient);
      const unsubscribeUrl = `${SUPABASE_URL}/functions/v1/admin-email?token=${preference.unsubscribe_token}`;
      const { data: inserted } = await service
        .from("email_campaign_recipients")
        .insert({
          campaign_id: campaign.id,
          user_id: recipient.userId,
          user_email: recipient.email,
          status: "pending",
        })
        .select("*")
        .single();
      recipientRow = inserted;

      const resendEmailId = await sendResendEmail({
        to: recipient.email,
        subject,
        html: renderEmail({ body: campaignBody, appUrl, unsubscribeUrl }),
      });

      sentCount += 1;
      await service
        .from("email_campaign_recipients")
        .update({ status: "sent", resend_email_id: resendEmailId, sent_at: new Date().toISOString() })
        .eq("id", recipientRow.id);
    } catch (error) {
      failedCount += 1;
      const errorMessage = error instanceof Error ? error.message : "Email send failed.";
      if (recipientRow?.id) {
        await service
          .from("email_campaign_recipients")
          .update({ status: "failed", error_message: errorMessage })
          .eq("id", recipientRow.id);
      } else {
        await service
          .from("email_campaign_recipients")
          .insert({
            campaign_id: campaign.id,
            user_id: recipient.userId,
            user_email: recipient.email,
            status: "failed",
            error_message: errorMessage,
          });
      }
    }
  }

  const { data: updatedCampaign, error: updateError } = await service
    .from("email_campaigns")
    .update({
      status: failedCount > 0 && sentCount === 0 ? "failed" : "sent",
      sent_count: sentCount,
      failed_count: failedCount,
      sent_at: sentCount > 0 ? now : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", campaign.id)
    .select("*")
    .single();

  if (updateError) return json({ error: updateError.message }, 500);
  return json({ campaign: updatedCampaign, sentCount, failedCount, requestedCount: recipients.length });
}

async function listCampaigns(service: SupabaseClient) {
  const { data, error } = await service
    .from("email_campaigns")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) return json({ error: error.message }, 500);
  return json({ campaigns: data ?? [], appUrl: APP_PUBLIC_URL, fromEmail: RESEND_FROM_EMAIL });
}

async function unsubscribe(service: SupabaseClient, token: string | null) {
  if (!token) return html("<p>Missing unsubscribe token.</p>", 400);
  const { data, error } = await service
    .from("email_preferences")
    .update({
      marketing_opt_out: true,
      unsubscribed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("unsubscribe_token", token)
    .select("user_email")
    .maybeSingle();

  if (error || !data) return html("<p>Unsubscribe link not found.</p>", 404);
  return html(`
    <div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:48px auto;padding:24px">
      <h1>You're unsubscribed</h1>
      <p>${escapeHtml(data.user_email)} will no longer receive Streex product update emails.</p>
    </div>
  `);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (!SUPABASE_SERVICE_ROLE_KEY) return json({ error: "Email admin service is not configured." }, 503);

  const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (req.method === "GET") {
    const url = new URL(req.url);
    return unsubscribe(service, url.searchParams.get("token"));
  }

  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });

  const access = await getAdminUser(req, anon, service);
  if ("error" in access) return access.error;

  const body = await req.json().catch(() => ({}));
  const action = String(body.action ?? "");

  try {
    if (action === "listCampaigns") return listCampaigns(service);
    if (action === "sendCampaign") {
      return sendCampaign(service, access.user.id, access.user.email ?? null, body);
    }
    return json({ error: "Unknown email action." }, 400);
  } catch (error) {
    console.error("admin-email failed", error);
    return json({ error: error instanceof Error ? error.message : "Email operation failed." }, 500);
  }
});
