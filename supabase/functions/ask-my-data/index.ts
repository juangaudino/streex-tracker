// Ask My Data — V6.1 Prototype
// Scope-aware edge function: verifies JWT, reads through caller-scoped RLS,
// builds compact analytics context, and streams Lovable AI Gateway responses.

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

type DataScope = "RECENT" | "ALL_TIME" | "SEASONAL";
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

interface NormalizedWeek {
  id: string;
  startDate: string;
  endDate: string;
  status: "open" | "closed";
  goal: number;
  total: number;
  daysWorked: number;
  appTotals: Record<string, number>;
  dayTotals: { day: string; date: string; total: number }[];
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function round(value: number): number {
  return +value.toFixed(2);
}

function dayTotal(d: DayEntry): number {
  return Object.values(d.apps || {}).reduce((s, v) => s + (Number(v) || 0), 0);
}

function parseEntries(e: DayEntry[] | string): DayEntry[] {
  if (Array.isArray(e)) return e;
  try {
    const parsed = JSON.parse(e);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeWeek(w: WeekRow): NormalizedWeek {
  const entries = parseEntries(w.entries);
  const dayTotals = entries.map((d) => ({
    day: d.dayName,
    date: d.date,
    total: round(dayTotal(d)),
  }));
  const appTotals: Record<string, number> = {};
  for (const d of entries) {
    for (const [app, v] of Object.entries(d.apps || {})) {
      appTotals[app] = (appTotals[app] || 0) + (Number(v) || 0);
    }
  }
  const total = dayTotals.reduce((sum, d) => sum + d.total, 0);
  return {
    id: w.id,
    startDate: w.start_date,
    endDate: w.end_date,
    status: w.status,
    goal: Number(w.weekly_goal),
    total: round(total),
    daysWorked: dayTotals.filter((d) => d.total > 0).length,
    appTotals: Object.fromEntries(
      Object.entries(appTotals).map(([k, v]) => [k, round(v)]),
    ),
    dayTotals,
  };
}

function detectScope(messages: ChatMessage[]): { scope: DataScope; reason: string } {
  const latest = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const q = latest.toLowerCase();

  const seasonalTerms = [
    "season", "seasonal", "summer", "winter", "spring", "fall", "autumn",
    "holiday", "holidays", "month to month", "monthly", "quarter", "quarterly",
    "older", "long range", "long-range", "compare months", "compare periods",
  ];
  const allTimeTerms = [
    "all time", "all-time", "ever", "career", "lifetime", "record", "best week",
    "highest", "lowest", "evolved", "evolution", "history", "historical",
    "overall", "my average", "average weekly", "average week",
  ];
  const recentTerms = [
    "recent", "recently", "lately", "current", "this week", "this month",
    "last few", "momentum", "trend", "trending", "pattern", "now",
    "how am i doing",
  ];

  if (seasonalTerms.some((term) => q.includes(term))) {
    return { scope: "SEASONAL", reason: "Question asks for long-range or time-period comparison." };
  }
  if (allTimeTerms.some((term) => q.includes(term))) {
    return { scope: "ALL_TIME", reason: "Question asks for record, lifetime, or historical analytics." };
  }
  if (recentTerms.some((term) => q.includes(term))) {
    return { scope: "RECENT", reason: "Question asks about recent performance or momentum." };
  }
  return { scope: "RECENT", reason: "Defaulting to recent context for a general question." };
}

function sumAppTotals(weeks: NormalizedWeek[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const w of weeks) {
    for (const [app, amount] of Object.entries(w.appTotals)) {
      totals[app] = (totals[app] || 0) + amount;
    }
  }
  return Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, round(v)]));
}

function weekdayStats(weeks: NormalizedWeek[]) {
  const byDay: Record<string, { sum: number; count: number; best: number; bestDate: string | null }> = {};
  for (const w of weeks) {
    for (const d of w.dayTotals) {
      if (d.total <= 0) continue;
      byDay[d.day] = byDay[d.day] || { sum: 0, count: 0, best: 0, bestDate: null };
      byDay[d.day].sum += d.total;
      byDay[d.day].count += 1;
      if (d.total > byDay[d.day].best) {
        byDay[d.day].best = d.total;
        byDay[d.day].bestDate = d.date;
      }
    }
  }
  return Object.fromEntries(
    Object.entries(byDay).map(([day, v]) => [
      day,
      { average: round(v.sum / v.count), count: v.count, best: round(v.best), bestDate: v.bestDate },
    ]),
  );
}

