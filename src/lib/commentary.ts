import { WeekRecord, DayEntry } from "@/lib/types";
import { weekTotal, dayTotal, formatCurrency, getLoggedDays } from "@/lib/store";
import { getDayOfWeekRecord } from "@/components/ActiveMomentum";

export type MomentumState = "low" | "medium" | "high";

export interface MomentumInfo {
  state: MomentumState;
  label: string;
}

// ─────────────────────────────────────────────────────────────────
// UNIFIED DASHBOARD MOOD ENGINE
// One source of truth — headline, pace chip, commentary, and
// momentum label all derive from the same `tone`.
// ─────────────────────────────────────────────────────────────────

export type DashboardTone =
  | "closed"
  | "prerun"
  | "recovery"
  | "steady"
  | "strong"
  | "elite"
  | "record";

export interface PaceChip {
  text: string;
  variant: "fire" | "primary" | "goal" | "streak";
}

export interface DashboardMood {
  tone: DashboardTone;
  headline: string;
  paceChip: PaceChip | null;
  momentumLabel: string;
  momentumState: MomentumState;
  commentary: string | null;
}

function pickRotating<T>(arr: T[], seed: number): T {
  const idx = Math.abs(Math.floor(seed)) % arr.length;
  return arr[idx];
}

export function getDashboardMood(
  weeks: WeekRecord[],
  openWeek: WeekRecord | null,
  todayEntry: DayEntry | null,
  dayRecord: { record: number; avg: number; count: number },
  sym: string,
): DashboardMood {
  // Empty / no week
  if (!openWeek || !todayEntry) {
    return {
      tone: "prerun",
      headline: "Ready to Earn",
      paceChip: null,
      momentumLabel: "Ready to Start",
      momentumState: "low",
      commentary: null,
    };
  }

  const todayT = dayTotal(todayEntry);
  const wt = weekTotal(openWeek);
  const goal = openWeek.weeklyGoal;
  const weekPct = goal > 0 ? (wt / goal) * 100 : 0;
  const dayName = todayEntry.dayName;
  const loggedDays = getLoggedDays(openWeek);
  const activeDays = openWeek.entries.filter((d) => dayTotal(d) > 0);
  const dayPct = dayRecord.record > 0 ? (todayT / dayRecord.record) * 100 : 0;
  const seed = Math.floor(todayT * 7 + wt * 3 + (todayEntry.date ? todayEntry.date.length : 0));
  const hour = new Date().getHours();
  const isEarlyDay = hour < 12;

  // Closed day state takes priority
  if (todayEntry.dayClosed) {
    const lines = [
      `${dayName} closed. Reset and return stronger.`,
      `Day finalized — tomorrow is another rep.`,
      `${dayName} in the books. Recovery mode.`,
    ];
    return {
      tone: "closed",
      headline: `${dayName} Closed`,
      paceChip: null,
      momentumLabel: "Day Complete",
      momentumState: "medium",
      commentary: pickRotating(lines, seed),
    };
  }

  // Determine tone
  // ── Grace period — never emit "recovery" / "rebuilding" too early.
  // Recovery only allowed when ALL of:
  //   - today already has meaningful earnings (todayT > 0)
  //   - at least 2 prior logged days OR week is at least 25% to goal
  //   - it's no longer early in the day (hour >= 14) — mornings always feel hopeful
  const enoughForHarsh =
    todayT > 0 &&
    (loggedDays.length >= 2 || (goal > 0 && weekPct >= 25)) &&
    hour >= 14;

  let tone: DashboardTone;
  if (todayT === 0) {
    tone = "prerun";
  } else if (dayRecord.record > 0 && todayT > dayRecord.record) {
    tone = "record";
  } else if (dayPct >= 95 || (weekPct >= 100 && loggedDays.length <= 5) || weekPct >= 120) {
    tone = "elite";
  } else if (dayPct >= 80 || weekPct >= 80 || (dayRecord.avg > 0 && todayT > dayRecord.avg * 1.2)) {
    tone = "strong";
  } else if (
    weekPct >= 50 ||
    (dayRecord.avg > 0 && todayT >= dayRecord.avg * 0.9) ||
    (dayRecord.avg === 0 && todayT > 0)
  ) {
    tone = "steady";
  } else if (enoughForHarsh && dayRecord.avg > 0 && todayT < dayRecord.avg * 0.7) {
    tone = "recovery";
  } else {
    // Not enough data to judge — default to steady/startup energy
    tone = todayT === 0 ? "prerun" : "steady";
  }

  // Headlines per tone
  let headline: string;
  switch (tone) {
    case "prerun": {
      const opts = isEarlyDay
        ? ["Fresh Start", "Opening Pace", "Day Starting", "Rolling In", "Warming Up"]
        : ["Ready To Roll", "New Chapter", "Time To Build", "Let's Start Strong", "Find Your Rhythm"];
      headline = pickRotating(opts, seed);
      break;
    }
    case "record":
      headline = `New ${dayName} Record 🏆`;
      break;
    case "elite":
      if (dayPct >= 95 && dayRecord.record > 0) headline = "Record Imminent 🔥";
      else if (weekPct >= 120) headline = "Monster Session 🔥";
      else headline = "Elite Push";
      break;
    case "strong": {
      if (dayPct >= 80 && dayRecord.record > 0) headline = `Big ${dayName} Energy`;
      else if (weekPct >= 90) headline = "Record Pace ⚡";
      else if (weekPct >= 75) headline = "Goal Hunt";
      else headline = "Locked In";
      break;
    }
    case "steady":
      if (dayRecord.avg > 0 && todayT > dayRecord.avg) headline = `Strong ${dayName}`;
      else if (weekPct >= 50) headline = "Steady Climb";
      else if (weekPct >= 30) headline = "Pace Picking Up";
      else headline = "Building Momentum";
      break;
    case "recovery": {
      const opts = ["Finding Rhythm", "Steady Climb", "Back On Track"];
      headline = pickRotating(opts, seed);
      break;
    }
    default:
      headline = "Let's Get It 💪";
  }

  // Pace chip — must agree with tone
  let paceChip: PaceChip | null = null;
  switch (tone) {
    case "prerun":
      paceChip = null;
      break;
    case "record":
    case "elite":
      paceChip = { text: "Above Pace ⚡", variant: "fire" };
      break;
    case "strong":
      paceChip = dayRecord.avg > 0 && todayT > dayRecord.avg * 1.2
        ? { text: "Above Pace ⚡", variant: "fire" }
        : { text: "On Pace", variant: "primary" };
      break;
    case "steady":
      paceChip = { text: "On Pace", variant: "primary" };
      break;
    case "recovery":
      paceChip = { text: "Build Back", variant: "streak" };
      break;
  }

  // Momentum label / state
  let momentumState: MomentumState = "low";
  let momentumLabel = "Resetting Momentum";
  switch (tone) {
    case "record":
    case "elite":
      momentumState = "high";
      momentumLabel = weekPct >= 120 ? "Monster Session" : "Momentum Surge";
      break;
    case "strong":
      momentumState = "high";
      momentumLabel = activeDays.length >= 3 ? "Locked In" : "Strong Pace";
      break;
    case "steady":
      momentumState = "medium";
      momentumLabel = activeDays.length >= 3 ? "Steady Climb" : "Building Momentum";
      break;
    case "recovery":
      momentumState = "medium";
      momentumLabel = "Finding Rhythm";
      break;
    case "prerun":
      momentumState = "low";
      momentumLabel = isEarlyDay
        ? (activeDays.length >= 1 ? "Warming Up" : "Fresh Start")
        : (activeDays.length >= 1 ? "Opening Pace" : "Rolling In");
      break;
  }

  // Commentary — coherent with tone
  const commentary = buildCommentary(tone, {
    weeks,
    openWeek,
    todayEntry,
    todayT,
    wt,
    weekPct,
    dayRecord,
    sym,
    seed,
    activeDaysCount: activeDays.length,
  });

  return { tone, headline, paceChip, momentumLabel, momentumState, commentary };
}

