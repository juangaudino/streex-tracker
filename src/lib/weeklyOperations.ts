import { dayTotal } from "@/lib/store";
import type { WeekRecord } from "@/lib/types";

export interface ActiveDayAverageComparison {
  currentAverage: number | null;
  historicalAverage: number | null;
  percentDifference: number | null;
  currentActiveDays: number;
  historicalActiveDays: number;
}

export function buildActiveDayAverageComparison(
  currentWeeks: WeekRecord[],
  historicalWeeks: WeekRecord[],
): ActiveDayAverageComparison {
  const currentIds = new Set(currentWeeks.map((week) => week.id));
  const currentDays = currentWeeks.flatMap((week) => week.entries).filter((day) => dayTotal(day) > 0);
  const historicalDays = historicalWeeks
    .filter((week) => !currentIds.has(week.id))
    .flatMap((week) => week.entries)
    .filter((day) => dayTotal(day) > 0);
  const currentAverage = currentDays.length
    ? currentDays.reduce((sum, day) => sum + dayTotal(day), 0) / currentDays.length
    : null;
  const historicalAverage = historicalDays.length
    ? historicalDays.reduce((sum, day) => sum + dayTotal(day), 0) / historicalDays.length
    : null;

  return {
    currentAverage,
    historicalAverage,
    percentDifference: currentAverage !== null && historicalAverage
      ? ((currentAverage / historicalAverage) - 1) * 100
      : null,
    currentActiveDays: currentDays.length,
    historicalActiveDays: historicalDays.length,
  };
}
