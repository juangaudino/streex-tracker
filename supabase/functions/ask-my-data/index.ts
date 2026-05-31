// Ask My Data — v5.3B.3 Beta
// Scope-aware edge function: verifies JWT, reads through caller-scoped RLS,
// builds compact analytics context (including weekend/consecutive-window and
// app-vs-app head-to-head facts), and streams Lovable AI Gateway responses.

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
const AI_MODEL = "google/gemini-2.5-flash";
const ESTIMATED_INPUT_USD_PER_1M = 0.30;
const ESTIMATED_OUTPUT_USD_PER_1M = 2.50;

type DataScope = "RECENT" | "ALL_TIME" | "SEASONAL";
type ChatMessage = { role: "user" | "assistant" | "system"; content: string };
type TokenUsage = {
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
};
type SupabaseClient = ReturnType<typeof createClient>;

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

function roundCost(value: number): number {
  return +value.toFixed(8);
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

function detectScope(messages: ChatMessage[], knownApps: string[] = []): { scope: DataScope; reason: string } {
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
    "overall", "my average", "average weekly", "average week", "top", "worst",
    "bottom", "rank", "ranking", "all my",
  ];
  const recentTerms = [
    "recent", "recently", "lately", "current", "this week", "this month",
    "last few", "now",
  ];
  const explicitRecentTimeframe = recentTerms.some((term) => q.includes(term)) ||
    /\b(last|past)\s+\d+\s+(day|days|week|weeks|month|months|year|years)\b/.test(q) ||
    /\b(last|past)\s+(week|month|year|quarter)\b/.test(q) ||
    /\bytd\b|\byear to date\b/.test(q) ||
    /\b\d{4}-\d{2}-\d{2}\b/.test(q);

  if (seasonalTerms.some((term) => q.includes(term))) {
    return { scope: "SEASONAL", reason: "Question asks for long-range or time-period comparison." };
  }
  if (explicitRecentTimeframe) {
    return { scope: "RECENT", reason: "Question explicitly asks for a recent or bounded timeframe." };
  }
  if (allTimeTerms.some((term) => q.includes(term))) {
    return { scope: "ALL_TIME", reason: "Question asks for record, lifetime, or historical analytics." };
  }
  // App-vs-app, weekday combos, and consecutive-day windows all require full history
  // to answer truthfully. Force ALL_TIME so we don't hallucinate over a 16-week slice.
  if (isAppVsAppQuestion(latest, knownApps)) {
    return { scope: "ALL_TIME", reason: "App-vs-app comparison requires full history to be accurate." };
  }
  if (isComboOrWindowQuestion(latest)) {
    return { scope: "ALL_TIME", reason: "Grouped/consecutive-day analysis requires full history." };
  }
  return { scope: "ALL_TIME", reason: "No timeframe was specified, so defaulting to full career history." };
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

// ---------- Grouped / consecutive-day analytics ----------

const DAY_ALIASES: Record<string, string> = {
  mon: "Monday", monday: "Monday",
  tue: "Tuesday", tues: "Tuesday", tuesday: "Tuesday",
  wed: "Wednesday", weds: "Wednesday", wednesday: "Wednesday",
  thu: "Thursday", thur: "Thursday", thurs: "Thursday", thursday: "Thursday",
  fri: "Friday", friday: "Friday",
  sat: "Saturday", saturday: "Saturday",
  sun: "Sunday", sunday: "Sunday",
};

function flattenDays(weeks: NormalizedWeek[]) {
  return weeks
    .flatMap((w) => w.dayTotals.map((d) => ({ date: d.date, day: d.day, total: d.total })))
    .filter((d) => !!d.date)
    .sort((a, b) => a.date.localeCompare(b.date));
}

function parseWeekdayMentions(prompt: string): string[] {
  const q = prompt.toLowerCase();
  const hits: string[] = [];
  const seen = new Set<string>();
  const tokens = q.match(/\b(mon|monday|mondays|tue|tues|tuesday|tuesdays|wed|weds|wednesday|wednesdays|thu|thur|thurs|thursday|thursdays|fri|friday|fridays|sat|saturday|saturdays|sun|sunday|sundays)\b/g) ?? [];
  for (const raw of tokens) {
    const token = raw.endsWith("s") && raw.length > 3 ? raw.slice(0, -1) : raw;
    const full = DAY_ALIASES[token];
    if (full && !seen.has(full)) {
      seen.add(full);
      hits.push(full);
    }
  }
  return hits;
}

function parseRequestedLimit(prompt: string, fallback: number): number {
  const m = prompt.toLowerCase().match(/\b(?:top|bottom|first|last)?\s*(\d{1,3})\b/);
  if (!m) return fallback;
  return Math.min(100, Math.max(1, Number(m[1])));
}

function isWorstDayQuestion(prompt: string): boolean {
  const q = prompt.toLowerCase();
  return /\b(worst|lowest|bottom|least|bad days|low days)\b/.test(q);
}

function isBestDayQuestion(prompt: string): boolean {
  const q = prompt.toLowerCase();
  return /\b(best|highest|top|strongest)\b/.test(q) &&
    (/\b(day|days|earning|earnings)\b/.test(q) || parseWeekdayMentions(prompt).length > 0);
}

function isWeekdayListQuestion(prompt: string): boolean {
  const q = prompt.toLowerCase();
  const weekdays = parseWeekdayMentions(prompt);
  if (weekdays.length !== 1) return false;
  return /\b(all|show|list|see|only|every|each)\b/.test(q);
}

function isDayRankingQuestion(prompt: string): boolean {
  return isWorstDayQuestion(prompt) || isBestDayQuestion(prompt);
}

function weekdayListAnalysis(weeks: NormalizedWeek[], prompt: string) {
  const [weekday] = parseWeekdayMentions(prompt);
  if (!weekday || !isWeekdayListQuestion(prompt)) return null;
  const limit = parseRequestedLimit(prompt, 60);
  const days = flattenDays(weeks)
    .filter((day) => day.day === weekday)
    .sort((a, b) => b.date.localeCompare(a.date));

  return {
    weekday,
    totalMatches: days.length,
    returned: Math.min(days.length, limit),
    limited: days.length > limit,
    days: days.slice(0, limit).map((day) => ({ ...day, total: round(day.total) })),
  };
}

function dayRankingAnalysis(weeks: NormalizedWeek[], prompt: string) {
  if (!isDayRankingQuestion(prompt)) return null;
  const q = prompt.toLowerCase();
  const limit = parseRequestedLimit(prompt, 20);
  const weekdays = parseWeekdayMentions(prompt);
  const includeZeroDays = !/\b(worked|active|earning days|paid days)\b/.test(q);
  const sortAscending = isWorstDayQuestion(prompt);
  const days = flattenDays(weeks)
    .filter((day) => weekdays.length === 0 || weekdays.includes(day.day))
    .filter((day) => includeZeroDays || day.total > 0)
    .sort((a, b) => sortAscending ? a.total - b.total || a.date.localeCompare(b.date) : b.total - a.total || a.date.localeCompare(b.date));

  return {
    kind: sortAscending ? "worst_days" : "best_days",
    sort: sortAscending ? "ascending_total" : "descending_total",
    weekdayFilter: weekdays.length ? weekdays : null,
    includeZeroDays,
    totalCandidates: days.length,
    returned: Math.min(days.length, limit),
    limited: days.length > limit,
    days: days.slice(0, limit).map((day) => ({ ...day, total: round(day.total) })),
  };
}

function daysBetween(a: string, b: string): number {
  const ms = Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z");
  return Math.round(ms / 86400000);
}

// Top consecutive-day windows of size N across history (calendar-consecutive).
function topConsecutiveWindows(weeks: NormalizedWeek[], size: number, topN = 3) {
  const days = flattenDays(weeks);
  const results: { startDate: string; endDate: string; total: number; days: { date: string; day: string; total: number }[] }[] = [];
  for (let i = 0; i + size <= days.length; i++) {
    const window = days.slice(i, i + size);
    if (daysBetween(window[0].date, window[size - 1].date) !== size - 1) continue;
    const total = window.reduce((s, d) => s + d.total, 0);
    if (total <= 0) continue;
    results.push({
      startDate: window[0].date,
      endDate: window[size - 1].date,
      total: round(total),
      days: window.map((d) => ({ date: d.date, day: d.day, total: round(d.total) })),
    });
  }
  results.sort((a, b) => b.total - a.total);
  return results.slice(0, topN);
}

// Top combinations within each calendar week matching a specific weekday set.
function topWeekdayCombos(weeks: NormalizedWeek[], dayNames: string[], topN = 3) {
  const wanted = new Set(dayNames);
  const results: { startDate: string; endDate: string; total: number; days: { date: string; day: string; total: number }[] }[] = [];
  for (const w of weeks) {
    const matched = w.dayTotals.filter((d) => wanted.has(d.day));
    if (matched.length !== dayNames.length) continue;
    const total = matched.reduce((s, d) => s + d.total, 0);
    if (total <= 0) continue;
    matched.sort((a, b) => a.date.localeCompare(b.date));
    results.push({
      startDate: matched[0].date,
      endDate: matched[matched.length - 1].date,
      total: round(total),
      days: matched.map((d) => ({ date: d.date, day: d.day, total: round(d.total) })),
    });
  }
  results.sort((a, b) => b.total - a.total);
  const totals = results.map((r) => r.total);
  const average = totals.length ? round(totals.reduce((s, v) => s + v, 0) / totals.length) : 0;
  return { top: results.slice(0, topN), sampleSize: results.length, average };
}

function parseDayCombo(prompt: string): string[] | null {
  const q = prompt.toLowerCase();
  const hits = parseWeekdayMentions(prompt);
  if (hits.length >= 2) return hits;
  if (/\bweekend\b/.test(q)) return ["Saturday", "Sunday"];
  return null;
}

function parseConsecutiveWindow(prompt: string): number | null {
  const q = prompt.toLowerCase();
  const m = q.match(/\b(\d+)\s*[- ]?\s*day\b/);
  if (m) {
    const n = Number(m[1]);
    if (n >= 2 && n <= 14) return n;
  }
  if (/\bconsecutive\b/.test(q) || /\brolling\b/.test(q) || /\bstreak\b/.test(q)) {
    // Default to 3-day window if no explicit number
    return 3;
  }
  return null;
}

// ---------- App-vs-App head-to-head ----------

function normalizeAppName(raw: string, knownApps: string[]): string | null {
  const q = raw.trim().toLowerCase();
  if (!q) return null;
  for (const app of knownApps) {
    if (app.toLowerCase() === q) return app;
  }
  for (const app of knownApps) {
    if (app.toLowerCase().includes(q) || q.includes(app.toLowerCase())) return app;
  }
  return null;
}

function parseAppPair(prompt: string, knownApps: string[]): [string, string] | null {
  const q = prompt.toLowerCase();
  // Find any two distinct known apps mentioned
  const found: string[] = [];
  for (const app of knownApps) {
    const name = app.toLowerCase();
    const re = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
    if (re.test(q) && !found.includes(app)) found.push(app);
    if (found.length === 2) break;
  }
  if (found.length === 2) return [found[0], found[1]];
  // Try a vs b / a beat b pattern with free tokens
  const m = q.match(/([a-z][a-z0-9 ]{1,20}?)\s+(?:vs\.?|versus|beat|beats|over|against|outearned|outperform(?:ed)?)\s+([a-z][a-z0-9 ]{1,20})/);
  if (m) {
    const a = normalizeAppName(m[1], knownApps);
    const b = normalizeAppName(m[2], knownApps);
    if (a && b && a !== b) return [a, b];
  }
  return null;
}

function appHeadToHead(weeks: NormalizedWeek[], appA: string, appB: string) {
  // Only consider weeks where at least one of the two apps has any earnings.
  const sorted = [...weeks].sort((a, b) => a.startDate.localeCompare(b.startDate));
  let aWins = 0, bWins = 0, ties = 0;
  let lastAWin: { startDate: string; endDate: string; aTotal: number; bTotal: number } | null = null;
  let lastBWin: { startDate: string; endDate: string; aTotal: number; bTotal: number } | null = null;
  let bestA: { startDate: string; total: number } | null = null;
  let bestB: { startDate: string; total: number } | null = null;
  const perWeek: { startDate: string; endDate: string; a: number; b: number; winner: "A" | "B" | "tie" | "none" }[] = [];
  for (const w of sorted) {
    const a = round(w.appTotals[appA] ?? 0);
    const b = round(w.appTotals[appB] ?? 0);
    if (a === 0 && b === 0) {
      perWeek.push({ startDate: w.startDate, endDate: w.endDate, a, b, winner: "none" });
      continue;
    }
    if (!bestA || a > bestA.total) bestA = { startDate: w.startDate, total: a };
    if (!bestB || b > bestB.total) bestB = { startDate: w.startDate, total: b };
    let winner: "A" | "B" | "tie" = "tie";
    if (a > b) { aWins++; winner = "A"; lastAWin = { startDate: w.startDate, endDate: w.endDate, aTotal: a, bTotal: b }; }
    else if (b > a) { bWins++; winner = "B"; lastBWin = { startDate: w.startDate, endDate: w.endDate, aTotal: a, bTotal: b }; }
    else { ties++; }
    perWeek.push({ startDate: w.startDate, endDate: w.endDate, a, b, winner });
  }
  const decided = aWins + bWins + ties;
  // Recent vs all-time trend (last 8 weeks with comparable data)
  const decidedWeeks = perWeek.filter((p) => p.winner !== "none");
  const recent = decidedWeeks.slice(-8);
  const recentA = recent.filter((p) => p.winner === "A").length;
  const recentB = recent.filter((p) => p.winner === "B").length;
  return {
    appA, appB,
    weeksCompared: decided,
    weeksWithoutEitherApp: perWeek.length - decided,
    aWins, bWins, ties,
    bestWeekFor: { [appA]: bestA, [appB]: bestB },
    lastWeekAppABeatAppB: lastAWin,
    lastWeekAppBBeatAppA: lastBWin,
    recentTrend: {
      windowWeeks: recent.length,
      [`${appA}Wins`]: recentA,
      [`${appB}Wins`]: recentB,
    },
    allTimeWinner: aWins > bWins ? appA : bWins > aWins ? appB : "tie",
    // Keep payload compact: cap to 24 most recent compared weeks
    weeklyTimeline: decidedWeeks.slice(-24),
  };
}

// ---------- Intent detection ----------

const HISTORICAL_TERMS = [
  "history", "historical", "historically", "ever", "all time", "all-time",
  "lifetime", "career", "in my history", "of all time", "overall",
];

function isHistoricalQuestion(prompt: string): boolean {
  const q = prompt.toLowerCase();
  return HISTORICAL_TERMS.some((t) => q.includes(t));
}

function isAppVsAppQuestion(prompt: string, knownApps: string[]): boolean {
  const pair = parseAppPair(prompt, knownApps);
  if (!pair) return false;
  const q = prompt.toLowerCase();
  return /\b(vs\.?|versus|beat|beats|beaten|over|against|outearn|outperform|compare|which.*better|stronger|more than)\b/.test(q)
    || /\bwin(s|ner)?\b/.test(q);
}

function isComboOrWindowQuestion(prompt: string): boolean {
  return parseDayCombo(prompt) !== null || parseConsecutiveWindow(prompt) !== null;
}

async function fetchWeeksForScope(supabase: SupabaseClient, scope: DataScope) {
  const selectFields = "id,start_date,end_date,weekly_goal,status,entries";

  if (scope === "RECENT") {
    const result = await supabase.from("weeks")
      .select(selectFields)
      .order("start_date", { ascending: false })
      .limit(16);

    return {
      data: (result.data ?? []) as WeekRow[],
      error: result.error,
      rowsFetched: result.data?.length ?? 0,
      mode: "recent-limit-16",
    };
  }

  const pageSize = 1000;
  const allRows: WeekRow[] = [];
  for (let from = 0; from < 10000; from += pageSize) {
    const to = from + pageSize - 1;
    const result = await supabase.from("weeks")
      .select(selectFields)
      .order("start_date", { ascending: false })
      .range(from, to);

    if (result.error) {
      return {
        data: allRows,
        error: result.error,
        rowsFetched: allRows.length,
        mode: "all-history-paginated",
      };
    }

    const rows = (result.data ?? []) as WeekRow[];
    allRows.push(...rows);
    if (rows.length < pageSize) break;
  }

  return {
    data: allRows,
    error: null,
    rowsFetched: allRows.length,
    mode: "all-history-paginated",
  };
}

function buildContext(args: {
  scope: DataScope;
  scopeReason: string;
  weeks: WeekRow[];
  settings: { default_weekly_goal: number; currency_symbol: string; active_apps: string[] } | null;
  achievements: { achievement_id: string; unlocked_at: string }[];
  prompt?: string;
}) {
  const { scope, scopeReason, settings, achievements, prompt = "" } = args;
  const weeks = args.weeks
    .map(normalizeWeek)
    .sort((a, b) => b.startDate.localeCompare(a.startDate));
  const closed = weeks.filter((w) => w.status === "closed");
  const recent = weeks.slice(0, 16);
  const bestRecentWeek = recent.reduce<NormalizedWeek | null>(
    (best, w) => (!best || w.total > best.total ? w : best),
    null,
  );
  const bestWeekEver = weeks.reduce<NormalizedWeek | null>(
    (best, w) => (!best || w.total > best.total ? w : best),
    null,
  );
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
    coverage: {
      totalWeeksAvailable: weeks.length,
      earliestWeekStart: weeks.length ? weeks[weeks.length - 1].startDate : null,
      latestWeekStart: weeks.length ? weeks[0].startDate : null,
      isFullHistoryLoaded: scope !== "RECENT",
    },
    settings: settings
      ? {
        weeklyGoal: Number(settings.default_weekly_goal),
        activeApps: settings.active_apps,
      }
      : null,
  };

  // Compute on-demand analyses for grouped/consecutive/app-vs-app questions.
  // These run on whatever weeks are loaded; coverage tells the model how much that is.
  const knownApps = Array.from(
    new Set([...(settings?.active_apps ?? []), ...weeks.flatMap((w) => Object.keys(w.appTotals))]),
  );
  const analysis: Record<string, unknown> = {};
  if (prompt) {
    const weekdayList = weekdayListAnalysis(weeks, prompt);
    if (weekdayList) {
      analysis.weekdayList = weekdayList;
    }
    const dayRanking = dayRankingAnalysis(weeks, prompt);
    if (dayRanking) {
      analysis.dayRanking = dayRanking;
    }
    const combo = parseDayCombo(prompt);
    if (combo) {
      analysis.dayCombo = { days: combo, ...topWeekdayCombos(weeks, combo, 3) };
    }
    const windowSize = parseConsecutiveWindow(prompt);
    if (windowSize) {
      analysis.consecutiveWindow = {
        sizeDays: windowSize,
        top: topConsecutiveWindows(weeks, windowSize, 3),
      };
    }
    const pair = parseAppPair(prompt, knownApps);
    if (pair) {
      analysis.appHeadToHead = appHeadToHead(weeks, pair[0], pair[1]);
    }
  }
  const analysisBlock = Object.keys(analysis).length ? { analysis } : {};

  if (scope === "ALL_TIME") {
    const lifetimeTotal = weeks.reduce((sum, w) => sum + w.total, 0);
    return {
      ...base,
      ...analysisBlock,
      lifetime: {
        weeksTracked: weeks.length,
        closedWeeks: closed.length,
        lifetimeTotal: round(lifetimeTotal),
        averageClosedWeek,
        bestWeekEver: bestWeekEver
          ? {
            startDate: bestWeekEver.startDate,
            endDate: bestWeekEver.endDate,
            status: bestWeekEver.status,
            total: bestWeekEver.total,
            daysWorked: bestWeekEver.daysWorked,
            appTotals: bestWeekEver.appTotals,
          }
          : null,
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
      ...analysisBlock,
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
      bestWeekEver: bestWeekEver
        ? { startDate: bestWeekEver.startDate, total: bestWeekEver.total }
        : null,
    };
  }

  return {
    ...base,
    ...analysisBlock,
    recent: {
      weeksTrackedInScope: recent.length,
      averageClosedWeek,
      bestWeekInScope: bestRecentWeek
        ? { startDate: bestRecentWeek.startDate, total: bestRecentWeek.total }
        : null,
      bestClosedWeekInScope: bestClosedWeek
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

function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

function estimateCost(inputTokens: number, outputTokens: number): number {
  const inputCost = (inputTokens / 1_000_000) * ESTIMATED_INPUT_USD_PER_1M;
  const outputCost = (outputTokens / 1_000_000) * ESTIMATED_OUTPUT_USD_PER_1M;
  return roundCost(inputCost + outputCost);
}

function latestUserPrompt(messages: ChatMessage[]): string {
  return [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
}

function readUsage(value: unknown): TokenUsage {
  const usage = value as {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    input_tokens?: number;
    output_tokens?: number;
  } | null;

  const inputTokens = usage?.prompt_tokens ?? usage?.input_tokens ?? null;
  const outputTokens = usage?.completion_tokens ?? usage?.output_tokens ?? null;
  const totalTokens = usage?.total_tokens ??
    (inputTokens !== null && outputTokens !== null ? inputTokens + outputTokens : null);

  return { inputTokens, outputTokens, totalTokens };
}

async function logUsage(args: {
  supabase: ReturnType<typeof createClient>;
  userId: string;
  model?: string;
  scope: DataScope;
  promptPreview: string;
  status: "success" | "error";
  errorType?: string;
  usage?: TokenUsage;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedCostUsd?: number;
  latencyMs: number;
  usedStreaming: boolean;
  metadata?: Record<string, unknown>;
}) {
  const inputTokens = args.usage?.inputTokens ?? null;
  const outputTokens = args.usage?.outputTokens ?? null;
  const totalTokens = args.usage?.totalTokens ?? null;
  const estimatedTotalTokens = args.estimatedInputTokens + args.estimatedOutputTokens;
  const costInput = inputTokens ?? args.estimatedInputTokens;
  const costOutput = outputTokens ?? args.estimatedOutputTokens;

  const { error } = await args.supabase.from("ai_usage_logs").insert({
    user_id: args.userId,
    model: args.model ?? AI_MODEL,
    scope: args.scope,
    prompt_preview: args.promptPreview.slice(0, 300),
    status: args.status,
    error_type: args.errorType ?? null,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    total_tokens: totalTokens,
    estimated_input_tokens: args.estimatedInputTokens,
    estimated_output_tokens: args.estimatedOutputTokens,
    estimated_total_tokens: estimatedTotalTokens,
    estimated_cost_usd: args.estimatedCostUsd ?? estimateCost(costInput, costOutput),
    latency_ms: args.latencyMs,
    used_streaming: args.usedStreaming,
    metadata: args.metadata ?? {},
  });

  if (error) {
    console.error("AI usage log failed", error);
  }
}

function isBestWeekQuestion(prompt: string): boolean {
  const q = prompt.toLowerCase();
  return /\b(best|highest|biggest|top|record)\b/.test(q) &&
    /\bweek\b/.test(q) &&
    !/\bapp\b/.test(q);
}

function directBestWeekAnswer(context: unknown, currency: string): string | null {
  const c = context as {
    lifetime?: {
      bestWeekEver?: {
        startDate: string;
        endDate?: string;
        total: number;
        status?: string;
      } | null;
    };
  };
  const best = c.lifetime?.bestWeekEver;
  if (!best) return null;

  const amount = formatCurrencyForAssistant(best.total, currency);
  const range = best.endDate ? `${best.startDate} to ${best.endDate}` : best.startDate;
  const statusNote = best.status && best.status !== "closed" ? ` It is currently marked as ${best.status}.` : "";
  return `Your best week ever was ${range}, when you earned ${amount}.${statusNote}`;
}

function formatDateForAssistant(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function directDayAnalysisAnswer(context: unknown, currency: string): string | null {
  const c = context as {
    scope?: DataScope;
    coverage?: { isFullHistoryLoaded?: boolean };
    analysis?: {
      weekdayList?: {
        weekday: string;
        totalMatches: number;
        returned: number;
        limited: boolean;
        days: { date: string; day: string; total: number }[];
      };
      dayRanking?: {
        kind: "worst_days" | "best_days";
        weekdayFilter: string[] | null;
        includeZeroDays: boolean;
        totalCandidates: number;
        returned: number;
        limited: boolean;
        days: { date: string; day: string; total: number }[];
      };
    };
  };
  const scopeText = c.coverage?.isFullHistoryLoaded
    ? "across your full Streex history"
    : c.scope === "RECENT"
    ? "within the requested recent scope"
    : "within the loaded scope";

  const weekdayList = c.analysis?.weekdayList;
  if (weekdayList) {
    if (!weekdayList.days.length) return `I don't see any ${weekdayList.weekday}s in your tracked history yet.`;
    const lines = weekdayList.days.map((day) =>
      `- ${formatCurrencyForAssistant(day.total, currency)} on ${formatDateForAssistant(day.date)}`
    );
    const cap = weekdayList.limited
      ? ` Showing the most recent ${weekdayList.returned} to keep the answer readable.`
      : "";
    return `Here are your ${weekdayList.totalMatches} tracked ${weekdayList.weekday}s ${scopeText}:${cap}\n\n${lines.join("\n")}`;
  }

  const ranking = c.analysis?.dayRanking;
  if (ranking) {
    if (!ranking.days.length) return "I don't see matching tracked days for that ranking yet.";
    const label = ranking.kind === "worst_days" ? "lowest earning days" : "highest earning days";
    const filter = ranking.weekdayFilter?.length ? ` for ${ranking.weekdayFilter.join(", ")}` : "";
    const zeroNote = ranking.kind === "worst_days" && ranking.includeZeroDays
      ? " Zero-dollar tracked days are included."
      : "";
    const lines = ranking.days.map((day, index) =>
      `${index + 1}. ${formatCurrencyForAssistant(day.total, currency)} on ${formatDateForAssistant(day.date)}`
    );
    const cap = ranking.limited
      ? ` Showing ${ranking.returned} of ${ranking.totalCandidates} matching days.`
      : "";
    return `Here are your ${ranking.returned} ${label}${filter} ${scopeText}.${zeroNote}${cap}\n\n${lines.join("\n")}`;
  }

  return null;
}

function formatCurrencyForAssistant(value: number, currency: string): string {
  const raw = (currency || "$").trim().toUpperCase();
  const code = ["USD", "EUR", "GBP", "CAD", "MXN", "COP", "ARS"].includes(raw)
    ? raw
    : currency === "€"
    ? "EUR"
    : currency === "£"
    ? "GBP"
    : "USD";

  if (code === "COP" || code === "ARS") {
    return `${code} ${value.toLocaleString(code === "COP" ? "es-CO" : "es-AR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  }

  return new Intl.NumberFormat(
    code === "EUR" ? "de-DE" : code === "GBP" ? "en-GB" : code === "CAD" ? "en-CA" : code === "MXN" ? "es-MX" : "en-US",
    {
      style: "currency",
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  ).format(value);
}

function streamWithUsageLogging(args: {
  body: ReadableStream<Uint8Array>;
  supabase: ReturnType<typeof createClient>;
  userId: string;
  scope: DataScope;
  promptPreview: string;
  estimatedInputTokens: number;
  startedAt: number;
  metadata: Record<string, unknown>;
}) {
  const reader = args.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let outputText = "";
  let usage: TokenUsage | undefined;

  function inspectText(text: string) {
    buffer += text;
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";

    for (const event of events) {
      for (const line of event.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const parsed = JSON.parse(payload);
          const delta = parsed?.choices?.[0]?.delta?.content ??
            parsed?.choices?.[0]?.message?.content ??
            parsed?.text ??
            "";
          if (typeof delta === "string") outputText += delta;
          if (parsed?.usage) usage = readUsage(parsed.usage);
        } catch {
          // Ignore malformed stream frames; the client still receives them unchanged.
        }
      }
    }
  }

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        if (buffer.trim()) inspectText("\n\n");
        const estimatedOutputTokens = estimateTokens(outputText || " ");
        await logUsage({
          supabase: args.supabase,
          userId: args.userId,
          scope: args.scope,
          promptPreview: args.promptPreview,
          status: "success",
          usage,
          estimatedInputTokens: args.estimatedInputTokens,
          estimatedOutputTokens,
          latencyMs: Date.now() - args.startedAt,
          usedStreaming: true,
          metadata: {
            ...args.metadata,
            hasActualTokenUsage: Boolean(usage?.totalTokens),
          },
        });
        controller.close();
        return;
      }

      inspectText(decoder.decode(value, { stream: true }));
      controller.enqueue(value);
    },
    async cancel(reason) {
      await reader.cancel(reason);
      await logUsage({
        supabase: args.supabase,
        userId: args.userId,
        scope: args.scope,
        promptPreview: args.promptPreview,
        status: "error",
        errorType: "client_cancelled",
        estimatedInputTokens: args.estimatedInputTokens,
        estimatedOutputTokens: estimateTokens(outputText || " "),
        latencyMs: Date.now() - args.startedAt,
        usedStreaming: true,
        metadata: args.metadata,
      });
    },
  });
}

Deno.serve(async (req) => {
  const startedAt = Date.now();
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
  const promptPreview = latestUserPrompt(safeMessages);

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes?.user) {
    return json({ error: "Authentication issue. Please sign in again." }, 401);
  }
  const userId = userRes.user.id;

  // Settings first so we know the user's app list for app-vs-app detection.
  const settingsRes = await supabase.from("user_settings")
    .select("default_weekly_goal,currency_symbol,active_apps")
    .maybeSingle();
  const knownApps = Array.isArray(settingsRes.data?.active_apps)
    ? (settingsRes.data!.active_apps as string[])
    : [];
  const scopeResult = detectScope(safeMessages, knownApps);

  const [weeksRes, achRes] = await Promise.all([
    fetchWeeksForScope(supabase, scopeResult.scope),
    supabase.from("user_achievements")
      .select("achievement_id,unlocked_at")
      .order("unlocked_at", { ascending: false })
      .limit(scopeResult.scope === "RECENT" ? 25 : 100),
  ]);

  if (weeksRes.error) {
    await logUsage({
      supabase,
      userId,
      scope: scopeResult.scope,
      promptPreview,
      status: "error",
      errorType: "data_load",
      estimatedInputTokens: estimateTokens(promptPreview || " "),
      estimatedOutputTokens: 0,
      latencyMs: Date.now() - startedAt,
      usedStreaming: false,
      metadata: {
        fetchMode: weeksRes.mode,
        rowsFetched: weeksRes.rowsFetched,
      },
    });
    return json({ error: "Could not load your data." }, 500);
  }

  const weeks = weeksRes.data;
  if (!weeks.length) {
    await logUsage({
      supabase,
      userId,
      scope: scopeResult.scope,
      promptPreview,
      status: "error",
      errorType: "no_data",
      estimatedInputTokens: estimateTokens(promptPreview || " "),
      estimatedOutputTokens: 0,
      latencyMs: Date.now() - startedAt,
      usedStreaming: false,
      metadata: {
        fetchMode: weeksRes.mode,
        rowsFetched: weeksRes.rowsFetched,
      },
    });
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
    prompt: promptPreview,
  });
  const metadata = {
    fetchMode: weeksRes.mode,
    weeksFetched: weeks.length,
    rowsFetched: weeksRes.rowsFetched,
    achievementsFetched: achRes.data?.length ?? 0,
    hasSettings: Boolean(settingsRes.data),
    costEstimateBasis: "Gemini Flash token estimate; Lovable credits may differ.",
    estimatedInputUsdPer1M: ESTIMATED_INPUT_USD_PER_1M,
    estimatedOutputUsdPer1M: ESTIMATED_OUTPUT_USD_PER_1M,
  };

  if (isBestWeekQuestion(promptPreview)) {
    const text = directBestWeekAnswer(context, settingsRes.data?.currency_symbol ?? "$");
    if (text) {
      await logUsage({
        supabase,
        userId,
        model: "deterministic",
        scope: "ALL_TIME",
        promptPreview,
        status: "success",
        estimatedInputTokens: estimateTokens(promptPreview || " "),
        estimatedOutputTokens: estimateTokens(text),
        estimatedCostUsd: 0,
        latencyMs: Date.now() - startedAt,
        usedStreaming: false,
        metadata: {
          ...metadata,
          directAnswer: "best_week_ever",
        },
      });
      return json({ text });
    }
  }

  {
    const text = directDayAnalysisAnswer(context, settingsRes.data?.currency_symbol ?? "$");
    if (text) {
      await logUsage({
        supabase,
        userId,
        model: "deterministic",
        scope: scopeResult.scope,
        promptPreview,
        status: "success",
        estimatedInputTokens: estimateTokens(promptPreview || " "),
        estimatedOutputTokens: estimateTokens(text),
        estimatedCostUsd: 0,
        latencyMs: Date.now() - startedAt,
        usedStreaming: false,
        metadata: {
          ...metadata,
          directAnswer: "day_list_or_ranking",
        },
      });
      return json({ text });
    }
  }

  const system = [
    "You are 'Ask My Data', an analytics assistant inside Streex — a gig earnings tracker.",
    "Answer ONLY using the JSON context provided. If the required fact is not in the data, say so plainly.",
    "HONESTY RULES (highest priority):",
    "1. Never use the words 'historically', 'all time', 'ever', 'in your full history', 'lifetime', or 'in your career' unless context.coverage.isFullHistoryLoaded is true.",
    "2. If context.coverage.isFullHistoryLoaded is false and the user asked an all-time / historical / ever question, reply: 'I don't have enough historical data loaded to answer that accurately yet.' Then offer what you can answer from the recent window.",
    "3. For app-vs-app questions, ONLY use context.analysis.appHeadToHead. If that block is missing, say you don't have enough data to compare those apps. Do NOT infer winners from appTotals alone, and do NOT claim one app 'never' beat another unless aWins / bWins explicitly show 0 over weeksCompared ≥ 1.",
    "4. For grouped-day questions (e.g. Fri+Sat+Sun, weekends), ONLY use context.analysis.dayCombo. For consecutive/rolling N-day windows, ONLY use context.analysis.consecutiveWindow. If those blocks are missing, say the calculation isn't available for that question.",
    "5. For best/highest/record week questions, use lifetime.bestWeekEver when present, never a recent-only value.",
    "6. For single-weekday lists and best/worst day rankings, ONLY use context.analysis.weekdayList or context.analysis.dayRanking. Worst/lowest days are derivable from tracked day totals; do not claim the system cannot track them when dayRanking is present.",
    "7. If context.scope is ALL_TIME, treat the answer as full Streex history. Do not mention a hidden 16-week or 112-day limit unless context.coverage.isFullHistoryLoaded is false.",
    "8. Never invent numbers, dates, or apps. Never reveal raw JSON or internal field names. No SQL.",
    "Style: concise, friendly, specific. Short paragraphs and small markdown lists. Format currency according to the provided currency code/symbol. Reference dates in a human way (e.g. 'week of Mar 10').",
  ].join(" ");

  const contextMessage =
    "USER DATA CONTEXT (SUMMARIZED JSON, NOT RAW DATABASE):\n" +
    JSON.stringify(context);
  const estimatedInputTokens = estimateTokens([
    system,
    contextMessage,
    ...safeMessages.map((m) => `${m.role}: ${m.content}`),
  ].join("\n"));
  const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": LOVABLE_API_KEY,
    },
    body: JSON.stringify({
      model: AI_MODEL,
      stream: true,
      stream_options: { include_usage: true },
      messages: [
        { role: "system", content: system },
        { role: "system", content: contextMessage },
        ...safeMessages,
      ],
    }),
  });

  if (upstream.status === 429) {
    await logUsage({
      supabase,
      userId,
      scope: scopeResult.scope,
      promptPreview,
      status: "error",
      errorType: "rate_limit",
      estimatedInputTokens,
      estimatedOutputTokens: 0,
      latencyMs: Date.now() - startedAt,
      usedStreaming: false,
      metadata,
    });
    return json(
      { error: "Rate limit reached. Please wait a moment and try again." },
      429,
    );
  }
  if (upstream.status === 402) {
    await logUsage({
      supabase,
      userId,
      scope: scopeResult.scope,
      promptPreview,
      status: "error",
      errorType: "credits",
      estimatedInputTokens,
      estimatedOutputTokens: 0,
      latencyMs: Date.now() - startedAt,
      usedStreaming: false,
      metadata,
    });
    return json(
      { error: "AI credits exhausted for this workspace. Add credits in Settings → Workspace → Usage." },
      402,
    );
  }
  if (!upstream.ok) {
    const errText = await upstream.text().catch(() => "");
    console.error("Lovable AI error", upstream.status, errText);
    await logUsage({
      supabase,
      userId,
      scope: scopeResult.scope,
      promptPreview,
      status: "error",
      errorType: "gateway",
      estimatedInputTokens,
      estimatedOutputTokens: 0,
      latencyMs: Date.now() - startedAt,
      usedStreaming: false,
      metadata: { ...metadata, upstreamStatus: upstream.status },
    });
    return json({ error: "The assistant is temporarily unavailable." }, 502);
  }

  const contentType = upstream.headers.get("Content-Type") ?? "";
  if (upstream.body && contentType.includes("text/event-stream")) {
    return new Response(streamWithUsageLogging({
      body: upstream.body,
      supabase,
      userId,
      scope: scopeResult.scope,
      promptPreview,
      estimatedInputTokens,
      startedAt,
      metadata,
    }), {
      status: 200,
      headers: streamHeaders("text/event-stream"),
    });
  }

  const data = await upstream.json();
  const text: string =
    data?.choices?.[0]?.message?.content ??
    "I couldn't generate a response. Please try again.";
  const usage = data?.usage ? readUsage(data.usage) : undefined;
  await logUsage({
    supabase,
    userId,
    scope: scopeResult.scope,
    promptPreview,
    status: "success",
    usage,
    estimatedInputTokens,
    estimatedOutputTokens: estimateTokens(text),
    latencyMs: Date.now() - startedAt,
    usedStreaming: false,
    metadata: {
      ...metadata,
      hasActualTokenUsage: Boolean(usage?.totalTokens),
    },
  });

  return json({ text });
});
