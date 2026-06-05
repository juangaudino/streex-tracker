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

// Metadata-only debug logging. Toggle via env AMD_DEBUG=1. NEVER logs prompts,
// messages, AI responses, weeks, earnings, emails, tokens, or user IDs.
const AMD_DEBUG = Deno.env.get("AMD_DEBUG") === "1";
export function amdDebug(event: string, data: Record<string, unknown> = {}) {
  if (!AMD_DEBUG) return;
  try {
    console.info(`[amd] ${event}`, JSON.stringify(data));
  } catch {
    // ignore serialization errors
  }
}

type DataScope = "RECENT" | "ALL_TIME" | "SEASONAL";
type ChatMessage = { role: "user" | "assistant" | "system"; content: string };
type AskIntent =
  | "DAY"
  | "WEEK"
  | "MONTH"
  | "STREAK"
  | "HOUR"
  | "PACE"
  | "GOAL"
  | "RANKING"
  | "RIVAL"
  | "INSIGHT"
  | "PATTERN"
  | "COACHING"
  | "UNSUPPORTED"
  | "GENERAL";
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
  shifts?: {
    id: string;
    startTime: string;
    endTime?: string;
    miles?: number;
    rideCount?: number;
  }[];
  mileage?: number;
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
  shiftStats: ShiftStats;
  appTotals: Record<string, number>;
  dayTotals: { day: string; date: string; total: number; hours: number; rides: number; miles: number; completedShifts: number; activeShifts: number }[];
}

interface ShiftStats {
  totalHours: number;
  completedShifts: number;
  activeShifts: number;
  totalRides: number;
  totalMiles: number;
  earningsPerHour: number | null;
  earningsPerRide: number | null;
  ridesPerHour: number | null;
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

function shiftDurationHours(shift: NonNullable<DayEntry["shifts"]>[number]): number {
  if (!shift.endTime) return 0;
  const start = Date.parse(shift.startTime);
  const end = Date.parse(shift.endTime);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return (end - start) / 3600000;
}

function dayShiftStats(day: DayEntry) {
  const shifts = day.shifts ?? [];
  const totalHours = shifts.reduce((sum, shift) => sum + shiftDurationHours(shift), 0);
  const totalRides = shifts.reduce((sum, shift) => sum + Math.max(0, Math.trunc(Number(shift.rideCount) || 0)), 0);
  const shiftMiles = shifts.reduce((sum, shift) => sum + (Number(shift.miles) || 0), 0);
  return {
    hours: round(totalHours),
    rides: totalRides,
    miles: round(shiftMiles || Number(day.mileage) || 0),
    completedShifts: shifts.filter((shift) => Boolean(shift.endTime)).length,
    activeShifts: shifts.filter((shift) => !shift.endTime).length,
  };
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
    ...dayShiftStats(d),
  }));
  const shiftStatsBase = dayTotals.reduce((acc, day) => ({
    totalHours: acc.totalHours + day.hours,
    completedShifts: acc.completedShifts + day.completedShifts,
    activeShifts: acc.activeShifts + day.activeShifts,
    totalRides: acc.totalRides + day.rides,
    totalMiles: acc.totalMiles + day.miles,
  }), { totalHours: 0, completedShifts: 0, activeShifts: 0, totalRides: 0, totalMiles: 0 });
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
    shiftStats: {
      ...shiftStatsBase,
      totalHours: round(shiftStatsBase.totalHours),
      totalMiles: round(shiftStatsBase.totalMiles),
      earningsPerHour: shiftStatsBase.totalHours > 0 ? round(total / shiftStatsBase.totalHours) : null,
      earningsPerRide: shiftStatsBase.totalRides > 0 ? round(total / shiftStatsBase.totalRides) : null,
      ridesPerHour: shiftStatsBase.totalHours > 0 && shiftStatsBase.totalRides > 0 ? round(shiftStatsBase.totalRides / shiftStatsBase.totalHours) : null,
    },
    appTotals: Object.fromEntries(
      Object.entries(appTotals).map(([k, v]) => [k, round(v)]),
    ),
    dayTotals,
  };
}

