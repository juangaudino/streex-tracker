import type { DayEntry, WeekRecord } from "./types";
import { dayTotal } from "./store";

export interface WeeklyComparisonPoint {
  dayIndex: number;
  day: string;
  isTracked: boolean;
  isFuture: boolean;
  current: number | null;
  reference: number;
  dailyDiff: number | null;
  currentCumulative: number | null;
  projectedCumulative: number | null;
  referenceCumulative: number;
  cumulativeDiff: number | null;
}

export interface WeeklyReferenceWeek {
  week: WeekRecord;
  sampleCounts: number[];
  sourceDates: Array<string | null>;
  total: number;
}

function isTrackedHistoricalDay(day: DayEntry): boolean {
  return day.logged !== undefined ? day.logged : dayTotal(day) > 0;
}

function historicalWeeksBefore(weeks: WeekRecord[], currentWeek: WeekRecord): WeekRecord[] {
  return weeks.filter((week) => week.id !== currentWeek.id && week.startDate < currentWeek.startDate);
}

function referenceWeekFromValues(
  currentWeek: WeekRecord,
  id: string,
  values: number[],
  sampleCounts: number[],
  sourceDates: Array<string | null>,
): WeeklyReferenceWeek | null {
  if (!sampleCounts.some((count) => count > 0)) return null;
  const entries: DayEntry[] = currentWeek.entries.map((day, index) => {
    const value = +(values[index] ?? 0).toFixed(2);
    return {
      dayName: day.dayName,
      date: day.date,
      logged: sampleCounts[index] > 0,
      apps: { Reference: value },
    };
  });
  const week: WeekRecord = {
    id,
    startDate: currentWeek.startDate,
    endDate: currentWeek.endDate,
    weeklyGoal: currentWeek.weeklyGoal,
    weeklyHoursGoal: currentWeek.weeklyHoursGoal,
    status: "closed",
    entries,
    createdAt: currentWeek.createdAt,
    updatedAt: currentWeek.updatedAt,
  };
  return { week, sampleCounts, sourceDates, total: week.entries.reduce((sum, day) => sum + dayTotal(day), 0) };
}

export function buildAverageWeekReference(weeks: WeekRecord[], currentWeek: WeekRecord): WeeklyReferenceWeek | null {
  const history = historicalWeeksBefore(weeks, currentWeek);
  const sums = Array.from({ length: currentWeek.entries.length }, () => 0);
  const sampleCounts = Array.from({ length: currentWeek.entries.length }, () => 0);
  const sourceDates = Array.from({ length: currentWeek.entries.length }, () => null as string | null);

  for (const week of history) {
    week.entries.forEach((day, index) => {
      if (!isTrackedHistoricalDay(day)) return;
      sums[index] += dayTotal(day);
      sampleCounts[index] += 1;
    });
  }

  const values = sums.map((sum, index) => sampleCounts[index] ? sum / sampleCounts[index] : 0);
  return referenceWeekFromValues(currentWeek, "reference_average_week", values, sampleCounts, sourceDates);
}

export function buildIdealWeekReference(weeks: WeekRecord[], currentWeek: WeekRecord): WeeklyReferenceWeek | null {
  const history = historicalWeeksBefore(weeks, currentWeek);
  const values = Array.from({ length: currentWeek.entries.length }, () => 0);
  const sampleCounts = Array.from({ length: currentWeek.entries.length }, () => 0);
  const sourceDates = Array.from({ length: currentWeek.entries.length }, () => null as string | null);

  for (const week of history) {
    week.entries.forEach((day, index) => {
      if (!isTrackedHistoricalDay(day)) return;
      const total = dayTotal(day);
      sampleCounts[index] += 1;
      if (total > values[index]) {
        values[index] = total;
        sourceDates[index] = day.date;
      }
    });
  }

  return referenceWeekFromValues(currentWeek, "reference_ideal_week", values, sampleCounts, sourceDates);
}

export function buildWeeklyComparisonPoints(
  currentWeek: WeekRecord,
  referenceWeek: WeekRecord,
  comparableDayIndices: number[],
): WeeklyComparisonPoint[] {
  const comparableDays = new Set(comparableDayIndices);
  const lastTrackedDay = comparableDayIndices.length ? Math.max(...comparableDayIndices) : -1;
  const trackedDayCount = comparableDayIndices.length;
  const trackedTotal = comparableDayIndices.reduce((sum, dayIndex) => {
    const day = currentWeek.entries[dayIndex];
    return day ? sum + dayTotal(day) : sum;
  }, 0);
  const trackedDayAverage = trackedDayCount ? trackedTotal / trackedDayCount : 0;
  let currentCumulative = 0;
  let referenceCumulative = 0;
  let comparableReferenceCumulative = 0;

  return currentWeek.entries.flatMap((currentDay, dayIndex) => {
    const referenceDay = referenceWeek.entries[dayIndex];
    if (!referenceDay) return [];

    const isTracked = comparableDays.has(dayIndex);
    const isFuture = dayIndex > lastTrackedDay;
    const current = isTracked ? dayTotal(currentDay) : null;
    const reference = dayTotal(referenceDay);
    referenceCumulative += reference;

    if (isTracked && current !== null) {
      currentCumulative += current;
      comparableReferenceCumulative += reference;
    }

    const projectedCumulative = trackedDayCount === 0
      ? null
      : dayIndex === lastTrackedDay
        ? currentCumulative
        : isFuture
          ? trackedTotal + trackedDayAverage * (dayIndex - lastTrackedDay)
          : null;

    return [{
      dayIndex,
      day: currentDay.dayName.slice(0, 3),
      isTracked,
      isFuture,
      current,
      reference,
      dailyDiff: current === null ? null : current - reference,
      currentCumulative: isTracked ? currentCumulative : null,
      projectedCumulative,
      referenceCumulative,
      cumulativeDiff: isTracked ? currentCumulative - comparableReferenceCumulative : null,
    }];
  });
}
