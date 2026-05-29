// Ask My Data — V6.1 Prototype
// Edge function: receives chat messages + user JWT, fetches compact user data
// (scoped via RLS), builds a small context, and calls Lovable AI Gateway.

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
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

interface DayEntry {
  dayName: string;
  date: string;
  apps: Record<string, number>;
}
interface WeekRow {
  id: string;
  start_date: string;
  end_date: string;
  weekly_goal: number;
  status: "open" | "closed";
  entries: DayEntry[] | string;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function dayTotal(d: DayEntry): number {
  return Object.values(d.apps || {}).reduce((s, v) => s + (Number(v) || 0), 0);
}
function weekTotal(w: { entries: DayEntry[] }): number {
  return (w.entries || []).reduce((s, d) => s + dayTotal(d), 0);
}
function parseEntries(e: DayEntry[] | string): DayEntry[] {
  if (Array.isArray(e)) return e;
  try { return JSON.parse(e); } catch { return []; }
}

function buildContext(args: {
  weeks: WeekRow[];
  settings: { default_weekly_goal: number; currency_symbol: string; active_apps: string[] } | null;
  achievements: { achievement_id: string; unlocked_at: string }[];
}) {
  const { settings, achievements } = args;
  const weeks = args.weeks.map((w) => ({
    ...w,
    entries: parseEntries(w.entries),
  }));

  const symbol = settings?.currency_symbol ?? "$";

  const summarized = weeks.slice(0, 12).map((w) => {
    const total = weekTotal(w);
    const dayTotals = w.entries.map((d) => ({
      day: d.dayName,
      date: d.date,
      total: +dayTotal(d).toFixed(2),
    }));
    const appTotals: Record<string, number> = {};
    for (const d of w.entries) {
      for (const [app, v] of Object.entries(d.apps || {})) {
        appTotals[app] = (appTotals[app] || 0) + (Number(v) || 0);
      }
    }
    return {
      startDate: w.start_date,
      endDate: w.end_date,
      status: w.status,
      goal: Number(w.weekly_goal),
      total: +total.toFixed(2),
      daysWorked: dayTotals.filter((d) => d.total > 0).length,
      dayTotals,
      appTotals: Object.fromEntries(
        Object.entries(appTotals).map(([k, v]) => [k, +v.toFixed(2)]),
      ),
    };
  });

  const closed = summarized.filter((w) => w.status === "closed");
  const best = closed.reduce<typeof summarized[number] | null>(
    (b, w) => (!b || w.total > b.total ? w : b),
    null,
  );
  const avg = closed.length
    ? +(closed.reduce((s, w) => s + w.total, 0) / closed.length).toFixed(2)
    : 0;

  // Weekday averages (only days with earnings)
  const byDay: Record<string, { sum: number; count: number }> = {};
  for (const w of summarized) {
    for (const d of w.dayTotals) {
      if (d.total > 0) {
        const k = d.day;
        byDay[k] = byDay[k] || { sum: 0, count: 0 };
        byDay[k].sum += d.total;
        byDay[k].count += 1;
      }
    }
  }
  const weekdayAverages = Object.fromEntries(
    Object.entries(byDay).map(([k, v]) => [k, +(v.sum / v.count).toFixed(2)]),
  );

  return {
    currency: symbol,
    settings: settings
      ? {
        weeklyGoal: Number(settings.default_weekly_goal),
        activeApps: settings.active_apps,
      }
      : null,
    totals: {
      weeksTracked: summarized.length,
      closedWeeks: closed.length,
      averageClosedWeek: avg,
      bestClosedWeek: best
        ? { startDate: best.startDate, total: best.total }
        : null,
    },
    weekdayAverages,
    recentWeeks: summarized,
    achievements: {
      unlockedCount: achievements.length,
      recent: achievements.slice(0, 10),
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  if (!LOVABLE_API_KEY) {
    return json({ error: "AI is not configured. Missing LOVABLE_API_KEY." }, 500);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return json({ error: "Missing authentication. Please sign in again." }, 401);
  }

  let body: { messages?: ChatMessage[] };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }
  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (!messages.length) return json({ error: "No messages provided." }, 400);

  // Trim to last 20 messages and cap content length
  const safeMessages = messages.slice(-20).map((m) => ({
    role: m.role,
    content: String(m.content ?? "").slice(0, 4000),
  }));

  // Supabase client scoped to the caller via JWT (RLS applies)
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes?.user) {
    return json({ error: "Authentication issue. Please sign in again." }, 401);
  }

  // Fetch compact data — RLS limits everything to this user
  const [weeksRes, settingsRes, achRes] = await Promise.all([
    supabase.from("weeks")
      .select("id,start_date,end_date,weekly_goal,status,entries")
      .order("start_date", { ascending: false })
      .limit(12),
    supabase.from("user_settings")
      .select("default_weekly_goal,currency_symbol,active_apps")
      .maybeSingle(),
    supabase.from("user_achievements")
      .select("achievement_id,unlocked_at")
      .order("unlocked_at", { ascending: false })
      .limit(25),
  ]);

  if (weeksRes.error) {
    return json({ error: "Could not load your data." }, 500);
  }

  const weeks = (weeksRes.data ?? []) as WeekRow[];
  if (!weeks.length) {
    return json({
      text:
        "I don't see any tracked weeks yet. Log a few days on the Dashboard or in Entry, and I'll be able to analyze your earnings.",
    });
  }

  const context = buildContext({
    weeks,
    settings: settingsRes.data ?? null,
    achievements: achRes.data ?? [],
  });

  const system = [
    "You are 'Ask My Data', an analytics assistant inside Streex — a gig earnings tracker.",
    "Answer ONLY using the JSON context provided. If the answer isn't in the data, say so plainly.",
    "Be concise, friendly, and specific. Prefer short paragraphs and small markdown lists.",
    "Always format currency using the provided symbol. Reference dates in a human way (e.g. 'week of Mar 10').",
    "Never invent numbers. Never reveal raw JSON or internal fields. No SQL.",
  ].join(" ");

  const contextMessage =
    "USER DATA CONTEXT (JSON):\n" + JSON.stringify(context);

  const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": LOVABLE_API_KEY,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: system },
        { role: "system", content: contextMessage },
        ...safeMessages,
      ],
    }),
  });

  if (upstream.status === 429) {
    return json(
      { error: "Rate limit reached. Please wait a moment and try again." },
      429,
    );
  }
  if (upstream.status === 402) {
    return json(
      { error: "AI credits exhausted for this workspace. Add credits in Settings → Workspace → Usage." },
      402,
    );
  }
  if (!upstream.ok) {
    const errText = await upstream.text().catch(() => "");
    console.error("Lovable AI error", upstream.status, errText);
    return json({ error: "The assistant is temporarily unavailable." }, 502);
  }

  const data = await upstream.json();
  const text: string =
    data?.choices?.[0]?.message?.content ??
    "I couldn't generate a response. Please try again.";

  return json({ text });
});