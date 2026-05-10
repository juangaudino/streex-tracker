import { WeekRecord } from "./types";
import { weekTotal, dayTotal, appTotal } from "./store";

export interface CareerStats {
  lifetimeEarnings: number;
  bestDay: { total: number; dayName: string; date: string };
  bestWeek: { total: number; startDate: string; endDate: string };
  currentStreak: number;
  longestStreak: number;
  totalActiveDays: number;
  totalEntriesLogged: number;
  avgDaily: number;
  mostUsedApp: { app: string; total: number };
  monthlyGrowth: number | null; // percent vs previous month, null if not enough data
  bestWeekday: { dayName: string; avg: number };
  archetype: string;
  momentumStatus: string;
  /** Progressive monthly comparison — never punishes early-month progress. */
  monthlyProgression: {
    currentMonthTotal: number;
    lastMonthTotal: number;
    pctOfLastMonth: number | null; // null when no prior month
    bestMonthTotal: number;
    bestMonthLabel: string; // YYYY-MM
    pctOfBestMonth: number | null;
    isCurrentBest: boolean;
  };
}

function allDaysSorted(weeks: WeekRecord[]) {
  return [...weeks]
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .flatMap((w) => w.entries.map((e) => ({ ...e, _weekId: w.id })));
}

export function computeCareerStats(weeks: WeekRecord[]): CareerStats {
  const days = allDaysSorted(weeks);
  const activeDays = days.filter((d) => dayTotal(d) > 0);

  const lifetimeEarnings = activeDays.reduce((s, d) => s + dayTotal(d), 0);

  // Best day
  let bestDay = { total: 0, dayName: "—", date: "" };
  activeDays.forEach((d) => {
    const t = dayTotal(d);
    if (t > bestDay.total) bestDay = { total: t, dayName: d.dayName, date: d.date };
  });

  // Best week
  let bestWeek = { total: 0, startDate: "", endDate: "" };
  weeks.forEach((w) => {
    const t = weekTotal(w);
    if (t > bestWeek.total) bestWeek = { total: t, startDate: w.startDate, endDate: w.endDate };
  });

  // Streaks (consecutive active days, counting only logged entries; gaps from unlogged future days don't break it)
  let longestStreak = 0;
  let cur = 0;
  for (const d of days) {
    const t = dayTotal(d);
    const isLogged = d.logged !== undefined ? d.logged : t > 0;
    if (!isLogged) continue;
    if (t > 0) { cur++; longestStreak = Math.max(longestStreak, cur); }
    else cur = 0;
  }
  // Current streak (from end backwards)
  let currentStreak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    const d = days[i];
    const t = dayTotal(d);
    const isLogged = d.logged !== undefined ? d.logged : t > 0;
    if (!isLogged) continue;
    if (t > 0) currentStreak++;
    else break;
  }

  const totalActiveDays = activeDays.length;
  const totalEntriesLogged = days.filter((d) => (d.logged !== undefined ? d.logged : dayTotal(d) > 0)).length;
  const avgDaily = totalActiveDays > 0 ? lifetimeEarnings / totalActiveDays : 0;

  // Most used app
  const apps = Object.keys(weeks[0]?.entries[0]?.apps || {});
  let mostUsedApp = { app: "—", total: 0 };
  apps.forEach((a) => {
    const t = weeks.reduce((s, w) => s + appTotal(w, a), 0);
    if (t > mostUsedApp.total) mostUsedApp = { app: a, total: t };
  });

  // Monthly growth
  const byMonth = new Map<string, number>();
  activeDays.forEach((d) => {
    const ym = d.date.slice(0, 7);
    byMonth.set(ym, (byMonth.get(ym) || 0) + dayTotal(d));
  });
  const months = [...byMonth.keys()].sort();
  let monthlyGrowth: number | null = null;
  if (months.length >= 2) {
    const last = byMonth.get(months[months.length - 1]) || 0;
    const prev = byMonth.get(months[months.length - 2]) || 0;
    if (prev > 0) monthlyGrowth = ((last - prev) / prev) * 100;
  }

  // Monthly progression (chase model — never negative)
  const now = new Date();
  const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevYM = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
  const currentMonthTotal = byMonth.get(currentYM) || 0;
  const lastMonthTotal = byMonth.get(prevYM) || 0;
  const pctOfLastMonth = lastMonthTotal > 0 ? (currentMonthTotal / lastMonthTotal) * 100 : null;

  let bestMonthTotal = 0;
  let bestMonthLabel = "";
  byMonth.forEach((v, k) => {
    // exclude the current in-progress month from "best month ever" target
    if (k === currentYM) return;
    if (v > bestMonthTotal) {
      bestMonthTotal = v;
      bestMonthLabel = k;
    }
  });
  const pctOfBestMonth = bestMonthTotal > 0 ? (currentMonthTotal / bestMonthTotal) * 100 : null;
  const isCurrentBest = currentMonthTotal > 0 && currentMonthTotal >= bestMonthTotal;

  const monthlyProgression = {
    currentMonthTotal,
    lastMonthTotal,
    pctOfLastMonth,
    bestMonthTotal,
    bestMonthLabel,
    pctOfBestMonth,
    isCurrentBest,
  };

  // Best weekday (by avg)
  const dayBuckets = new Map<string, { sum: number; count: number }>();
  activeDays.forEach((d) => {
    const b = dayBuckets.get(d.dayName) || { sum: 0, count: 0 };
    b.sum += dayTotal(d);
    b.count++;
    dayBuckets.set(d.dayName, b);
  });
  let bestWeekday = { dayName: "—", avg: 0 };
  dayBuckets.forEach((b, k) => {
    const avg = b.count > 0 ? b.sum / b.count : 0;
    if (avg > bestWeekday.avg) bestWeekday = { dayName: k, avg };
  });

  // Archetype
  const archetype = computeArchetype(activeDays, weeks, dayBuckets, currentStreak);

  // Momentum status
  const momentumStatus = computeMomentumStatus(weeks, monthlyGrowth, currentStreak);

  return {
    lifetimeEarnings,
    bestDay,
    bestWeek,
    currentStreak,
    longestStreak,
    totalActiveDays,
    totalEntriesLogged,
    avgDaily,
    mostUsedApp,
    monthlyGrowth,
    bestWeekday,
    archetype,
    momentumStatus,
    monthlyProgression,
  };
}