function buildCommentary(
  tone: DashboardTone,
  ctx: {
    weeks: WeekRecord[];
    openWeek: WeekRecord;
    todayEntry: DayEntry;
    todayT: number;
    wt: number;
    weekPct: number;
    dayRecord: { record: number; avg: number; count: number };
    sym: string;
    seed: number;
    activeDaysCount: number;
  },
): string | null {
  const { todayEntry, todayT, wt, weekPct, dayRecord, sym, seed, weeks, openWeek, activeDaysCount } = ctx;
  const dayName = todayEntry.dayName;

  if (tone === "closed") {
    return null; // headline + commentary already shown in EndDayDialog flow
  }

  if (tone === "prerun") {
    const lines = [
      "Every great week starts with one ride.",
      "Momentum begins now.",
      "Today's chapter is unwritten.",
      "Fresh page. Make it count.",
      "The grind starts when you do.",
    ];
    return pickRotating(lines, seed);
  }

  if (tone === "record") {
    const lines = [
      `History updated — new ${dayName} record`,
      `${dayName} record destroyed`,
      `New ${dayName} record secured`,
    ];
    return pickRotating(lines, seed);
  }

  // Near-record (elite + dayPct >= 85)
  if (dayRecord.record > 0 && todayT > 0) {
    const gap = dayRecord.record - todayT;
    if (gap > 0 && gap <= dayRecord.record * 0.15) {
      const lines = [
        `Only ${formatCurrency(gap, sym)} away from your best ${dayName}`,
        `Tonight could change your ${dayName} history`,
        `One more push — ${formatCurrency(gap, sym)} to go`,
      ];
      return pickRotating(lines, seed);
    }
  }

  if (tone === "recovery") {
    const lines = [
      "Every rep still counts.",
      "One ride at a time — day's still open.",
      "Steady hands. Build it back.",
    ];
    return pickRotating(lines, seed);
  }

  // Goal proximity / surplus
  if (weekPct >= 100 && weekPct < 120) {
    return pickRotating(["Goal crushed — keep pushing", "Target smashed this week", "Goal cleared — surplus mode"], seed);
  }
  if (weekPct >= 120) {
    return pickRotating(["Current You is outperforming Past You", "Best momentum this month", "Weekly pace improving"], seed);
  }
  if (weekPct >= 90 && weekPct < 100) {
    const remaining = openWeek.weeklyGoal - wt;
    return `${formatCurrency(remaining, sym)} to close the goal`;
  }

  // vs average
  if (dayRecord.avg > 0 && todayT > 0) {
    const pctAbove = ((todayT - dayRecord.avg) / dayRecord.avg) * 100;
    if (pctAbove >= 30) {
      return pickRotating([
        `+${Math.round(pctAbove)}% vs average ${dayName}`,
        `You're outperforming recent ${dayName}s`,
        `${dayName} pace accelerating`,
      ], seed);
    }
  }

  // Comparison to previous weeks
  const closedWeeks = weeks.filter((w) => w.id !== openWeek.id && w.status === "closed");
  if (closedWeeks.length > 0) {
    const lastWeek = closedWeeks.sort((a, b) => b.startDate.localeCompare(a.startDate))[0];
    const lastWt = weekTotal(lastWeek);
    if (lastWt > 0 && wt > lastWt * 1.05 && activeDaysCount >= 3) return "You're outperforming last week";
    if (lastWt > 0 && wt > lastWt && activeDaysCount >= 2) return "Ahead of last week's pace";
  }

  if (activeDaysCount >= 4) {
    return pickRotating(["Consistency building this week", "Locked in — steady grind", "Reliable rhythm this week"], seed);
  }

  if (tone === "steady" || tone === "strong") {
    return pickRotating(["Momentum building — keep stacking", "Pace picking up", "Getting into the groove"], seed);
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────
// Legacy helpers — kept for back-compat callers (tests, etc).
// ─────────────────────────────────────────────────────────────────

export function getMomentumState(
  weeks: WeekRecord[],
  openWeek: WeekRecord | null,
  todayTotal: number,
  dayAvg: number,
  weekPct: number,
): MomentumInfo {
  if (!openWeek) return { state: "low", label: "Ready to Start" };

  const loggedDays = getLoggedDays(openWeek);
  const activeDaysCount = openWeek.entries.filter((d) => dayTotal(d) > 0).length;

  // HIGH momentum conditions
  if (weekPct >= 100 && loggedDays.length <= 5) return { state: "high", label: "Beast Week" };
  if (weekPct >= 90) return { state: "high", label: "Elite Pace" };
  if (todayTotal > dayAvg * 1.3 && dayAvg > 0 && activeDaysCount >= 3)
    return { state: "high", label: "Locked In" };
  if (weekPct >= 80 && activeDaysCount >= 4) return { state: "high", label: "History Within Reach" };

  // MEDIUM momentum conditions
  if (weekPct >= 50) return { state: "medium", label: "Strong Rhythm" };
  if (todayTotal >= dayAvg * 0.9 && dayAvg > 0) return { state: "medium", label: "Consistent Grind" };
  if (activeDaysCount >= 3) return { state: "medium", label: "Stable Momentum" };

  // LOW momentum conditions
  if (activeDaysCount >= 1 && weekPct < 30) return { state: "low", label: "Rebuilding Pace" };
  if (todayTotal > 0) return { state: "low", label: "Slow Recovery" };
  return { state: "low", label: "Resetting Momentum" };
}

export function getSmartCommentary(
  weeks: WeekRecord[],
  openWeek: WeekRecord | null,
  todayEntry: DayEntry | null,
  todayTotal: number,
  dayRecord: { record: number; avg: number; count: number },
  weekPct: number,
  sym: string,
  context?: { headlineText?: string; hasGrowthChips?: boolean },
): string | null {
  if (!openWeek || !todayEntry) return null;

  const dayName = todayEntry.dayName;
  const loggedDays = getLoggedDays(openWeek);
  const activeDays = openWeek.entries.filter((d) => dayTotal(d) > 0);
  const wt = weekTotal(openWeek);
  const goal = openWeek.weeklyGoal;
  const headline = context?.headlineText ?? "";
  const hasChips = context?.hasGrowthChips ?? false;

  // Check consecutive active days (elite streak)
  let consecutiveActive = 0;
  for (let i = openWeek.entries.length - 1; i >= 0; i--) {
    if (dayTotal(openWeek.entries[i]) > 0) consecutiveActive++;
    else break;
  }

  // Record proximity
  if (dayRecord.record > 0 && todayTotal > 0) {
    const gap = dayRecord.record - todayTotal;
    if (gap > 0 && gap <= dayRecord.record * 0.15) {
      const nearRecordLines = [
        `Only ${formatCurrency(gap, sym)} away from your best ${dayName}`,
        `Tonight could change your ${dayName} history`,
        `One more push — ${formatCurrency(gap, sym)} to go`,
        `${dayName} record within reach`,
      ];
      return nearRecordLines[Math.floor(todayTotal * 7) % nearRecordLines.length];
    }
    if (todayTotal > dayRecord.record) {
      const recordLines = [
        `History updated — new ${dayName} record`,
        `${dayName} record destroyed`,
        `New ${dayName} record secured`,
      ];
      return recordLines[Math.floor(todayTotal * 3) % recordLines.length];
    }
  }

  // vs average
  // Skip if growth chips already show the vs-average stat
  if (dayRecord.avg > 0 && todayTotal > 0) {
    const pctAbove = ((todayTotal - dayRecord.avg) / dayRecord.avg) * 100;
    if (pctAbove >= 30 && !hasChips) {
      const strongLines = [
        `+${Math.round(pctAbove)}% vs average ${dayName}`,
        `You're outperforming recent ${dayName}s`,
        `${dayName} pace accelerating`,
      ];
      return strongLines[Math.floor(todayTotal * 5) % strongLines.length];
    }
    // Don't say "Strong <day>" if headline already says it
    if (pctAbove >= 10 && !headline.toLowerCase().includes("strong")) {
      if (!hasChips) {
        const midLines = [
          `Strong ${dayName} so far`,
          `Solid ${dayName} building`,
          `${dayName} energy rising`,
        ];
        return midLines[Math.floor(todayTotal * 4) % midLines.length];
      }
    }
  }

  // Elite streak
  // Skip if headline already communicates momentum/streak identity
  if (consecutiveActive >= 3 && !headline.toLowerCase().includes("locked") && !headline.toLowerCase().includes("elite"))
  {
    const streakLines = [
      `${consecutiveActive} elite days in a row`,
      `${consecutiveActive}-day streak and counting`,
      `Consistency machine — ${consecutiveActive} days`,
    ];
    return streakLines[Math.floor(todayTotal * 6) % streakLines.length];
  }

  // Goal proximity
  if (weekPct >= 90 && weekPct < 100) {
    const remaining = goal - wt;
    return `${formatCurrency(remaining, sym)} to close the goal`;
  }
  if (weekPct >= 100 && weekPct < 120 && !headline.toLowerCase().includes("elite") && !headline.toLowerCase().includes("history"))
  {
    const goalLines = ["Goal crushed — keep pushing", "Target smashed this week", "Goal cleared — surplus mode"];
    return goalLines[Math.floor(wt * 3) % goalLines.length];
  }
  if (weekPct >= 120 && !headline.toLowerCase().includes("history")) {
    const eliteLines = ["Current You is outperforming Past You", "Best momentum this month", "Weekly pace improving"];
    return eliteLines[Math.floor(wt * 4) % eliteLines.length];
  }

  // Comparison to previous weeks
  const closedWeeks = weeks.filter((w) => w.id !== openWeek.id && w.status === "closed");
  if (closedWeeks.length > 0) {
    const lastWeek = closedWeeks.sort((a, b) => b.startDate.localeCompare(a.startDate))[0];
    const lastWt = weekTotal(lastWeek);
    if (lastWt > 0 && wt > lastWt * 1.05 && loggedDays.length >= 3)
      return "You're outperforming last week";
    if (lastWt > 0 && wt > lastWt && loggedDays.length >= 2)
      return "Ahead of last week's pace";
  }

  // Consistency
  if (activeDays.length >= 4) {
    const conLines = ["Consistency building this week", "Locked in — steady grind", "Reliable rhythm this week"];
    return conLines[Math.floor(wt * 5) % conLines.length];
  }

  // Building momentum
  // Skip if headline already says "Building Momentum"
  if (todayTotal > 0 && activeDays.length >= 2 && !headline.toLowerCase().includes("building"))
  {
    const buildLines = ["Momentum building — keep stacking", "Pace picking up", "Getting into the groove"];
    return buildLines[Math.floor(todayTotal * 2) % buildLines.length];
  }

  // Pace check
  if (dayRecord.avg > 0 && todayTotal > 0 && todayTotal >= dayRecord.avg && !hasChips)
  {
    const paceLines = [`${dayName} pace above your average`, `Steady ${dayName} — above baseline`];
    return paceLines[Math.floor(todayTotal * 3) % paceLines.length];
  }

  // Low / no earnings yet
  if (todayTotal === 0 && activeDays.length >= 1) {
    const lowLines = ["Slow start. Plenty of time left.", "Day's still young", "Ready when you are"];
    return lowLines[Math.floor(wt * 7) % lowLines.length];
  }

  return null;
}

export function getPersonalGrowthStats(
  weeks: WeekRecord[],
  openWeek: WeekRecord | null,
  todayTotal: number,
  dayName: string,
  dayAvg: number,
): { label: string; value: string; positive: boolean }[] {
  const stats: { label: string; value: string; positive: boolean }[] = [];
  if (!openWeek) return stats;

  // vs average day
  if (dayAvg > 0 && todayTotal > 0) {
    const diff = ((todayTotal - dayAvg) / dayAvg) * 100;
    if (Math.abs(diff) >= 5) {
      stats.push({
        label: `vs avg ${dayName}`,
        value: `${diff > 0 ? "+" : ""}${Math.round(diff)}%`,
        positive: diff > 0,
      });
    }
  }

  // Consistency check: how many of last 4 weeks hit goal
  const closedWeeks = weeks
    .filter((w) => w.id !== openWeek.id && w.status === "closed")
    .sort((a, b) => b.startDate.localeCompare(a.startDate))
    .slice(0, 4);

  if (closedWeeks.length >= 2) {
    const goalHits = closedWeeks.filter((w) => weekTotal(w) >= w.weeklyGoal).length;
    if (goalHits >= 3) {
      stats.push({
        label: "Goal consistency",
        value: `${goalHits}/${closedWeeks.length} weeks`,
        positive: true,
      });
    }
  }

  return stats;
}