export function detectScope(messages: ChatMessage[], knownApps: string[] = []): { scope: DataScope; reason: string } {
  const latest = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const q = latest.toLowerCase();
  const intent = detectIntent(latest, knownApps);

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

  if (intent === "MONTH" || seasonalTerms.some((term) => q.includes(term))) {
    return { scope: "SEASONAL", reason: "Question asks for long-range or time-period comparison." };
  }
  if (explicitRecentTimeframe) {
    return { scope: "RECENT", reason: "Question explicitly asks for a recent or bounded timeframe." };
  }
  if (intent === "STREAK" || intent === "RANKING" || intent === "INSIGHT" || intent === "PATTERN" || intent === "COACHING" ||
    allTimeTerms.some((term) => q.includes(term))) {
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

function rollupDaysByMonth(weeks: NormalizedWeek[]) {
  const map = new Map<string, { total: number; daysTracked: number; activeDays: number }>();
  for (const w of weeks) {
    for (const day of w.dayTotals) {
      const key = monthKey(day.date);
      const cur = map.get(key) || { total: 0, daysTracked: 0, activeDays: 0 };
      cur.total += day.total;
      cur.daysTracked += 1;
      if (day.total > 0) cur.activeDays += 1;
      map.set(key, cur);
    }
  }
  return [...map.entries()]
    .map(([period, v]) => ({
      period,
      total: round(v.total),
      daysTracked: v.daysTracked,
      activeDays: v.activeDays,
      averageActiveDay: v.activeDays ? round(v.total / v.activeDays) : 0,
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

const WEEKDAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

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
  const intent = detectIntent(prompt);
  if (intent === "HOUR" || intent === "STREAK" || intent === "MONTH") return false;
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
  const singularBestDay = /\b(best|highest|top|strongest)\b/.test(q) && /\bday\b/.test(q) && !/\bdays\b/.test(q);
  const limit = parseRequestedLimit(prompt, singularBestDay ? 1 : 20);
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

export function restPairMode(prompt: string): "take_off" | "protect" | null {
  const q = prompt.toLowerCase();
  const asksForRest =
    /\b(day off|days off|off day|off days|rest|break|take off)\b/.test(q) ||
    /\b(descansar|descanso|libre|libres|dia libre|día libre|dias libres|días libres)\b/.test(q);
  const asksForTwo =
    /\b(two|2|dos)\b/.test(q) || /\bpair|pareja\b/.test(q);
  const asksForConsecutive =
    /\b(consecutive|back-to-back|together|in a row|seguidos|seguidas|consecutivos|consecutivas)\b/.test(q);
  const asksWhatToProtect =
    /\b(should not|shouldn't|dont rest|don't rest|not rest|avoid resting|no descansar|no deberia|no debería|no deberia descansar|no debería descansar)\b/.test(q);
  if (asksForRest && asksForTwo && asksWhatToProtect) return "protect";
  if (asksForRest && asksForTwo && asksForConsecutive) return "take_off";
  return null;
}

function isConsecutiveDayOffQuestion(prompt: string): boolean {
  return restPairMode(prompt) !== null;
}

// Real-life consecutive weekday pairs. Includes Sunday→Monday so
// recommendations reflect calendar reality even when the pair crosses the
// Streex Monday–Sunday week boundary.
const CONSECUTIVE_WEEKDAY_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ["Monday", "Tuesday"],
  ["Tuesday", "Wednesday"],
  ["Wednesday", "Thursday"],
  ["Thursday", "Friday"],
  ["Friday", "Saturday"],
  ["Saturday", "Sunday"],
  ["Sunday", "Monday"],
];
const SAMPLE_SIZE_FLOOR = 4;

export function consecutiveDayOffAnalysis(weeks: NormalizedWeek[], prompt: string) {
  const mode = restPairMode(prompt);
  if (!mode) return null;
  const stats = weekdayStats(weeks) as Record<string, { average: number; count: number; best: number; bestDate: string | null }>;
  const weekdayAverages = WEEKDAY_ORDER
    .map((day) => ({ day, average: stats[day]?.average ?? null, count: stats[day]?.count ?? 0 }))
    .filter((item) => item.average !== null);
  const rawPairs = CONSECUTIVE_WEEKDAY_PAIRS.map(([day, nextDay], naturalOrder) => {
    const first = stats[day];
    const second = stats[nextDay];
    if (!first || !second) return null;
    const minimumSampleSize = Math.min(first.count, second.count);
    return {
      days: [day, nextDay] as [string, string],
      combinedAverage: round(first.average + second.average),
      averages: [
        { day, average: first.average, count: first.count },
        { day: nextDay, average: second.average, count: second.count },
      ],
      minimumSampleSize,
      crossesWeekBoundary: day === "Sunday" && nextDay === "Monday",
      lowSample: minimumSampleSize < SAMPLE_SIZE_FLOOR,
      naturalOrder,
    };
  }).filter((pair): pair is NonNullable<typeof pair> => Boolean(pair));

  // Default presentation order: ascending combined average (lowest-impact first).
  // Deterministic tie-breaks: larger minimum sample size first, then natural
  // weekday-pair order (Mon→Tue ... Sun→Mon).
  const pairs = [...rawPairs].sort((a, b) =>
    a.combinedAverage - b.combinedAverage
    || b.minimumSampleSize - a.minimumSampleSize
    || a.naturalOrder - b.naturalOrder
  );

  let recommendation: (typeof pairs)[number] | null = null;
  if (pairs.length) {
    if (mode === "protect") {
      // Highest combined average; same tie-breakers.
      recommendation = [...rawPairs].sort((a, b) =>
        b.combinedAverage - a.combinedAverage
        || b.minimumSampleSize - a.minimumSampleSize
        || a.naturalOrder - b.naturalOrder
      )[0] ?? null;
    } else {
      recommendation = pairs[0] ?? null;
    }
  }

  const lowSampleSize = recommendation ? recommendation.minimumSampleSize < SAMPLE_SIZE_FLOOR : false;

  return {
    method: "weekday_average_consecutive_pairs_lowest_combined_impact",
    mode,
    weekdayAverages,
    pairs,
    recommendation,
    sampleSizeFloor: SAMPLE_SIZE_FLOOR,
    lowSampleSize,
    sampleSizeCaveat: lowSampleSize
      ? `Recommendation based on fewer than ${SAMPLE_SIZE_FLOOR} historical samples for one of the weekdays; treat as directional.`
      : null,
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

function monthRankingAnalysis(weeks: NormalizedWeek[]) {
  const months = rollupDaysByMonth(weeks).sort((a, b) => b.total - a.total || a.period.localeCompare(b.period));
  const chronological = [...months].sort((a, b) => a.period.localeCompare(b.period));
  return {
    strongest: months[0] ?? null,
    weakest: [...months].reverse().find((m) => m.total > 0) ?? null,
    monthsCompared: months.length,
    chronological,
    top: months.slice(0, 5),
  };
}

function highestEarningStreakAnalysis(weeks: NormalizedWeek[]) {
  const days = flattenDays(weeks);
  const streaks: { startDate: string; endDate: string; days: number; total: number; averageDay: number }[] = [];
  let current: { startDate: string; endDate: string; days: number; total: number } | null = null;

  for (const day of days) {
    if (day.total <= 0) {
      if (current) {
        streaks.push({ ...current, total: round(current.total), averageDay: round(current.total / current.days) });
        current = null;
      }
      continue;
    }

    if (!current || daysBetween(current.endDate, day.date) !== 1) {
      if (current) {
        streaks.push({ ...current, total: round(current.total), averageDay: round(current.total / current.days) });
      }
      current = { startDate: day.date, endDate: day.date, days: 1, total: day.total };
      continue;
    }

    current.endDate = day.date;
    current.days += 1;
    current.total += day.total;
  }

  if (current) {
    streaks.push({ ...current, total: round(current.total), averageDay: round(current.total / current.days) });
  }

  return {
    highestByTotal: [...streaks].sort((a, b) => b.total - a.total || b.days - a.days)[0] ?? null,
    longest: [...streaks].sort((a, b) => b.days - a.days || b.total - a.total)[0] ?? null,
    topByTotal: [...streaks].sort((a, b) => b.total - a.total || b.days - a.days).slice(0, 5),
    streaksCompared: streaks.length,
  };
}

function weekendTrendAnalysis(weeks: NormalizedWeek[]) {
  const sorted = [...weeks].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const rows = sorted.map((week) => {
    const saturday = week.dayTotals.find((day) => day.day === "Saturday")?.total ?? 0;
    const sunday = week.dayTotals.find((day) => day.day === "Sunday")?.total ?? 0;
    return { startDate: week.startDate, endDate: week.endDate, total: round(saturday + sunday), saturday, sunday };
  }).filter((row) => row.total > 0);

  const recent = rows.slice(-4);
  const prior = rows.slice(-8, -4);
  const recentAverage = recent.length ? round(recent.reduce((sum, row) => sum + row.total, 0) / recent.length) : 0;
  const priorAverage = prior.length ? round(prior.reduce((sum, row) => sum + row.total, 0) / prior.length) : 0;
  return {
    recentWeeks: recent.length,
    priorWeeks: prior.length,
    recentAverage,
    priorAverage,
    change: round(recentAverage - priorAverage),
    direction: recentAverage > priorAverage ? "stronger" : recentAverage < priorAverage ? "weaker" : "flat",
    bestWeekend: rows.sort((a, b) => b.total - a.total)[0] ?? null,
  };
}

function currentWeekSnapshot(weeks: NormalizedWeek[]) {
  const latest = [...weeks].sort((a, b) => b.startDate.localeCompare(a.startDate))[0];
  if (!latest) return null;
  const todayIso = new Date().toISOString().slice(0, 10);
  const exactToday = latest.dayTotals.find((day) => day.date === todayIso);
  const latestPositive = [...latest.dayTotals].reverse().find((day) => day.total > 0);
  const focusDay = exactToday ?? latestPositive ?? latest.dayTotals[0] ?? null;
  const weekTotal = latest.total;
  const goalLeft = Math.max(0, latest.goal - weekTotal);
  const remainingDays = focusDay
    ? latest.dayTotals.filter((day) => day.date >= focusDay.date).length
    : latest.dayTotals.length;
  const allDays = flattenDays(weeks).filter((day) => day.total > 0).sort((a, b) => b.total - a.total);
  const todayRank = focusDay && focusDay.total > 0
    ? allDays.findIndex((day) => day.date === focusDay.date) + 1
    : 0;
  const bestSameWeekday = focusDay
    ? allDays.filter((day) => day.day === focusDay.day).sort((a, b) => b.total - a.total)[0] ?? null
    : null;
  const bestDayEver = allDays[0] ?? null;

  return {
    week: {
      startDate: latest.startDate,
      endDate: latest.endDate,
      status: latest.status,
      goal: latest.goal,
      total: latest.total,
      daysWorked: latest.daysWorked,
      shiftStats: latest.shiftStats,
    },
    focusDay,
    goalLeft: round(goalLeft),
    remainingDays,
    neededPerRemainingDay: remainingDays > 0 ? round(goalLeft / remainingDays) : 0,
    todayRank: todayRank > 0 ? { rank: todayRank, outOf: allDays.length } : null,
    recordChase: focusDay
      ? {
        bestDayEver,
        bestSameWeekday,
        gapToBestDayEver: bestDayEver ? round(bestDayEver.total - focusDay.total) : null,
        gapToBestSameWeekday: bestSameWeekday ? round(bestSameWeekday.total - focusDay.total) : null,
      }
      : null,
  };
}

function aggregateShiftStats(weeks: NormalizedWeek[]): ShiftStats {
  const totals = weeks.reduce((acc, week) => ({
    totalHours: acc.totalHours + week.shiftStats.totalHours,
    completedShifts: acc.completedShifts + week.shiftStats.completedShifts,
    activeShifts: acc.activeShifts + week.shiftStats.activeShifts,
    totalRides: acc.totalRides + week.shiftStats.totalRides,
    totalMiles: acc.totalMiles + week.shiftStats.totalMiles,
    totalEarnings: acc.totalEarnings + week.total,
  }), { totalHours: 0, completedShifts: 0, activeShifts: 0, totalRides: 0, totalMiles: 0, totalEarnings: 0 });
  return {
    totalHours: round(totals.totalHours),
    completedShifts: totals.completedShifts,
    activeShifts: totals.activeShifts,
    totalRides: totals.totalRides,
    totalMiles: round(totals.totalMiles),
    earningsPerHour: totals.totalHours > 0 ? round(totals.totalEarnings / totals.totalHours) : null,
    earningsPerRide: totals.totalRides > 0 ? round(totals.totalEarnings / totals.totalRides) : null,
    ridesPerHour: totals.totalHours > 0 && totals.totalRides > 0 ? round(totals.totalRides / totals.totalHours) : null,
  };
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
  if (/\bconsecutive\b/.test(q) || /\brolling\b/.test(q) || /\bstreak\b/.test(q) ||
    /\bseguidos|seguidas|consecutivos|consecutivas\b/.test(q)) {
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

export function detectIntent(prompt: string, knownApps: string[] = []): AskIntent {
  const q = prompt.toLowerCase();
  if (/\b(ride count|rides|trips|per ride|rides per hour)\b/.test(q)) return "HOUR";
  if (/\b(hour|hours|hourly|earning hour|best hour)\b/.test(q)) return "HOUR";
  if (/\b(streak|streaks|racha|racha de ganancias)\b/.test(q)) return "STREAK";
  if (/\b(month|months|monthly|mes|meses)\b/.test(q)) return "MONTH";
  if (/\b(goal|target|meta|hit my goal|need per day|per day to hit|rest of the week|restante|por día|por dia)\b/.test(q)) return "GOAL";
  if (/\b(today rank|rank today|where does today rank|closest record|record.*closest|closest.*record|ranking.*today)\b/.test(q)) return "RANKING";
  if (/\b(rival|past me|version of me|toughest rival|mi rival|yo del pasado)\b/.test(q)) return "RIVAL";
  if (/\b(surprising|surprise|unusual|weird|interesting|opportunity|story|tell me something|most unusual|biggest opportunity)\b/.test(q)) return "INSIGHT";
  if (/\b(pattern|trend|changed the most|pay attention|getting stronger|getting weaker|improving|improvement|growth|weaker|stronger)\b/.test(q)) return "PATTERN";
  if (/\b(coach|coaching|focus on|mistake|decision|schedule|healthiest|ideal work|work schedule)\b/.test(q)) return "COACHING";
  if (isAppVsAppQuestion(prompt, knownApps)) return "RANKING";
  if (/\b(week|weekly)\b/.test(q)) return "WEEK";
  if (/\b(day|days|weekday|weekdays|today|saturday|sunday|monday|tuesday|wednesday|thursday|friday)\b/.test(q)) return "DAY";
  return "GENERAL";
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
  const intent = detectIntent(prompt, knownApps);
  const analysis: Record<string, unknown> = {};
  if (prompt) {
    analysis.intent = intent;
    const weekdayList = weekdayListAnalysis(weeks, prompt);
    if (weekdayList) {
      analysis.weekdayList = weekdayList;
    }
    const dayRanking = dayRankingAnalysis(weeks, prompt);
    if (dayRanking) {
      analysis.dayRanking = dayRanking;
    }
    const consecutiveDayOff = consecutiveDayOffAnalysis(weeks, prompt);
    if (consecutiveDayOff) {
      analysis.consecutiveDayOff = consecutiveDayOff;
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
    if (intent === "MONTH") {
      analysis.monthRanking = monthRankingAnalysis(weeks);
    }
    if (intent === "STREAK") {
      analysis.earningStreak = highestEarningStreakAnalysis(weeks);
    }
    if (intent === "GOAL" || intent === "RANKING" || intent === "HOUR") {
      analysis.currentWeek = currentWeekSnapshot(weeks);
    }
    if ((intent === "PATTERN" || intent === "INSIGHT" || intent === "COACHING") && /\bweekend|weekends|saturday|sunday|sábado|sabado|domingo\b/i.test(prompt)) {
      analysis.weekendTrend = weekendTrendAnalysis(weeks);
    }
  }
  const analysisBlock = Object.keys(analysis).length ? { analysis } : {};

  if (scope === "ALL_TIME") {
    const lifetimeTotal = weeks.reduce((sum, w) => sum + w.total, 0);
    const lifetimeShiftStats = aggregateShiftStats(weeks);
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
        operations: lifetimeShiftStats,
        bestWeekByHours: [...weeks].sort((a, b) => b.shiftStats.totalHours - a.shiftStats.totalHours)[0] ?? null,
        bestWeekByEfficiency: [...weeks]
          .filter((w) => w.shiftStats.earningsPerHour !== null)
          .sort((a, b) => (b.shiftStats.earningsPerHour ?? 0) - (a.shiftStats.earningsPerHour ?? 0))[0] ?? null,
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
      operations: aggregateShiftStats(weeks),
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
        shiftStats: w.shiftStats,
        dayTotals: w.dayTotals,
        appTotals: w.appTotals,
      })),
      operations: aggregateShiftStats(recent),
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

function directIntentAnswer(context: unknown, currency: string, prompt: string): string | null {
  const c = context as {
    lifetime?: {
      averageClosedWeek?: number;
      appTotals?: Record<string, number>;
      weekdayStats?: Record<string, { average: number; count: number; best: number; bestDate: string | null }>;
      evolution?: { from: string; to: string; weeks: number; averageWeek: number }[];
      operations?: ShiftStats;
      bestWeekByHours?: NormalizedWeek | null;
      bestWeekByEfficiency?: NormalizedWeek | null;
    };
    recent?: {
      operations?: ShiftStats;
    };
    analysis?: {
      intent?: AskIntent;
      monthRanking?: ReturnType<typeof monthRankingAnalysis>;
      earningStreak?: ReturnType<typeof highestEarningStreakAnalysis>;
      currentWeek?: ReturnType<typeof currentWeekSnapshot>;
      weekendTrend?: ReturnType<typeof weekendTrendAnalysis>;
    };
  };
  const intent = c.analysis?.intent ?? detectIntent(prompt);
  const q = prompt.toLowerCase();
  const spanish = usesSpanish(prompt);

  if (intent === "HOUR") {
    const current = c.analysis?.currentWeek;
    const asksBestEarningHour = /\b(best|strongest|highest|top).*(earning )?hour\b|\b(best|strongest|highest|top) hour\b/.test(q);
    if (!asksBestEarningHour) {
      if (/\b(this week|current week|week)\b/.test(q) && current?.week.shiftStats) {
        const stats = current.week.shiftStats;
        return [
          `This week you've logged **${stats.totalHours.toFixed(1)}h** across ${stats.completedShifts} completed shift${stats.completedShifts === 1 ? "" : "s"}.`,
          stats.earningsPerHour !== null ? `Weekly efficiency: ${formatCurrencyForAssistant(stats.earningsPerHour, currency)}/hr.` : "I need completed shift duration before calculating weekly $/hr.",
          stats.totalRides > 0 ? `Rides tracked: ${stats.totalRides}.` : "Ride count is optional, so it only appears when you enter it.",
        ].join("\n");
      }
      if (/\b(lifetime|career|all time|all-time|history|historical|average per hour)\b/.test(q) && c.lifetime?.operations) {
        const stats = c.lifetime.operations;
        return [
          `Your lifetime tracked shift time is **${stats.totalHours.toFixed(1)}h** across ${stats.completedShifts} completed shift${stats.completedShifts === 1 ? "" : "s"}.`,
          stats.earningsPerHour !== null ? `Lifetime average: ${formatCurrencyForAssistant(stats.earningsPerHour, currency)}/hr.` : "I need completed shift duration before calculating lifetime $/hr.",
          stats.totalRides > 0 ? `Lifetime rides tracked: ${stats.totalRides}.` : "Ride count is optional and only appears where you have entered it.",
        ].join("\n");
      }
      const bestEfficiencyWeek = c.lifetime?.bestWeekByEfficiency;
      if (
        /\b(best hourly week|best.*hourly|best.*efficiency|highest.*per hour)\b/.test(q) &&
        bestEfficiencyWeek?.shiftStats.earningsPerHour !== null &&
        bestEfficiencyWeek?.shiftStats.earningsPerHour !== undefined
      ) {
        const week = bestEfficiencyWeek;
        return `Your best efficiency week was ${week.startDate} to ${week.endDate}: ${formatCurrencyForAssistant(week.shiftStats.earningsPerHour!, currency)}/hr across ${week.shiftStats.totalHours.toFixed(1)}h.`;
      }
    }
    return spanish
      ? "Todavía no puedo calcular tu mejor hora real de ganancias porque Streex no guarda cada ride con timestamp. Sí puedo analizar horas trabajadas, shifts, rides capturados y $/hr cuando los turnos están registrados."
      : "I can't calculate your real best earning hour yet because Streex does not store each ride with a timestamp. I can analyze worked hours, tracked shifts, ride counts, and $/hr when shifts are logged.";
  }

  if (intent === "RIVAL") {
    return spanish
      ? "Todavía no tengo una capa determinística para comparar versiones de ti como rivales. Puedo comparar periodos concretos, por ejemplo: 'compárame contra mis últimas 4 semanas' o 'compárame contra mi mejor periodo'."
      : "I don't have a deterministic rival/version-of-you comparison layer yet. I can compare specific periods, for example: 'compare me against my last 4 weeks' or 'compare me against my best period'.";
  }

  if (intent === "MONTH") {
    const ranking = c.analysis?.monthRanking;
    if (!ranking?.strongest) return null;
    if (/\b(strongest|best|highest|most|mejor|más fuerte|mas fuerte)\b/.test(q)) {
      const topLines = ranking.top
        .map((month, index) => `${index + 1}. ${month.period}: ${formatCurrencyForAssistant(month.total, currency)}`)
        .join("\n");
      return `Your strongest month was **${ranking.strongest.period}** with ${formatCurrencyForAssistant(ranking.strongest.total, currency)}.\n\nTop months:\n${topLines}`;
    }
  }

  if (intent === "STREAK") {
    const streak = c.analysis?.earningStreak?.highestByTotal;
    if (!streak) {
      return "I don't see enough consecutive active days yet to calculate an earning streak.";
    }
    return [
      `Your highest earning streak was **${streak.days} consecutive active days**, from ${formatDateForAssistant(streak.startDate)} to ${formatDateForAssistant(streak.endDate)}.`,
      "",
      `Total: ${formatCurrencyForAssistant(streak.total, currency)}`,
      `Average per active day: ${formatCurrencyForAssistant(streak.averageDay, currency)}`,
      "",
      "I’m treating an earning streak as consecutive days with tracked earnings, then ranking those streaks by total earnings.",
    ].join("\n");
  }

  if (intent === "GOAL") {
    const current = c.analysis?.currentWeek;
    if (!current) return null;
    const left = formatCurrencyForAssistant(current.goalLeft, currency);
    const needed = formatCurrencyForAssistant(current.neededPerRemainingDay, currency);
    const dayLabel = current.focusDay ? `${current.focusDay.day}, ${current.focusDay.date}` : "the current tracked day";
    return [
      `Your current week total is ${formatCurrencyForAssistant(current.week.total, currency)} against a ${formatCurrencyForAssistant(current.week.goal, currency)} goal.`,
      "",
      `You have ${left} left.`,
      `From ${dayLabel} through the end of the tracked week, that is about **${needed} per day** across ${current.remainingDays} day${current.remainingDays === 1 ? "" : "s"}.`,
    ].join("\n");
  }

  if (intent === "RANKING") {
    const current = c.analysis?.currentWeek;
    if (!current?.focusDay) return null;
    if (/\btoday rank|rank today|where does today rank|ranking.*today\b/.test(q)) {
      if (!current.todayRank) return "Today does not have tracked earnings yet, so I cannot rank it against your earning days.";
      return `${current.focusDay.day}, ${current.focusDay.date} is currently ranked **#${current.todayRank.rank} of ${current.todayRank.outOf}** earning days in your Streex history, with ${formatCurrencyForAssistant(current.focusDay.total, currency)}.`;
    }
    if (/\bclosest record|record.*closest|closest.*record\b/.test(q) && current.recordChase) {
      const same = current.recordChase.bestSameWeekday;
      const best = current.recordChase.bestDayEver;
      const sameGap = current.recordChase.gapToBestSameWeekday;
      const bestGap = current.recordChase.gapToBestDayEver;
      const options = [
        same && sameGap !== null && sameGap >= 0 ? `same-weekday record (${same.day}): ${formatCurrencyForAssistant(sameGap, currency)} away from ${formatCurrencyForAssistant(same.total, currency)}` : null,
        best && bestGap !== null && bestGap >= 0 ? `all-time daily record: ${formatCurrencyForAssistant(bestGap, currency)} away from ${formatCurrencyForAssistant(best.total, currency)}` : null,
      ].filter(Boolean);
      if (!options.length) return null;
      return `The closest visible record from today’s tracked total is:\n\n- ${options.join("\n- ")}`;
    }
  }

  if (c.analysis?.weekendTrend && /\bweekend|weekends|saturday|sunday|sábado|sabado|domingo\b/i.test(prompt)) {
    const trend = c.analysis.weekendTrend;
    return [
      `Your combined Saturday + Sunday trend is **${trend.direction}** right now.`,
      "",
      `Recent weekend average: ${formatCurrencyForAssistant(trend.recentAverage, currency)}`,
      `Prior weekend average: ${formatCurrencyForAssistant(trend.priorAverage, currency)}`,
      `Change: ${formatCurrencyForAssistant(trend.change, currency)}`,
      trend.bestWeekend ? `Best weekend: ${trend.bestWeekend.startDate} to ${trend.bestWeekend.endDate}, ${formatCurrencyForAssistant(trend.bestWeekend.total, currency)}` : "",
    ].filter(Boolean).join("\n");
  }

  if (intent === "INSIGHT" || intent === "PATTERN" || intent === "COACHING") {
    const evolution = c.lifetime?.evolution ?? [];
    const weekdayStats = c.lifetime?.weekdayStats ?? {};
    const appTotals = c.lifetime?.appTotals ?? {};
    const strongestDay = Object.entries(weekdayStats)
      .sort(([, a], [, b]) => b.average - a.average)[0];
    const weakestDay = Object.entries(weekdayStats)
      .sort(([, a], [, b]) => a.average - b.average)[0];
    const topApp = Object.entries(appTotals).sort(([, a], [, b]) => b - a)[0];
    const latestBucket = evolution[evolution.length - 1];
    const peakBucket = [...evolution].sort((a, b) => b.averageWeek - a.averageWeek)[0];
    if (!strongestDay && !topApp && !peakBucket) return null;

    if (intent === "COACHING") {
      return [
        "Insight:",
        peakBucket && latestBucket
          ? `Your best period averaged ${formatCurrencyForAssistant(peakBucket.averageWeek, currency)} per week, while your latest period averages ${formatCurrencyForAssistant(latestBucket.averageWeek, currency)}.`
          : `Your historical average week is ${formatCurrencyForAssistant(c.lifetime?.averageClosedWeek ?? 0, currency)}.`,
        "",
        "Evidence:",
        strongestDay ? `${strongestDay[0]} is your strongest weekday at ${formatCurrencyForAssistant(strongestDay[1].average, currency)} on average.` : "Your weekday mix is the clearest signal available.",
        "",
        "Opportunity:",
        strongestDay && weakestDay
          ? `Protect ${strongestDay[0]} and be more selective with ${weakestDay[0]}. That is the cleanest schedule lever in your data.`
          : "Focus on recreating the conditions from your peak earning period.",
      ].join("\n");
    }

    return [
      "Insight:",
      strongestDay && weakestDay
        ? `${strongestDay[0]} earns ${formatCurrencyForAssistant(strongestDay[1].average - weakestDay[1].average, currency)} more than ${weakestDay[0]} on an average active day.`
        : topApp
        ? `${topApp[0]} is your largest app contributor.`
        : `Your peak period averaged ${formatCurrencyForAssistant(peakBucket.averageWeek, currency)} per week.`,
      "",
      "Evidence:",
      strongestDay && weakestDay
        ? `${strongestDay[0]} averages ${formatCurrencyForAssistant(strongestDay[1].average, currency)}; ${weakestDay[0]} averages ${formatCurrencyForAssistant(weakestDay[1].average, currency)}.`
        : peakBucket
        ? `${peakBucket.from} to ${peakBucket.to} was your strongest period.`
        : "This comes from your full Streex history.",
      "",
      "Opportunity:",
      strongestDay
        ? `Build around ${strongestDay[0]} first, then use weaker days more intentionally for recovery or lighter work.`
        : "Look for what made your strongest period different and try to repeat that pattern.",
    ].join("\n");
  }

  return null;
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

function usesSpanish(prompt: string): boolean {
  return /[áéíóúñ¿¡]/i.test(prompt) ||
    /\b(si|quiero|descansar|dias|días|semana|cuáles|cuales|deberían|deberian|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo|lunes)\b/i.test(prompt);
}

function localizedDay(day: string, spanish: boolean): string {
  if (!spanish) return day;
  const labels: Record<string, string> = {
    Monday: "lunes",
    Tuesday: "martes",
    Wednesday: "miércoles",
    Thursday: "jueves",
    Friday: "viernes",
    Saturday: "sábado",
    Sunday: "domingo",
  };
  return labels[day] ?? day;
}

export function directDayAnalysisAnswer(context: unknown, currency: string, prompt = ""): string | null {
  const c = context as {
    scope?: DataScope;
    coverage?: { isFullHistoryLoaded?: boolean };
    analysis?: {
      consecutiveDayOff?: {
        mode?: "take_off" | "protect";
        pairs: {
          days: string[];
          combinedAverage: number;
          averages: { day: string; average: number; count: number }[];
          minimumSampleSize: number;
        }[];
        recommendation: {
          days: string[];
          combinedAverage: number;
          averages: { day: string; average: number; count: number }[];
          minimumSampleSize: number;
        } | null;
        lowSampleSize?: boolean;
        sampleSizeFloor?: number;
      };
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

  const consecutiveDayOff = c.analysis?.consecutiveDayOff;
  if (consecutiveDayOff) {
    const best = consecutiveDayOff.recommendation;
    if (!best) {
      return usesSpanish(prompt)
        ? "Todavía no tengo suficientes promedios por día para recomendar dos días consecutivos con confianza."
        : "I don't have enough weekday averages yet to recommend two consecutive days off confidently.";
    }

    const spanish = usesSpanish(prompt);
    const protectMode = consecutiveDayOff.mode === "protect";
    const pairLines = consecutiveDayOff.pairs.map((pair) => {
      const label = pair.days.map((day) => localizedDay(day, spanish)).join(spanish ? " + " : " + ");
      return `- ${label}: ${formatCurrencyForAssistant(pair.combinedAverage, currency)}`;
    });
    const bestDays = best.days.map((day) => localizedDay(day, spanish));
    const first = best.averages[0];
    const second = best.averages[1];
    const weaker = first.average <= second.average ? first : second;
    const other = first.average <= second.average ? second : first;
    const sampleSizeNote = consecutiveDayOff.lowSampleSize
      ? spanish
        ? `Nota: esta recomendación es direccional porque uno de los días tiene menos de ${consecutiveDayOff.sampleSizeFloor ?? SAMPLE_SIZE_FLOOR} muestras históricas.`
        : `Note: this recommendation is directional because one weekday has fewer than ${consecutiveDayOff.sampleSizeFloor ?? SAMPLE_SIZE_FLOOR} historical samples.`
      : null;
    if (spanish) {
      if (protectMode) {
        return [
          `Si tu objetivo es proteger tus mejores ventanas, los dos días consecutivos que **menos conviene descansar** son **${bestDays[0]} + ${bestDays[1]}**.`,
          "",
          `Esa pareja suma ${formatCurrencyForAssistant(best.combinedAverage, currency)} de promedio combinado (${localizedDay(first.day, true)} ${formatCurrencyForAssistant(first.average, currency)} + ${localizedDay(second.day, true)} ${formatCurrencyForAssistant(second.average, currency)}).`,
          "",
          "Comparé todas las parejas consecutivas válidas:",
          ...pairLines,
          "",
          "Es la combinación con mayor impacto potencial en tus ganancias si la tomaras libre.",
          ...(sampleSizeNote ? ["", sampleSizeNote] : []),
        ].join("\n");
      }

      return [
        `Para dos días seguidos de descanso, la mejor combinación por menor impacto promedio es **${bestDays[0]} + ${bestDays[1]}**.`,
        "",
        `Esa pareja suma ${formatCurrencyForAssistant(best.combinedAverage, currency)} de promedio combinado (${localizedDay(first.day, true)} ${formatCurrencyForAssistant(first.average, currency)} + ${localizedDay(second.day, true)} ${formatCurrencyForAssistant(second.average, currency)}).`,
        "",
        "Comparé todas las parejas consecutivas válidas:",
        ...pairLines,
        "",
        `${localizedDay(weaker.day, true)} es el día individual más débil dentro de esta pareja, y aunque ${localizedDay(other.day, true)} no necesariamente sea tu segundo día más débil, juntos producen el menor impacto combinado.`,
        ...(sampleSizeNote ? ["", sampleSizeNote] : []),
      ].join("\n");
    }

    if (protectMode) {
      return [
        `If your goal is to protect your strongest windows, the two consecutive days you should **avoid taking off** are **${bestDays[0]} + ${bestDays[1]}**.`,
        "",
        `That pair combines for ${formatCurrencyForAssistant(best.combinedAverage, currency)} on average (${first.day} ${formatCurrencyForAssistant(first.average, currency)} + ${second.day} ${formatCurrencyForAssistant(second.average, currency)}).`,
        "",
        "I compared every valid consecutive pair:",
        ...pairLines,
        "",
        "It is the highest combined-impact pair in your history.",
        ...(sampleSizeNote ? ["", sampleSizeNote] : []),
      ].join("\n");
    }

    return [
      `For two consecutive days off, the lowest average earnings impact is **${bestDays[0]} + ${bestDays[1]}**.`,
      "",
      `That pair combines for ${formatCurrencyForAssistant(best.combinedAverage, currency)} on average (${first.day} ${formatCurrencyForAssistant(first.average, currency)} + ${second.day} ${formatCurrencyForAssistant(second.average, currency)}).`,
      "",
      "I compared every valid consecutive pair:",
      ...pairLines,
      "",
      `${weaker.day} is the weaker individual day in this pair, and while ${other.day} may not be your second weakest day, the combination produces the lowest combined impact.`,
      ...(sampleSizeNote ? ["", sampleSizeNote] : []),
    ].join("\n");
  }

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
  amdDebug("scope", { scope: scopeResult.scope, reason: scopeResult.reason });

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
  if (AMD_DEBUG) {
    const intent = detectIntent(promptPreview, knownApps);
    const restMode = restPairMode(promptPreview);
    amdDebug("intent", { intent, restPairMode: restMode });
    if (restMode) {
      const rest = consecutiveDayOffAnalysis(
        weeks.map(normalizeWeek).sort((a, b) => b.startDate.localeCompare(a.startDate)),
        promptPreview,
      );
      if (rest) {
        amdDebug("rest_pair", {
          mode: rest.mode,
          pairCount: rest.pairs.length,
          recommended: rest.recommendation?.days ?? null,
          minSampleSize: rest.recommendation?.minimumSampleSize ?? null,
          lowSampleSize: rest.lowSampleSize,
        });
      }
    }
  }
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
    const text = directIntentAnswer(context, settingsRes.data?.currency_symbol ?? "$", promptPreview);
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
          directAnswer: "intent_router",
          intent: detectIntent(promptPreview, knownApps),
        },
      });
      return json({ text });
    }
  }

  {
    const text = directDayAnalysisAnswer(context, settingsRes.data?.currency_symbol ?? "$", promptPreview);
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
          directAnswer: "day_analysis",
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
    "4. For grouped-day questions (e.g. Fri+Sat+Sun, weekends), ONLY use context.analysis.dayCombo. For consecutive/rolling N-day windows, ONLY use context.analysis.consecutiveWindow. For two consecutive days off / rest questions, ONLY use context.analysis.consecutiveDayOff and compare combined weekday-pair averages, not individual weekday rankings. If those blocks are missing, say the calculation isn't available for that question.",
    "5. For best/highest/record week questions, use lifetime.bestWeekEver when present, never a recent-only value.",
    "6. For single-weekday lists and best/worst day rankings, ONLY use context.analysis.weekdayList or context.analysis.dayRanking. Worst/lowest days are derivable from tracked day totals; do not claim the system cannot track them when dayRanking is present.",
    "7. Use context.analysis.intent as the routing hint. Do not answer HOUR questions with day rankings, STREAK questions with top days, or MONTH questions with weekly records.",
    "8. If a capability is not supported by the context (hourly earnings, trip locations, ride types, health/biometrics), say that cleanly and offer the closest supported Streex analysis.",
    "9. If context.scope is ALL_TIME, treat the answer as full Streex history. Do not mention a hidden 16-week or 112-day limit unless context.coverage.isFullHistoryLoaded is false.",
    "10. Never invent numbers, dates, or apps. Never reveal raw JSON or internal field names. No SQL.",
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
    // Drain body to free the connection but do NOT log it — upstream errors can
    // echo the user prompt or other content. Log only metadata.
    const errText = await upstream.text().catch(() => "");
    console.error("Lovable AI error", { status: upstream.status, bodyLength: errText.length });
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
