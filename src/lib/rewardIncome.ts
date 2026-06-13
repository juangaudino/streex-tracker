import type { BonusEntry, DayEntry, WeekRecord } from "./types";

const REWARD_APP_NAMES = new Set(["octopus"]);
const LEGACY_BONUS_PREFIX = "bonus_legacy_octopus";

export function isRewardApp(app: string): boolean {
  return REWARD_APP_NAMES.has(app.trim().toLowerCase());
}

function money(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function bonusDayTotal(day: DayEntry): number {
  return (day.bonuses ?? []).reduce((sum, bonus) => sum + Math.max(0, money(bonus.amount)), 0);
}

export function appBonusTotal(day: DayEntry, app: string): number {
  const target = app.trim().toLowerCase();
  return (day.bonuses ?? []).reduce((sum, bonus) => {
    return bonus.app.trim().toLowerCase() === target ? sum + Math.max(0, money(bonus.amount)) : sum;
  }, 0);
}

export function appOperationalTotal(day: DayEntry, app: string): number {
  if (isRewardApp(app)) return 0;
  return Math.max(0, money(day.apps?.[app]));
}

export function normalizeLegacyBonusDay(day: DayEntry): DayEntry {
  const bonuses = [...(day.bonuses ?? [])];
  const apps = { ...(day.apps ?? {}) };
  let changed = false;

  for (const [app, value] of Object.entries(apps)) {
    const amount = Math.max(0, money(value));
    if (!isRewardApp(app) || amount <= 0) continue;

    const legacyId = `${LEGACY_BONUS_PREFIX}_${day.date}_${app.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
    if (!bonuses.some((bonus) => bonus.id === legacyId)) {
      bonuses.push({
        id: legacyId,
        app,
        amount,
        source: "legacy_octopus",
      } satisfies BonusEntry);
    }
    apps[app] = 0;
    changed = true;
  }

  if (!changed && bonuses.length === (day.bonuses ?? []).length) return day;
  return { ...day, apps, bonuses };
}

export function normalizeLegacyBonusWeek(week: WeekRecord): WeekRecord {
  return { ...week, entries: week.entries.map(normalizeLegacyBonusDay) };
}

export function standardDayEarnings(day: DayEntry): number {
  return Object.entries(day.apps ?? {}).reduce((sum, [app, value]) => {
    if (isRewardApp(app)) return sum;
    return sum + Math.max(0, money(value));
  }, 0);
}

export function operationalDayTotal(day: DayEntry): number {
  return standardDayEarnings(day);
}

export function rewardDayTotal(day: DayEntry): number {
  const legacyRewardApps = Object.entries(day.apps ?? {}).reduce((sum, [app, value]) => {
    if (!isRewardApp(app)) return sum;
    return sum + Math.max(0, money(value));
  }, 0);
  return legacyRewardApps + bonusDayTotal(day);
}

export function operationalWeekTotal(week: WeekRecord): number {
  return week.entries.reduce((sum, day) => sum + operationalDayTotal(day), 0);
}