function streakStats(weeks: NormalizedWeek[]) {
  const days = weeks
    .flatMap((w) => w.dayTotals.map((d) => ({ ...d, worked: d.total > 0 })))
    .sort((a, b) => a.date.localeCompare(b.date));
  let current = 0;
  let longest = 0;
  for (const d of days) {
    if (d.worked) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }
  return { currentActiveDayStreak: current, longestActiveDayStreak: longest };
}

function monthKey(date: string): string {
  return date.slice(0, 7);
}

function quarterKey(date: string): string {
  const year = date.slice(0, 4);
  const month = Number(date.slice(5, 7));
  return `${year}-Q${Math.ceil(month / 3)}`;
}

function seasonKey(date: string): string {
  const year = date.slice(0, 4);
  const month = Number(date.slice(5, 7));
  const season = month === 12 || month <= 2
    ? "Winter"
    : month <= 5
    ? "Spring"
    : month <= 8
    ? "Summer"
    : "Fall";
  return `${year} ${season}`;
}

function rollupByPeriod(weeks: NormalizedWeek[], keyOf: (date: string) => string) {
  const map = new Map<string, { total: number; weeks: number; activeDays: number }>();
  for (const w of weeks) {
    const key = keyOf(w.startDate);
    const cur = map.get(key) || { total: 0, weeks: 0, activeDays: 0 };
    cur.total += w.total;
    cur.weeks += 1;
    cur.activeDays += w.daysWorked;
    map.set(key, cur);
  }
  return [...map.entries()]
    .map(([period, v]) => ({
      period,
      total: round(v.total),
      weeks: v.weeks,
      averageWeek: round(v.total / v.weeks),
      activeDays: v.activeDays,
    }))
    .sort((a, b) => a.period.localeCompare(b.period));
}

function trendBuckets(weeks: NormalizedWeek[]) {
  const closed = weeks.filter((w) => w.status === "closed").sort((a, b) => a.startDate.localeCompare(b.startDate));
  const size = Math.max(1, Math.ceil(closed.length / 4));
  const buckets = [];
  for (let i = 0; i < closed.length; i += size) {
    const group = closed.slice(i, i + size);
    const total = group.reduce((sum, w) => sum + w.total, 0);
    buckets.push({
      from: group[0]?.startDate,
      to: group[group.length - 1]?.endDate,
      weeks: group.length,
      averageWeek: round(total / group.length),
    });
  }
  return buckets;
}

