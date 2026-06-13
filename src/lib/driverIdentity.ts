import type { DayEntry, DayName, WeekRecord } from "./types";
import { DAY_NAMES } from "./types";
import { dayTotal, weekTotal } from "./store";
import { appBonusTotal } from "./rewardIncome";

export type XpCategory = "consistency" | "performance";

export const XP_EVENT_TYPES = {
  DAY_OPENED: "DAY_OPENED",
  DAY_CLOSED: "DAY_CLOSED",
  THREE_DAY_STREAK: "THREE_DAY_STREAK",
  FULL_WORKING_WEEK: "FULL_WORKING_WEEK",
  STREAK_CONTINUED: "STREAK_CONTINUED",
  BEAT_PERSONAL_AVERAGE: "BEAT_PERSONAL_AVERAGE",
  DAILY_RECORD: "DAILY_RECORD",
  WEEKLY_GOAL_REACHED: "WEEKLY_GOAL_REACHED",
  ELITE_DAY: "ELITE_DAY",
  THREE_APP_DAY: "THREE_APP_DAY",
} as const;

export type XpEventType = (typeof XP_EVENT_TYPES)[keyof typeof XP_EVENT_TYPES];

export interface XpEvent {
  eventKey: string;
  eventType: XpEventType;
  xpCategory: XpCategory;
  xpAmount: number;
  sourceWeekId?: string;
  sourceDate?: string;
  metadata: Record<string, unknown>;
}

export interface StoredXpEvent extends XpEvent {
  id?: string;
  createdAt?: string;
}

// V5.4 default thresholds: intentionally reachable early, then increasingly aspirational.
// XP is cumulative and never subtracted; future tuning should preserve level continuity.
export const DRIVER_LEVELS = [
  { name: "Rookie", threshold: 0 },
  { name: "Road Runner", threshold: 250 },
  { name: "Steady Grinder", threshold: 750 },
  { name: "Street Pro", threshold: 1500 },
  { name: "Top Earner", threshold: 3000 },
  { name: "Elite Driver", threshold: 6000 },
  { name: "Streex Legend", threshold: 10000 },
] as const;

export type DriverLevelName = (typeof DRIVER_LEVELS)[number]["name"];

export interface DriverLevelProgress {
  currentLevel: DriverLevelName;
  totalXp: number;
  currentThreshold: number;
  nextLevel: DriverLevelName | null;
  nextThreshold: number | null;
  xpToNext: number;
  progressPct: number;
}

export interface DriverArchetype {
  id: string;
  name: string;
  reason: string;
  score: number;
}

export interface DayRanking {
  label: string;
  rank: number;
  total: number;
  sampleSize: number;
  monthRank?: number;
  monthSampleSize?: number;
  tone: string;
}

export interface RivalSnippet {
  type: "daily" | "weekly" | "monthly" | "streak" | "pace";
  label: string;
  detail: string;
}

export interface IdealWeekComparison {
  idealWeekTotal: number;
  currentWeekTotal: number;
  availableWeekdays: number;
  missingWeekdays: DayName[];
  pctOfIdeal: number;
  copy: string;
}

export interface AdaptivePace {
  calendarPace: number;
  workedDayPace: number;
  workedDays: number;
  elapsedDays: number;
  copy: string;
}

export interface CareerTitle {
  title: string;
  subtitle: string;
  tone: "forming" | "steady" | "momentum" | "record" | "legend";
}

export interface DriverIdentitySummary {
  totalXp: number;
  consistencyXp: number;
  performanceXp: number;
  level: DriverLevelProgress;
  careerTitle: CareerTitle;
  primaryArchetype: DriverArchetype | null;
  secondaryArchetypes: DriverArchetype[];
  archetypeLocked: boolean;
  historicalRanking: DayRanking | null;
  rival: RivalSnippet | null;
  idealWeek: IdealWeekComparison | null;
  adaptivePace: AdaptivePace | null;
  dayOffCopy: string | null;
}

function isLoggedDay(day: DayEntry): boolean {
  return day.logged === true || day.dayClosed === true || dayTotal(day) > 0;
}

