import { WeekRecord, AppSettings, DEFAULT_APPS, DAY_NAMES, DayEntry } from "./types";
import { formatCurrencyAmount } from "./currency";
import { appBonusTotal, rewardDayTotal, standardDayEarnings } from "./rewardIncome";

const WEEKS_KEY = "streex_weeks";
const SETTINGS_KEY = "streex_settings";

export function getSettings(): AppSettings {
  const raw = localStorage.getItem(SETTINGS_KEY);
  if (raw) return JSON.parse(raw);
  return {
    defaultWeeklyGoal: 1200,
    defaultWeeklyHoursGoal: 0,
    currencySymbol: "$",
    activeApps: [...DEFAULT_APPS],
  };
}

export function saveSettings(s: AppSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

export function getWeeks(): WeekRecord[] {
  const raw = localStorage.getItem(WEEKS_KEY);
  if (raw) return JSON.parse(raw);
  return [];
}

export function saveWeeks(weeks: WeekRecord[]) {
  localStorage.setItem(WEEKS_KEY, JSON.stringify(weeks));
}

export function getMondayOfWeek(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function createWeek(
  startDate: Date,
  goal: number,
  apps: string[],
  hoursGoal = 0
): WeekRecord {
  const entries: DayEntry[] = DAY_NAMES.map((dayName, i) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const appsObj: Record<string, number> = {};
    apps.forEach((a) => (appsObj[a] = 0));
    return { dayName, date: formatDate(d), apps: appsObj };
  });
  const now = new Date().toISOString();
  const end = new Date(startDate);
  end.setDate(end.getDate() + 6);
  return {
    id: "week_" + Date.now(),
    startDate: formatDate(startDate),
    endDate: formatDate(end),
    weeklyGoal: goal,
    weeklyHoursGoal: hoursGoal,
    status: "open",
    entries,
    createdAt: now,
    updatedAt: now,
  };
}

export function weekTotal(w: WeekRecord): number {
  return w.entries.reduce((sum, day) => sum + dayTotal(day), 0);
}

export function dayTotal(day: DayEntry): number {
  return standardDayEarnings(day) + rewardDayTotal(day);
}

export function appTotal(w: WeekRecord, app: string): number {
  return w.entries.reduce((s, d) => s + (d.apps[app] || 0) + appBonusTotal(d, app), 0);
}

export function bestDay(w: WeekRecord): { dayName: string; total: number } {
  let best = { dayName: "—", total: 0 };
  w.entries.forEach((d) => {
    const t = dayTotal(d);
    if (t > best.total) best = { dayName: d.dayName, total: t };
  });
  return best;
}

export function bestApp(w: WeekRecord): { app: string; total: number } {
  const apps = Object.keys(w.entries[0]?.apps || {});
  let best = { app: "—", total: 0 };
  apps.forEach((a) => {
    const t = appTotal(w, a);
    if (t > best.total) best = { app: a, total: t };
  });
  return best;
}

export function getActiveEnteredDays(w: WeekRecord): number[] {
  const indices: number[] = [];
  w.entries.forEach((d, i) => {
    if (dayTotal(d) > 0) indices.push(i);
  });
  return indices;
}

export function getLoggedDays(w: WeekRecord): number[] {
  const indices: number[] = [];
  w.entries.forEach((d, i) => {
    // Backward compat: if logged is undefined, infer from dayTotal > 0
    const isLogged = d.logged !== undefined ? d.logged : dayTotal(d) > 0;
    if (isLogged) indices.push(i);
  });
  return indices;
}

export function samePointTotal(w: WeekRecord, dayIndices: number[]): number {
  return dayIndices.reduce((s, i) => {
    if (w.entries[i]) return s + dayTotal(w.entries[i]);
    return s;
  }, 0);
}

export function samePointAppTotal(
  w: WeekRecord,
  app: string,
  dayIndices: number[]
): number {
  return dayIndices.reduce((s, i) => {
    if (w.entries[i]) return s + (w.entries[i].apps[app] || 0) + appBonusTotal(w.entries[i], app);
    return s;
  }, 0);
}

export function getPreviousWeek(
  weeks: WeekRecord[],
  current: WeekRecord
): WeekRecord | null {
  const saved = weeks
    .filter((w) => w.id !== current.id && w.startDate < current.startDate)
    .sort((a, b) => b.startDate.localeCompare(a.startDate));
  return saved[0] || null;
}

export function getRecordWeek(
  weeks: WeekRecord[],
  current: WeekRecord
): WeekRecord | null {
  const saved = weeks.filter((w) => w.id !== current.id);
  if (!saved.length) return null;
  return saved.reduce((best, w) =>
    weekTotal(w) > weekTotal(best) ? w : best
  );
}

export function formatCurrency(val: number, symbol: string = "$"): string {
  return formatCurrencyAmount(val, symbol);
}
