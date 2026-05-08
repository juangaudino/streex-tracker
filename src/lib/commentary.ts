import { WeekRecord, DayEntry } from "@/lib/types";
import { weekTotal, dayTotal, formatCurrency, getLoggedDays } from "@/lib/store";
import { getDayOfWeekRecord } from "@/components/ActiveMomentum";

export type MomentumState = "low" | "medium" | "high";

export interface MomentumInfo {
  state: MomentumState;
  label: string;
}

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
    return goalLines[Math.floor(total * 3) % goalLines.length];
  }
  if (weekPct >= 120 && !headline.toLowerCase().includes("history")) {
    const eliteLines = ["Current You is outperforming Past You", "Best momentum this month", "Weekly pace improving"];
    return eliteLines[Math.floor(total * 4) % eliteLines.length];
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
    return conLines[Math.floor(total * 5) % conLines.length];
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
    return lowLines[Math.floor(total * 7) % lowLines.length];
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