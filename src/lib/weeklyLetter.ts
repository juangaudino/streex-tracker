import type { WeekRecord, DayEntry } from "./types";
import { weekTotal, dayTotal, appTotal, formatCurrency, getPreviousWeek } from "./store";

export interface WeeklyLetter {
  weekId: string;
  weekRange: string;
  title: string;
  /** 1–3 short reflective paragraphs (each 1–3 sentences). */
  paragraphs: string[];
  /** Calm one-line closer. */
  closing: string;
  /** Compact, screenshot-worthy headline value. */
  highlight?: { label: string; value: string };
}

function activeDays(w: WeekRecord): DayEntry[] {
  return w.entries.filter((d) => dayTotal(d) > 0);
}

function bestDay(w: WeekRecord): { dayName: string; total: number; date: string } {
  let best = { dayName: "—", total: 0, date: "" };
  for (const d of w.entries) {
    const t = dayTotal(d);
    if (t > best.total) best = { dayName: d.dayName, total: t, date: d.date };
  }
  return best;
}

function longestStreakWithin(w: WeekRecord): number {
  let best = 0, cur = 0;
  for (const d of w.entries) {
    if (dayTotal(d) > 0) { cur++; if (cur > best) best = cur; } else { cur = 0; }
  }
  return best;
}

function strongestApp(w: WeekRecord): { app: string; total: number } | null {
  const apps = Object.keys(w.entries[0]?.apps || {});
  let best: { app: string; total: number } | null = null;
  for (const a of apps) {
    const t = appTotal(w, a);
    if (!best || t > best.total) best = { app: a, total: t };
  }
  return best && best.total > 0 ? best : null;
}

/**
 * Generate a calm, reflective Weekly Letter from real data signals.
 * Tone: observational, premium, emotionally aware. No hype. No emoji.
 */