function buildContext(args: {
  scope: DataScope;
  scopeReason: string;
  weeks: WeekRow[];
  settings: { default_weekly_goal: number; currency_symbol: string; active_apps: string[] } | null;
  achievements: { achievement_id: string; unlocked_at: string }[];
}) {
  const { scope, scopeReason, settings, achievements } = args;
  const weeks = args.weeks
    .map(normalizeWeek)
    .sort((a, b) => b.startDate.localeCompare(a.startDate));
  const closed = weeks.filter((w) => w.status === "closed");
  const recent = weeks.slice(0, 16);
  const bestClosedWeek = closed.reduce<NormalizedWeek | null>(
    (best, w) => (!best || w.total > best.total ? w : best),
    null,
  );
  const averageClosedWeek = closed.length
    ? round(closed.reduce((s, w) => s + w.total, 0) / closed.length)
    : 0;
  const base = {
    scope,
    scopeReason,
    currency: settings?.currency_symbol ?? "$",
    settings: settings
      ? {
        weeklyGoal: Number(settings.default_weekly_goal),
        activeApps: settings.active_apps,
      }
      : null,
  };

  if (scope === "ALL_TIME") {
    const lifetimeTotal = weeks.reduce((sum, w) => sum + w.total, 0);
    return {
      ...base,
      lifetime: {
        weeksTracked: weeks.length,
        closedWeeks: closed.length,
        lifetimeTotal: round(lifetimeTotal),
        averageClosedWeek,
        bestClosedWeek: bestClosedWeek
          ? {
            startDate: bestClosedWeek.startDate,
            endDate: bestClosedWeek.endDate,
            total: bestClosedWeek.total,
            daysWorked: bestClosedWeek.daysWorked,
            appTotals: bestClosedWeek.appTotals,
          }
          : null,
        appTotals: sumAppTotals(weeks),
        weekdayStats: weekdayStats(weeks),
        streaks: streakStats(weeks),
        evolution: trendBuckets(weeks),
      },
      recentAchievements: achievements.slice(0, 10),
    };
  }

  if (scope === "SEASONAL") {
    const recentTotal = recent.reduce((sum, w) => sum + w.total, 0);
    const older = weeks.slice(16);
    const olderTotal = older.reduce((sum, w) => sum + w.total, 0);
    return {
      ...base,
      periods: {
        monthly: rollupByPeriod(weeks, monthKey),
        quarterly: rollupByPeriod(weeks, quarterKey),
        seasonal: rollupByPeriod(weeks, seasonKey),
      },
      recentVsOlder: {
        recentWeeks: recent.length,
        recentAverage: recent.length ? round(recentTotal / recent.length) : 0,
        olderWeeks: older.length,
        olderAverage: older.length ? round(olderTotal / older.length) : 0,
      },
      bestClosedWeek: bestClosedWeek
        ? { startDate: bestClosedWeek.startDate, total: bestClosedWeek.total }
        : null,
    };
  }

  return {
    ...base,
    recent: {
      weeksTrackedInScope: recent.length,
      averageClosedWeek,
      bestClosedWeek: bestClosedWeek
        ? { startDate: bestClosedWeek.startDate, total: bestClosedWeek.total }
        : null,
      appTotals: sumAppTotals(recent),
      weekdayStats: weekdayStats(recent),
      streaks: streakStats(recent),
      weeks: recent.map((w) => ({
        startDate: w.startDate,
        endDate: w.endDate,
        status: w.status,
        goal: w.goal,
        total: w.total,
        daysWorked: w.daysWorked,
        dayTotals: w.dayTotals,
        appTotals: w.appTotals,
      })),
    },
    recentAchievements: achievements.slice(0, 10),
  };
}

function streamHeaders(contentType = "text/event-stream") {
  return {
    ...corsHeaders,
    "Content-Type": contentType,
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
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

  const safeMessages = messages.slice(-20).map((m) => ({
    role: m.role,
    content: String(m.content ?? "").slice(0, 4000),
  }));
  const scopeResult = detectScope(safeMessages);

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes?.user) {
    return json({ error: "Authentication issue. Please sign in again." }, 401);
  }

  const weekLimit = scopeResult.scope === "RECENT" ? 16 : 500;
  const [weeksRes, settingsRes, achRes] = await Promise.all([
    supabase.from("weeks")
      .select("id,start_date,end_date,weekly_goal,status,entries")
      .order("start_date", { ascending: false })
      .limit(weekLimit),
    supabase.from("user_settings")
      .select("default_weekly_goal,currency_symbol,active_apps")
      .maybeSingle(),
    supabase.from("user_achievements")
      .select("achievement_id,unlocked_at")
      .order("unlocked_at", { ascending: false })
      .limit(scopeResult.scope === "RECENT" ? 25 : 100),
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
    scope: scopeResult.scope,
    scopeReason: scopeResult.reason,
    weeks,
    settings: settingsRes.data ?? null,
    achievements: achRes.data ?? [],
  });

  const system = [
    "You are 'Ask My Data', an analytics assistant inside Streex — a gig earnings tracker.",
    "Answer ONLY using the JSON context provided. If the answer isn't in the data, say so plainly.",
    "The context has already been scoped to the user's question. Mention the scope briefly only if it helps the answer.",
    "Be concise, friendly, and specific. Prefer short paragraphs and small markdown lists.",
    "Always format currency using the provided symbol. Reference dates in a human way (e.g. 'week of Mar 10').",
    "Never invent numbers. Never reveal raw JSON or internal fields. No SQL.",
  ].join(" ");

  const contextMessage =
    "USER DATA CONTEXT (SUMMARIZED JSON, NOT RAW DATABASE):\n" +
    JSON.stringify(context);

  const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": LOVABLE_API_KEY,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      stream: true,
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

  const contentType = upstream.headers.get("Content-Type") ?? "";
  if (upstream.body && contentType.includes("text/event-stream")) {
    return new Response(upstream.body, {
      status: 200,
      headers: streamHeaders("text/event-stream"),
    });
  }

  const data = await upstream.json();
  const text: string =
    data?.choices?.[0]?.message?.content ??
    "I couldn't generate a response. Please try again.";

  return json({ text });
});