function activeAppsCount(day: DayEntry): number {
  return Object.values(day.apps || {}).filter((v) => Number(v) > 0).length;
}

function allDays(weeks: WeekRecord[]) {
  return [...weeks]
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .flatMap((week) => week.entries.map((day, index) => ({ week, day, index, total: dayTotal(day) })));
}

function sameWeekPriorDays(week: WeekRecord, dayIndex: number) {
  return week.entries.slice(0, Math.max(0, dayIndex));
}

function longestActiveStreak(weeks: WeekRecord[]): number {
  let current = 0;
  let longest = 0;
  for (const { total } of allDays(weeks)) {
    if (total > 0) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }
  return longest;
}

export function buildXpEventsFromWeeks(weeks: WeekRecord[]): XpEvent[] {
  const events: XpEvent[] = [];
  let activeStreak = 0;
  let bestDaySoFar = 0;

  for (const week of [...weeks].sort((a, b) => a.startDate.localeCompare(b.startDate))) {
    const wt = weekTotal(week);
    const activeDays = week.entries.filter((d) => dayTotal(d) > 0);

    for (const [dayIndex, day] of week.entries.entries()) {
      const total = dayTotal(day);
      const base = {
        sourceWeekId: week.id,
        sourceDate: day.date,
      };

      if (isLoggedDay(day)) {
        events.push({
          eventKey: `day-opened:${day.date}`,
          eventType: XP_EVENT_TYPES.DAY_OPENED,
          xpCategory: "consistency",
          xpAmount: 10,
          ...base,
          metadata: { dayName: day.dayName },
        });
      }

      if (day.dayClosed) {
        events.push({
          eventKey: `day-closed:${day.date}`,
          eventType: XP_EVENT_TYPES.DAY_CLOSED,
          xpCategory: "consistency",
          xpAmount: 15,
          ...base,
          metadata: { dayName: day.dayName, total },
        });
      }

      if (total > 0) {
        activeStreak += 1;
        if (activeStreak === 3) {
          events.push({
            eventKey: `three-day-streak:${day.date}`,
            eventType: XP_EVENT_TYPES.THREE_DAY_STREAK,
            xpCategory: "consistency",
            xpAmount: 25,
            ...base,
            metadata: { streak: activeStreak },
          });
        } else if (activeStreak > 3) {
          events.push({
            eventKey: `streak-continued:${day.date}`,
            eventType: XP_EVENT_TYPES.STREAK_CONTINUED,
            xpCategory: "consistency",
            xpAmount: 20,
            ...base,
            metadata: { streak: activeStreak },
          });
        }

        if (bestDaySoFar > 0 && total > bestDaySoFar) {
          events.push({
            eventKey: `daily-record:${day.date}`,
            eventType: XP_EVENT_TYPES.DAILY_RECORD,
            xpCategory: "performance",
            xpAmount: 50,
            ...base,
            metadata: { total, previousRecord: bestDaySoFar },
          });
        }
        bestDaySoFar = Math.max(bestDaySoFar, total);

        const priorWorked = sameWeekPriorDays(week, dayIndex).filter((d) => dayTotal(d) > 0);
        const priorAvg = priorWorked.length
          ? priorWorked.reduce((s, d) => s + dayTotal(d), 0) / priorWorked.length
          : 0;
        if (priorAvg > 0 && total > priorAvg) {
          events.push({
            eventKey: `beat-personal-average:${day.date}`,
            eventType: XP_EVENT_TYPES.BEAT_PERSONAL_AVERAGE,
            xpCategory: "performance",
            xpAmount: 20,
            ...base,
            metadata: { total, priorWeekToDateAverage: Number(priorAvg.toFixed(2)) },
          });
        }

        if (total >= 300) {
          events.push({
            eventKey: `elite-day:${day.date}`,
            eventType: XP_EVENT_TYPES.ELITE_DAY,
            xpCategory: "performance",
            xpAmount: 100,
            ...base,
            metadata: { total },
          });
        }

        if (activeAppsCount(day) >= 3) {
          events.push({
            eventKey: `three-app-day:${day.date}`,
            eventType: XP_EVENT_TYPES.THREE_APP_DAY,
            xpCategory: "performance",
            xpAmount: 15,
            ...base,
            metadata: { activeApps: activeAppsCount(day) },
          });
        }
      } else {
        activeStreak = 0;
      }
    }

    if (activeDays.length >= 7) {
      events.push({
        eventKey: `full-working-week:${week.id}`,
        eventType: XP_EVENT_TYPES.FULL_WORKING_WEEK,
        xpCategory: "consistency",
        xpAmount: 50,
        sourceWeekId: week.id,
        metadata: { startDate: week.startDate, activeDays: activeDays.length },
      });
    }

    if (week.weeklyGoal > 0 && wt >= week.weeklyGoal) {
      events.push({
        eventKey: `weekly-goal:${week.id}`,
        eventType: XP_EVENT_TYPES.WEEKLY_GOAL_REACHED,
        xpCategory: "performance",
        xpAmount: 75,
        sourceWeekId: week.id,
        metadata: { startDate: week.startDate, total: wt, goal: week.weeklyGoal },
      });
    }
  }

  return events.filter((event, index, arr) =>
    arr.findIndex((candidate) => candidate.eventKey === event.eventKey) === index,
  );
}