export function generateWeeklyLetter(
  week: WeekRecord,
  history: WeekRecord[],
  sym = "$",
): WeeklyLetter {
  const wt = weekTotal(week);
  const goal = week.weeklyGoal;
  const goalPct = goal > 0 ? (wt / goal) * 100 : 0;
  const adays = activeDays(week);
  const activeCount = adays.length;
  const best = bestDay(week);
  const longest = longestStreakWithin(week);
  const sApp = strongestApp(week);

  // Compare with previous week
  const prev = getPreviousWeek(history, week);
  const prevTotal = prev ? weekTotal(prev) : 0;
  const deltaPct = prevTotal > 0 ? ((wt - prevTotal) / prevTotal) * 100 : null;

  // Detect rhythm shift: which half carried the week
  const firstHalf = week.entries.slice(0, 4).reduce((s, d) => s + dayTotal(d), 0);
  const secondHalf = week.entries.slice(4).reduce((s, d) => s + dayTotal(d), 0);
  const lateRecovery = wt > 0 && secondHalf > firstHalf * 1.3 && firstHalf > 0;
  const earlyLed = wt > 0 && firstHalf > secondHalf * 1.3;

  // All-time records inside this week
  const closedHistory = history.filter((w) => w.id !== week.id);
  const allTimeBestDay = closedHistory
    .flatMap((w) => w.entries.map((d) => dayTotal(d)))
    .reduce((m, v) => Math.max(m, v), 0);
  const newDailyRecord = best.total > 0 && best.total >= allTimeBestDay && best.total > 0 && closedHistory.length > 0;

  const allTimeBestWeek = closedHistory
    .map((w) => weekTotal(w))
    .reduce((m, v) => Math.max(m, v), 0);
  const newWeeklyRecord = wt > 0 && wt >= allTimeBestWeek && closedHistory.length > 0;

  // Strong day count (>= 70% of best day this week)
  const strongDayCount = best.total > 0
    ? adays.filter((d) => dayTotal(d) >= best.total * 0.7).length
    : 0;

  // ── Title ─────────────────────────────────────────────
  let title = "A quiet chapter.";
  if (newWeeklyRecord && wt > 0) title = "Your strongest week yet.";
  else if (newDailyRecord) title = "A record-setting week.";
  else if (goalPct >= 120) title = "A week that ran ahead.";
  else if (goalPct >= 100) title = "Goal met. Chapter closed.";
  else if (lateRecovery) title = "A week that turned around.";
  else if (deltaPct !== null && deltaPct >= 25) title = "Momentum returned.";
  else if (deltaPct !== null && deltaPct <= -25) title = "A reset week.";
  else if (activeCount >= 6) title = "Consistency carried this one.";
  else if (activeCount === 0) title = "A week of pause.";
  else title = "Another week on the record.";

  // ── Paragraphs ────────────────────────────────────────
  const paragraphs: string[] = [];

  // Opening — set the rhythm narrative
  if (activeCount === 0) {
    paragraphs.push("This week stayed still. No earnings, no pressure — sometimes the calendar just clears itself.");
  } else if (lateRecovery) {
    paragraphs.push(`The week opened slowly, but ${best.dayName} reminded you what momentum feels like. Three days carried more weight than the four before them.`);
  } else if (earlyLed) {
    paragraphs.push(`You set the tone early. The first half of the week did most of the lifting, and the rest held steady.`);
  } else if (longest >= 5) {
    paragraphs.push(`A ${longest}-day rhythm gave the week its shape. Consistency, not intensity, did the work.`);
  } else if (activeCount <= 2 && wt > 0) {
    paragraphs.push(`A short week — only ${activeCount} active day${activeCount === 1 ? "" : "s"} — but the focus was clear when you showed up.`);
  } else {
    paragraphs.push(`You worked ${activeCount} day${activeCount === 1 ? "" : "s"} this week. The pace was honest, the rhythm steady.`);
  }

  // Middle — best day or record context
  if (newWeeklyRecord && wt > 0 && closedHistory.length > 0) {
    paragraphs.push(`This was the biggest week on your record — ${formatCurrency(wt, sym)} in seven days. The ceiling moved up.`);
  } else if (newDailyRecord && best.total > 0) {
    paragraphs.push(`${best.dayName} broke a personal best at ${formatCurrency(best.total, sym)}. Days like that quietly redefine what a strong day looks like.`);
  } else if (best.total > 0 && strongDayCount >= 3) {
    paragraphs.push(`Three strong days stacked back-to-back-to-back. That kind of rhythm tends to carry into the next week.`);
  } else if (best.total > 0) {
    paragraphs.push(`${best.dayName} was the anchor at ${formatCurrency(best.total, sym)}. Every week needs one day that holds the line.`);
  }

  // Closing paragraph — goal / growth context
  if (goal > 0 && goalPct >= 120) {
    paragraphs.push(`You finished ${Math.round(goalPct)}% of your goal — surplus stacked, not just met.`);
  } else if (goal > 0 && goalPct >= 100) {
    paragraphs.push(`Goal reached. Not loud, not dramatic — just done.`);
  } else if (goal > 0 && goalPct >= 80) {
    paragraphs.push(`You finished within reach of your goal. Close enough to feel it next week.`);
  } else if (deltaPct !== null && deltaPct >= 25) {
    paragraphs.push(`Up ${Math.round(deltaPct)}% from last week. The line is bending the right way.`);
  } else if (deltaPct !== null && deltaPct <= -20 && wt > 0) {
    paragraphs.push(`Lighter than last week, but not a setback. Recovery weeks protect the longer streak.`);
  } else if (sApp && wt > 0) {
    paragraphs.push(`${sApp.app} carried the most weight at ${formatCurrency(sApp.total, sym)}.`);
  }

  // ── Closing line ──────────────────────────────────────
  let closing = "Another chapter closed. The next one begins on its own time.";
  if (newWeeklyRecord && wt > 0) closing = "A new ceiling. Carry it forward.";
  else if (goalPct >= 100) closing = "Goal met. Rest counts too.";
  else if (lateRecovery) closing = "Endings shape the story more than beginnings.";
  else if (activeCount === 0) closing = "Pause is part of the rhythm.";
  else if (deltaPct !== null && deltaPct >= 25) closing = "Momentum is yours to keep.";
  else if (deltaPct !== null && deltaPct <= -20) closing = "Recovery is part of the climb.";
  else if (longest >= 5) closing = "Consistency compounds quietly.";

  const highlight = wt > 0
    ? { label: "Week Earned", value: formatCurrency(wt, sym) }
    : undefined;

  return {
    weekId: week.id,
    weekRange: `${week.startDate} → ${week.endDate}`,
    title,
    paragraphs,
    closing,
    highlight,
  };
}
