import type { DayEntry, WeekRecord } from "./types";

const REWARD_APP_NAMES = new Set(["octopus"]);

export function isRewardApp(app: string): boolean {
  return REWARD_APP_NAMES.has(app.trim().toLowerCase());
}

export function operationalDayTotal(day: DayEntry): number {
  return Object.entries(day.apps ?? {}).reduce((sum, [app, value]) => {
    if (isRewardApp(app)) return sum;
    return sum + (Number(value) || 0);
  }, 0);
}

export function rewardDayTotal(day: DayEntry): number {
  return Object.entries(day.apps ?? {}).reduce((sum, [app, value]) => {
    if (!isRewardApp(app)) return sum;
    return sum + (Number(value) || 0);
  }, 0);
}

export function operationalWeekTotal(week: WeekRecord): number {
  return week.entries.reduce((sum, day) => sum + operationalDayTotal(day), 0);
}
