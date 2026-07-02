import type { WeekRecord } from "./types";
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