export function getLevelProgress(totalXp: number): DriverLevelProgress {
  const currentIndex = DRIVER_LEVELS.reduce(
    (best, level, index) => (totalXp >= level.threshold ? index : best),
    0,
  );
  const current = DRIVER_LEVELS[currentIndex];
  const next = DRIVER_LEVELS[currentIndex + 1] ?? null;
  const span = next ? next.threshold - current.threshold : 1;
  const earnedInLevel = Math.max(0, totalXp - current.threshold);
  return {
    currentLevel: current.name,
    totalXp,
    currentThreshold: current.threshold,
    nextLevel: next?.name ?? null,
    nextThreshold: next?.threshold ?? null,
    xpToNext: next ? Math.max(0, next.threshold - totalXp) : 0,
    progressPct: next ? Math.min(100, Math.round((earnedInLevel / span) * 100)) : 100,
  };
}

function appTotals(weeks: WeekRecord[]) {
  const totals = new Map<string, number>();
  for (const week of weeks) {
    for (const day of week.entries) {
      for (const [app, value] of Object.entries(day.apps || {})) {
        totals.set(app, (totals.get(app) || 0) + (Number(value) || 0) + appBonusTotal(day, app));
      }
      for (const bonus of day.bonuses ?? []) {
        if (Object.prototype.hasOwnProperty.call(day.apps ?? {}, bonus.app)) continue;
        totals.set(bonus.app, (totals.get(bonus.app) || 0) + (Number(bonus.amount) || 0));
      }
    }
  }
  return totals;
}

export function calculateArchetypes(weeks: WeekRecord[]): {
  primary: DriverArchetype | null;
  secondary: DriverArchetype[];
  locked: boolean;
} {
  const workedDays = allDays(weeks).filter((d) => d.total > 0);
  if (workedDays.length < 7) return { primary: null, secondary: [], locked: true };

  const totals = appTotals(weeks);
  const lifetimeTotal = [...totals.values()].reduce((s, v) => s + v, 0);
  const sortedApps = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  const archetypes: DriverArchetype[] = [];
  const weekendTotal = workedDays
    .filter(({ day }) => day.dayName === "Saturday" || day.dayName === "Sunday")
    .reduce((s, d) => s + d.total, 0);
  const goalWeeks = weeks.filter((w) => w.weeklyGoal > 0 && weekTotal(w) >= w.weeklyGoal).length;
  const streak = longestActiveStreak(weeks);

  if (sortedApps[0] && lifetimeTotal > 0 && sortedApps[0][1] / lifetimeTotal >= 0.45) {
    const [app, total] = sortedApps[0];
    const isRide = app === "Uber" || app === "Lyft";
    archetypes.push({
      id: isRide ? "ride-king" : `${app.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-specialist`,
      name: isRide ? "Ride King" : `${app.replace(" Driver", "")} Specialist`,
      reason: `${app} leads your earnings mix.`,
      score: total / lifetimeTotal,
    });
  }

  if (streak >= 7) {
    archetypes.push({
      id: "streak-machine",
      name: "Streak Machine",
      reason: `${streak} active days is your longest run.`,
      score: Math.min(1, streak / 21),
    });
  }

  if (weekendTotal / Math.max(1, lifetimeTotal) >= 0.35) {
    archetypes.push({
      id: "weekend-warrior",
      name: "Weekend Warrior",
      reason: "Weekends carry a meaningful share of your earnings.",
      score: weekendTotal / Math.max(1, lifetimeTotal),
    });
  }

  if (goalWeeks >= 3) {
    archetypes.push({
      id: "goal-crusher",
      name: "Goal Crusher",
      reason: `${goalWeeks} weeks reached or passed goal.`,
      score: Math.min(1, goalWeeks / Math.max(1, weeks.length)),
    });
  }

  if (!archetypes.length) {
    archetypes.push({
      id: "steady-grinder",
      name: "Steady Grinder",
      reason: "Your identity is forming through consistent tracked work.",
      score: 0.5,
    });
  }

  const sorted = archetypes.sort((a, b) => b.score - a.score);
  return { primary: sorted[0], secondary: sorted.slice(1, 3), locked: false };
}

