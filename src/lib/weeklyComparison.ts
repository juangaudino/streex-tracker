import type { WeekRecord } from "./types";
import { dayTotal } from "./store";

export interface WeeklyComparisonPoint {
  dayIndex: number;
  day: string;
  current: number;
  reference: number;
  dailyDiff: number;
  currentCumulative: number;
  referenceCumulative: number;
  cumulativeDiff: number;
}

export function buildWeeklyComparisonPoints(
  currentWeek: WeekRecord,
  referenceWeek: WeekRecord,
  comparableDayIndices: number[],
): WeeklyComparisonPoint[] {
  let currentCumulative = 0;
  let referenceCumulative = 0;

  return [...comparableDayIndices]
    .sort((a, b) => a - b)
    .flatMap((dayIndex) => {
      const currentDay = currentWeek.entries[dayIndex];
      const referenceDay = referenceWeek.entries[dayIndex];
      if (!currentDay || !referenceDay) return [];

      const current = dayTotal(currentDay);
      const reference = dayTotal(referenceDay);
      currentCumulative += current;
      referenceCumulative += reference;

      return [{
        dayIndex,
        day: currentDay.dayName.slice(0, 3),
        current,
        reference,
        dailyDiff: current - reference,
        currentCumulative,
        referenceCumulative,
        cumulativeDiff: currentCumulative - referenceCumulative,
      }];
    });
}