function computeArchetype(
  activeDays: { dayName: string }[],
  weeks: WeekRecord[],
  dayBuckets: Map<string, { sum: number; count: number }>,
  currentStreak: number,
): string {
  if (activeDays.length === 0) return "New Driver";

  const weekendCount = activeDays.filter((d) => d.dayName === "Saturday" || d.dayName === "Sunday").length;
  const weekendPct = weekendCount / activeDays.length;

  // Day specialist
  let topDay: { dayName: string; avg: number } = { dayName: "", avg: 0 };
  dayBuckets.forEach((b, k) => {
    const a = b.count > 0 ? b.sum / b.count : 0;
    if (a > topDay.avg) topDay = { dayName: k, avg: a };
  });
  const overallAvg = activeDays.length > 0
    ? [...dayBuckets.values()].reduce((s, b) => s + b.sum, 0) / activeDays.length
    : 0;

  if (currentStreak >= 7) return "Daily Grinder";
  if (weekendPct >= 0.55) return "Weekend Warrior";
  if (topDay.avg > overallAvg * 1.4 && topDay.dayName) return `${topDay.dayName} Specialist`;

  // Consistency
  const totalSlots = weeks.length * 7;
  if (totalSlots > 0 && activeDays.length / totalSlots >= 0.6) return "Consistency Master";
  if (activeDays.length >= 14) return "Momentum Builder";
  return "Rising Driver";
}

function computeMomentumStatus(
  weeks: WeekRecord[],
  monthlyGrowth: number | null,
  currentStreak: number,
): string {
  if (currentStreak >= 7 && (monthlyGrowth ?? 0) > 0) return "Elite Consistency";
  if ((monthlyGrowth ?? 0) >= 15) return "Accelerating";
  if ((monthlyGrowth ?? 0) >= 0) return "Rising";
  if (weeks.length >= 2) return "Stable";
  return "Just Getting Started";
}

// ── End Day helpers ──

export interface NearAchievement {
  label: string;
  detail: string;
}

export function getNearAchievementHints(
  weeks: WeekRecord[],
  todayTotal: number,
  sym: string,
): NearAchievement[] {
  const hints: NearAchievement[] = [];
  const days = allDaysSorted(weeks);
  const activeDays = days.filter((d) => dayTotal(d) > 0);

  // Streak hint
  let currentStreak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    const t = dayTotal(days[i]);
    const isLogged = days[i].logged !== undefined ? days[i].logged : t > 0;
    if (!isLogged) continue;
    if (t > 0) currentStreak++;
    else break;
  }
  const streakTargets = [3, 7, 14, 30];
  const nextStreak = streakTargets.find((t) => currentStreak < t);
  if (nextStreak && nextStreak - currentStreak <= 2) {
    hints.push({
      label: `${nextStreak}-Day Streak`,
      detail: `${nextStreak - currentStreak} more day${nextStreak - currentStreak > 1 ? "s" : ""} to unlock`,
    });
  }

  // Best day approach
  const bestDayTotal = activeDays.reduce((m, d) => Math.max(m, dayTotal(d)), 0);
  const dayTargets = [200, 300, 400, 500, 750, 1000];
  const nextDayMilestone = dayTargets.find((t) => todayTotal < t);
  if (nextDayMilestone && nextDayMilestone - todayTotal <= 50 && todayTotal > 0) {
    hints.push({
      label: `First ${sym}${nextDayMilestone} Day`,
      detail: `${sym}${(nextDayMilestone - todayTotal).toFixed(0)} away`,
    });
  }
  if (bestDayTotal > 0 && todayTotal > 0 && todayTotal >= bestDayTotal * 0.9 && todayTotal < bestDayTotal) {
    hints.push({
      label: "All-Time Best Day",
      detail: `${sym}${(bestDayTotal - todayTotal).toFixed(0)} away`,
    });
  }

  return hints.slice(0, 3);
}

export function getWeeklyMomentumPreview(
  weeks: WeekRecord[],
  openWeekId: string,
  sym: string,
): string | null {
  const open = weeks.find((w) => w.id === openWeekId);
  if (!open) return null;
  const currentT = weekTotal(open);
  const others = weeks.filter((w) => w.id !== openWeekId);
  if (!others.length) return currentT >= open.weeklyGoal
    ? `Current pace would unlock your first ${sym}${open.weeklyGoal} week.`
    : null;

  const sortedByTotal = [...others].sort((a, b) => weekTotal(b) - weekTotal(a));
  const bestT = weekTotal(sortedByTotal[0]);
  if (bestT > 0 && currentT < bestT) {
    const gap = bestT - currentT;
    if (gap <= bestT * 0.2) return `Only ${sym}${gap.toFixed(0)} away from your best week ever.`;
  }
  if (bestT > 0 && currentT >= bestT) return "This week is your strongest yet.";

  // Rank
  const rank = sortedByTotal.filter((w) => weekTotal(w) > currentT).length + 1;
  if (rank <= 5 && weeks.length >= 4) return `Current week ranks #${rank} of all time.`;

  if (currentT >= open.weeklyGoal) return "Goal cleared — momentum strong.";
  return null;
}