export function getHistoricalDayRanking(
  weeks: WeekRecord[],
  currentWeek: WeekRecord | null,
  date: string,
): DayRanking | null {
  const current = currentWeek?.entries.find((d) => d.date === date);
  if (!current) return null;
  const total = dayTotal(current);
  const sameWeekday = allDays(weeks)
    .filter(({ day }) => day.dayName === current.dayName && day.date <= date)
    .map(({ day }) => ({ date: day.date, total: dayTotal(day) }))
    .filter((d) => d.total > 0 || d.date === date)
    .sort((a, b) => b.total - a.total);

  if (sameWeekday.length < 3) return null;
  const rank = sameWeekday.findIndex((d) => d.date === date) + 1;
  const monthKey = date.slice(0, 7);
  const monthDays = sameWeekday.filter((d) => d.date.startsWith(monthKey));
  const monthRank = monthDays.findIndex((d) => d.date === date) + 1;
  const label = rank <= 5
    ? `Top ${rank} ${current.dayName} ever`
    : `#${rank} of ${sameWeekday.length} ${current.dayName}s`;

  return {
    label,
    rank,
    total,
    sampleSize: sameWeekday.length,
    monthRank: monthRank > 0 ? monthRank : undefined,
    monthSampleSize: monthDays.length || undefined,
    tone: rank === 1 ? "Best yet" : "History within reach",
  };
}

function localDateString(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getActiveRankingDate(openWeek: WeekRecord | null, date: string): string {
  if (!openWeek) return date;
  const todayEntry = openWeek.entries.find((day) => day.date === date);
  if (todayEntry && (dayTotal(todayEntry) > 0 || todayEntry.dayClosed)) return date;

  const activePastDay = [...openWeek.entries]
    .filter((day) => day.date <= date && dayTotal(day) > 0 && !day.dayClosed)
    .sort((a, b) => b.date.localeCompare(a.date))[0];

  return activePastDay?.date ?? date;
}

export function getIdealWeekComparison(weeks: WeekRecord[], openWeek: WeekRecord | null): IdealWeekComparison | null {
  if (!openWeek) return null;
  const bestByDay = new Map<DayName, number>();
  for (const { day, total } of allDays(weeks)) {
    if (total <= 0) continue;
    bestByDay.set(day.dayName, Math.max(bestByDay.get(day.dayName) || 0, total));
  }
  const missingWeekdays = DAY_NAMES.filter((day) => !bestByDay.has(day));
  if (bestByDay.size < 5) return null;
  const idealWeekTotal = [...bestByDay.values()].reduce((s, v) => s + v, 0);
  const currentWeekTotal = weekTotal(openWeek);
  return {
    idealWeekTotal,
    currentWeekTotal,
    availableWeekdays: bestByDay.size,
    missingWeekdays,
    pctOfIdeal: Math.round((currentWeekTotal / Math.max(1, idealWeekTotal)) * 100),
    copy: "Your ideal week combines your own best weekday performances.",
  };
}

export function getAdaptivePace(openWeek: WeekRecord | null): AdaptivePace | null {
  if (!openWeek) return null;
  const today = new Date().toISOString().slice(0, 10);
  const elapsedDays = openWeek.entries.filter((d) => d.date <= today).length || openWeek.entries.length;
  const workedDays = openWeek.entries.filter((d) => dayTotal(d) > 0).length;
  const total = weekTotal(openWeek);
  return {
    calendarPace: total / Math.max(1, elapsedDays),
    workedDayPace: workedDays ? total / workedDays : 0,
    workedDays,
    elapsedDays,
    copy: workedDays
      ? "Worked-day pace keeps days off from distorting your rhythm."
      : "No worked-day pace yet. Quiet days are part of the rhythm.",
  };
}

export function getRivalSnippet(weeks: WeekRecord[], openWeek: WeekRecord | null): RivalSnippet | null {
  if (!openWeek) return null;
  const current = weekTotal(openWeek);
  const today = new Date().toISOString().slice(0, 10);
  const todayEntry = openWeek.entries.find((d) => d.date === today);

  if (todayEntry) {
    const todayTotal = dayTotal(todayEntry);
    const sameWeekday = allDays(weeks)
      .filter(({ day }) => day.dayName === todayEntry.dayName && day.date < today)
      .map(({ total }) => total)
      .filter((total) => total > 0);
    const bestSameWeekday = sameWeekday.length ? Math.max(...sameWeekday) : 0;
    if (bestSameWeekday > 0) {
      return {
        type: "daily",
        label: "Your previous best is today's rival",
        detail: todayTotal > 0
          ? `${Math.round((todayTotal / bestSameWeekday) * 100)}% of your best ${todayEntry.dayName}`
          : `History is waiting at your best ${todayEntry.dayName}`,
      };
    }
  }

  const record = weeks
    .filter((w) => w.id !== openWeek.id)
    .reduce<WeekRecord | null>((best, w) => (!best || weekTotal(w) > weekTotal(best) ? w : best), null);

  if (record && weekTotal(record) > 0) {
    const gap = Math.max(0, weekTotal(record) - current);
    return {
      type: "weekly",
      label: "Past you set the benchmark",
      detail: gap > 0
        ? `${Math.round((current / weekTotal(record)) * 100)}% of your record week`
        : "You are meeting your own record standard.",
    };
  }

  const currentMonth = today.slice(0, 7);
  const monthTotals = new Map<string, number>();
  for (const { day, total } of allDays(weeks)) {
    const key = day.date.slice(0, 7);
    monthTotals.set(key, (monthTotals.get(key) || 0) + total);
  }
  const currentMonthTotal = monthTotals.get(currentMonth) || 0;
  const bestPastMonth = Math.max(
    0,
    ...[...monthTotals.entries()]
      .filter(([key]) => key !== currentMonth)
      .map(([, total]) => total),
  );
  if (bestPastMonth > 0) {
    return {
      type: "monthly",
      label: "Current month chase",
      detail: `${Math.round((currentMonthTotal / bestPastMonth) * 100)}% of your best month`,
    };
  }

  const streak = longestActiveStreak(weeks);
  if (streak >= 3) {
    return {
      type: "streak",
      label: "Your streak is the rival",
      detail: `${streak} active days is the standard you built.`,
    };
  }

  const worked = allDays(weeks).filter(({ total }) => total > 0);
  const averageWorkedDay = worked.length
    ? worked.reduce((sum, d) => sum + d.total, 0) / worked.length
    : 0;
  const currentWorkedDayPace = openWeek.entries.filter((d) => dayTotal(d) > 0).length
    ? current / openWeek.entries.filter((d) => dayTotal(d) > 0).length
    : 0;
  if (averageWorkedDay > 0 && currentWorkedDayPace > 0) {
    return {
      type: "pace",
      label: "Pace rival",
      detail: `${Math.round((currentWorkedDayPace / averageWorkedDay) * 100)}% of your worked-day average`,
    };
  }
  return null;
}

export function getDayOffCopy(openWeek: WeekRecord | null): string | null {
  if (!openWeek) return null;
  // Day Off V1: current data cannot prove intent, so copy stays neutral and non-punitive.
  const today = new Date().toISOString().slice(0, 10);
  const todayEntry = openWeek.entries.find((d) => d.date === today);
  if (!todayEntry || dayTotal(todayEntry) > 0 || isLoggedDay(todayEntry)) return null;
  return "Quiet day so far. Days off belong in the gig rhythm too.";
}

export function getCareerTitle(
  weeks: WeekRecord[],
  openWeek: WeekRecord | null,
  level: DriverLevelProgress,
  primaryArchetype: DriverArchetype | null,
  archetypeLocked: boolean,
): CareerTitle {
  if (archetypeLocked || weeks.length < 2) {
    return {
      title: `${level.currentLevel} - Identity Forming`,
      subtitle: "Keep tracking. Streex is learning your professional rhythm.",
      tone: "forming",
    };
  }

  const currentTotal = openWeek ? weekTotal(openWeek) : 0;
  const currentGoal = openWeek?.weeklyGoal ?? 0;
  const activeDays = openWeek?.entries.filter((day) => dayTotal(day) > 0).length ?? 0;
  const recordWeek = weeks
    .filter((week) => week.id !== openWeek?.id)
    .reduce<WeekRecord | null>((best, week) => (!best || weekTotal(week) > weekTotal(best) ? week : best), null);
  const recordTotal = recordWeek ? weekTotal(recordWeek) : 0;
  const pctOfRecord = recordTotal > 0 ? currentTotal / recordTotal : 0;

  let identity = primaryArchetype?.name ?? "Momentum Builder";
  let subtitle = primaryArchetype?.reason ?? "Your tracked history is becoming a professional signature.";
  let tone: CareerTitle["tone"] = "steady";

  if (level.currentLevel === "Streex Legend") {
    identity = primaryArchetype?.name ? `Legendary ${primaryArchetype.name}` : "Career Legend";
    subtitle = "Your history has crossed into legacy territory.";
    tone = "legend";
  } else if (pctOfRecord >= 0.85 && recordTotal > 0) {
    identity = "Record Hunter";
    subtitle = "Your previous best is close enough to feel in the room.";
    tone = "record";
  } else if (currentGoal > 0 && currentTotal >= currentGoal) {
    identity = "Goal Closer";
    subtitle = "This week already reached the standard you set.";
    tone = "momentum";
  } else if (activeDays >= 5) {
    identity = "Week Builder";
    subtitle = "A strong working rhythm is shaping this chapter.";
    tone = "momentum";
  }

  return {
    title: `${level.currentLevel} - ${identity}`,
    subtitle,
    tone,
  };
}

export function buildDriverIdentitySummary(
  weeks: WeekRecord[],
  openWeek: WeekRecord | null,
  xpEvents: StoredXpEvent[],
  date = localDateString(),
): DriverIdentitySummary {
  const totalXp = xpEvents.reduce((sum, event) => sum + event.xpAmount, 0);
  const consistencyXp = xpEvents
    .filter((event) => event.xpCategory === "consistency")
    .reduce((sum, event) => sum + event.xpAmount, 0);
  const performanceXp = xpEvents
    .filter((event) => event.xpCategory === "performance")
    .reduce((sum, event) => sum + event.xpAmount, 0);
  const level = getLevelProgress(totalXp);
  const archetypes = calculateArchetypes(weeks);

  return {
    totalXp,
    consistencyXp,
    performanceXp,
    level,
    careerTitle: getCareerTitle(weeks, openWeek, level, archetypes.primary, archetypes.locked),
    primaryArchetype: archetypes.primary,
    secondaryArchetypes: archetypes.secondary,
    archetypeLocked: archetypes.locked,
    historicalRanking: getHistoricalDayRanking(weeks, openWeek, getActiveRankingDate(openWeek, date)),
    rival: getRivalSnippet(weeks, openWeek),
    idealWeek: getIdealWeekComparison(weeks, openWeek),
    adaptivePace: getAdaptivePace(openWeek),
    dayOffCopy: getDayOffCopy(openWeek),
  };
}
