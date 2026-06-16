import { appBonusTotal, operationalDayTotal } from "./rewardIncome";
import { dayTotal, formatCurrency } from "./store";
import {
  activeShiftDurationHours,
  getDayMiles,
  getDayRideCount,
  getDayShiftHours,
  resolveShiftRate,
  shiftDurationHours,
} from "./shiftIntelligence";
import type { DayEntry, EarningsSnapshot, ShiftSession, WeekRecord } from "./types";

export type DeepInsightsTimePreset =
  | "all"
  | "this-week"
  | "last-7-days"
  | "last-30-days"
  | "last-3-months"
  | "last-6-months"
  | "this-year"
  | "last-12-months";

export interface DeepInsightsFilters {
  timePreset: DeepInsightsTimePreset;
  app: string;
  weekday: string;
}

export interface DeepInsightsDay {
  date: string;
  label: string;
  dayName: string;
  weekId: string;
  weekStartDate: string;
  earnings: number;
  operationalEarnings: number;
  hours: number;
  miles: number;
  rides: number;
  shifts: number;
}

export interface DeepInsightsWeek {
  id: string;
  startDate: string;
  endDate: string;
  label: string;
  earnings: number;
  hours: number;
  miles: number;
  rides: number;
  shifts: number;
  earningsPerHour: number | null;
  earningsPerMile: number | null;
}

export interface DeepInsightsShift {
  id: string;
  date: string;
  dayName: string;
  label: string;
  earnings: number;
  hours: number;
  rate: number;
  source: string;
  miles: number;
  rides: number;
}

export interface DeepInsightsAppBreakdown {
  app: string;
  earnings: number;
  days: number;
  share: number;
}

export interface DeepInsightsData {
  appOptions: string[];
  weekdayOptions: string[];
  rangeLabel: string;
  appFilterActive: boolean;
  totals: {
    earnings: number;
    operationalEarnings: number;
    hours: number;
    miles: number;
    rides: number;
    shifts: number;
    activeDays: number;
    earningsPerHour: number | null;
    earningsPerMile: number | null;
    bestDay: DeepInsightsDay | null;
    bestWeek: DeepInsightsWeek | null;
  };
  days: DeepInsightsDay[];
  weeks: DeepInsightsWeek[];
  weekdayEarnings: Array<{ dayName: string; earnings: number; average: number; count: number }>;
  appBreakdown: DeepInsightsAppBreakdown[];
  topDays: DeepInsightsDay[];
  lowDays: DeepInsightsDay[];
  bestWeeks: DeepInsightsWeek[];
  bestShifts: DeepInsightsShift[];
  insights: string[];
}

const DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function money(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return +parsed.toFixed(2);
}

function parseDate(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function startOfWeek(date: Date): Date {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = copy.getDate() - day + (day === 0 ? -6 : 1);
  copy.setDate(diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function dateRangeForPreset(preset: DeepInsightsTimePreset, now = new Date()): { start?: string; end?: string; label: string } {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const end = formatDate(today);

  if (preset === "all") return { label: "All time" };
  if (preset === "this-week") {
    return { start: formatDate(startOfWeek(today)), end, label: "This week" };
  }
  if (preset === "this-year") {
    return { start: `${today.getFullYear()}-01-01`, end, label: "This year" };
  }

  const start = new Date(today);
  const labelByPreset: Record<Exclude<DeepInsightsTimePreset, "all" | "this-week" | "this-year">, string> = {
    "last-7-days": "Last 7 days",
    "last-30-days": "Last 30 days",
    "last-3-months": "Last 3 months",
    "last-6-months": "Last 6 months",
    "last-12-months": "Last 12 months",
  };

  if (preset === "last-7-days") start.setDate(start.getDate() - 6);
  if (preset === "last-30-days") start.setDate(start.getDate() - 29);
  if (preset === "last-3-months") start.setMonth(start.getMonth() - 3);
  if (preset === "last-6-months") start.setMonth(start.getMonth() - 6);
  if (preset === "last-12-months") start.setMonth(start.getMonth() - 12);

  return { start: formatDate(start), end, label: labelByPreset[preset] };
}

function isInRange(date: string, range: { start?: string; end?: string }): boolean {
  if (range.start && date < range.start) return false;
  if (range.end && date > range.end) return false;
  return true;
}

function dayAppEarnings(day: DayEntry, app: string): number {
  return money(day.apps?.[app]) + appBonusTotal(day, app);
}

function allAppNames(weeks: WeekRecord[]): string[] {
  return Array.from(new Set(weeks.flatMap((week) =>
    week.entries.flatMap((day) => [
      ...Object.keys(day.apps ?? {}),
      ...(day.bonuses ?? []).map((bonus) => bonus.app),
    ]),
  ))).filter(Boolean).sort((a, b) => a.localeCompare(b));
}

function compactDateLabel(date: string): string {
  const parsed = parseDate(date);
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function weekLabel(week: Pick<WeekRecord, "startDate" | "endDate">): string {
  return `${compactDateLabel(week.startDate)}-${compactDateLabel(week.endDate)}`;
}

function shiftLabel(shift: ShiftSession): string {
  const start = new Date(shift.startTime);
  const end = shift.endTime ? new Date(shift.endTime) : null;
  const fmt = (date: Date) => date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${fmt(start)} → ${end ? fmt(end) : "active"}`;
}

function buildInsights(data: {
  totals: DeepInsightsData["totals"];
  weekdayEarnings: DeepInsightsData["weekdayEarnings"];
  appBreakdown: DeepInsightsAppBreakdown[];
  rangeLabel: string;
  appFilterActive: boolean;
  sym: string;
}): string[] {
  const insights: string[] = [];
  const strongestWeekday = [...data.weekdayEarnings].sort((a, b) => b.average - a.average)[0];
  const topApp = data.appBreakdown[0];

  if (strongestWeekday && strongestWeekday.average > 0) {
    insights.push(`${strongestWeekday.dayName} is the strongest weekday in this view, averaging ${formatCurrency(strongestWeekday.average, data.sym)}.`);
  }
  if (topApp && topApp.earnings > 0 && !data.appFilterActive) {
    insights.push(`${topApp.app} leads this period with ${Math.round(topApp.share)}% of recorded earnings.`);
  }
  if (data.totals.earningsPerHour) {
    insights.push(`Measured shift time is averaging ${formatCurrency(data.totals.earningsPerHour, data.sym)}/hr for ${data.rangeLabel.toLowerCase()}.`);
  } else if (data.totals.earnings > 0) {
    insights.push("Hourly efficiency is hidden until this filtered view has valid shift duration.");
  }
  if (data.totals.earningsPerMile) {
    insights.push(`Mileage-backed efficiency is ${formatCurrency(data.totals.earningsPerMile, data.sym)}/mi in this view.`);
  }

  return insights.slice(0, 4);
}

export function buildDeepInsightsData(args: {
  weeks: WeekRecord[];
  earningsSnapshots?: EarningsSnapshot[];
  filters: DeepInsightsFilters;
  currencySymbol?: string;
  now?: Date;
}): DeepInsightsData {
  const { weeks, filters, earningsSnapshots = [], currencySymbol = "$", now = new Date() } = args;
  const range = dateRangeForPreset(filters.timePreset, now);
  const appOptions = allAppNames(weeks);
  const selectedApp = filters.app && filters.app !== "all" ? filters.app : null;
  const selectedWeekday = filters.weekday && filters.weekday !== "all" ? filters.weekday : null;

  const days = weeks
    .flatMap((week) => week.entries.map((day) => {
      const earnings = selectedApp ? dayAppEarnings(day, selectedApp) : dayTotal(day);
      const operationalEarnings = selectedApp ? 0 : operationalDayTotal(day);
      return {
        date: day.date,
        label: compactDateLabel(day.date),
        dayName: day.dayName,
        weekId: week.id,
        weekStartDate: week.startDate,
        earnings,
        operationalEarnings,
        hours: selectedApp ? 0 : getDayShiftHours(day),
        miles: selectedApp ? 0 : getDayMiles(day),
        rides: selectedApp ? 0 : getDayRideCount(day),
        shifts: selectedApp ? 0 : (day.shifts ?? []).length,
      } satisfies DeepInsightsDay;
    }))
    .filter((day) => isInRange(day.date, range))
    .filter((day) => !selectedWeekday || day.dayName === selectedWeekday)
    .sort((a, b) => a.date.localeCompare(b.date));

  const weekMap = new Map<string, DeepInsightsWeek>();
  for (const week of weeks) {
    const weekDays = days.filter((day) => day.weekId === week.id);
    if (!weekDays.length) continue;
    const earnings = money(weekDays.reduce((sum, day) => sum + day.earnings, 0));
    const hours = money(weekDays.reduce((sum, day) => sum + day.hours, 0));
    const miles = money(weekDays.reduce((sum, day) => sum + day.miles, 0));
    const rides = weekDays.reduce((sum, day) => sum + day.rides, 0);
    const shifts = weekDays.reduce((sum, day) => sum + day.shifts, 0);
    weekMap.set(week.id, {
      id: week.id,
      startDate: week.startDate,
      endDate: week.endDate,
      label: weekLabel(week),
      earnings,
      hours,
      miles,
      rides,
      shifts,
      earningsPerHour: hours > 0 ? money(weekDays.reduce((sum, day) => sum + day.operationalEarnings, 0) / hours) : null,
      earningsPerMile: miles > 0 ? money(earnings / miles) : null,
    });
  }
  const weekRows = [...weekMap.values()].sort((a, b) => a.startDate.localeCompare(b.startDate));

  const activeDays = days.filter((day) => day.earnings > 0);
  const totalEarnings = money(days.reduce((sum, day) => sum + day.earnings, 0));
  const totalOperationalEarnings = money(days.reduce((sum, day) => sum + day.operationalEarnings, 0));
  const totalHours = money(days.reduce((sum, day) => sum + day.hours, 0));
  const totalMiles = money(days.reduce((sum, day) => sum + day.miles, 0));
  const totalRides = days.reduce((sum, day) => sum + day.rides, 0);
  const totalShifts = days.reduce((sum, day) => sum + day.shifts, 0);

  const weekdayEarnings = DAY_ORDER.map((dayName) => {
    const matching = activeDays.filter((day) => day.dayName === dayName);
    const earnings = money(matching.reduce((sum, day) => sum + day.earnings, 0));
    return {
      dayName,
      earnings,
      average: matching.length ? money(earnings / matching.length) : 0,
      count: matching.length,
    };
  });

  const appBreakdown = (selectedApp ? [selectedApp] : appOptions).map((app) => {
    const earnings = money(weeks.reduce((weekSum, week) => {
      return weekSum + week.entries
        .filter((day) => isInRange(day.date, range))
        .filter((day) => !selectedWeekday || day.dayName === selectedWeekday)
        .reduce((daySum, day) => daySum + dayAppEarnings(day, app), 0);
    }, 0));
    const appDays = weeks.flatMap((week) => week.entries)
      .filter((day) => isInRange(day.date, range))
      .filter((day) => !selectedWeekday || day.dayName === selectedWeekday)
      .filter((day) => dayAppEarnings(day, app) > 0).length;
    return {
      app,
      earnings,
      days: appDays,
      share: totalEarnings > 0 ? (earnings / totalEarnings) * 100 : 0,
    };
  }).filter((app) => app.earnings > 0).sort((a, b) => b.earnings - a.earnings);

  const bestShifts: DeepInsightsShift[] = [];
  if (!selectedApp) {
    for (const week of weeks) {
      for (const day of week.entries) {
        if (!isInRange(day.date, range) || (selectedWeekday && day.dayName !== selectedWeekday)) continue;
        for (const shift of day.shifts ?? []) {
          const hours = shift.endTime ? shiftDurationHours(shift) : activeShiftDurationHours(shift, now);
          const rate = resolveShiftRate(day, shift, earningsSnapshots);
          if (!rate.rate || !rate.earnings || hours <= 0) continue;
          bestShifts.push({
            id: shift.id,
            date: day.date,
            dayName: day.dayName,
            label: shiftLabel(shift),
            earnings: rate.earnings,
            hours,
            rate: rate.rate,
            source: rate.source,
            miles: Number(shift.miles) || 0,
            rides: Math.max(0, Math.trunc(Number(shift.rideCount) || 0)),
          });
        }
      }
    }
  }

  const totals = {
    earnings: totalEarnings,
    operationalEarnings: totalOperationalEarnings,
    hours: totalHours,
    miles: totalMiles,
    rides: totalRides,
    shifts: totalShifts,
    activeDays: activeDays.length,
    earningsPerHour: !selectedApp && totalHours > 0 ? money(totalOperationalEarnings / totalHours) : null,
    earningsPerMile: !selectedApp && totalMiles > 0 ? money(totalEarnings / totalMiles) : null,
    bestDay: activeDays.length ? [...activeDays].sort((a, b) => b.earnings - a.earnings)[0] : null,
    bestWeek: weekRows.length ? [...weekRows].sort((a, b) => b.earnings - a.earnings)[0] : null,
  };

  return {
    appOptions,
    weekdayOptions: DAY_ORDER,
    rangeLabel: range.label,
    appFilterActive: Boolean(selectedApp),
    totals,
    days,
    weeks: weekRows,
    weekdayEarnings,
    appBreakdown,
    topDays: [...activeDays].sort((a, b) => b.earnings - a.earnings || a.date.localeCompare(b.date)).slice(0, 8),
    lowDays: [...activeDays].sort((a, b) => a.earnings - b.earnings || a.date.localeCompare(b.date)).slice(0, 8),
    bestWeeks: [...weekRows].sort((a, b) => b.earnings - a.earnings || a.startDate.localeCompare(b.startDate)).slice(0, 8),
    bestShifts: bestShifts.sort((a, b) => b.rate - a.rate || b.earnings - a.earnings).slice(0, 8),
    insights: buildInsights({
      totals,
      weekdayEarnings,
      appBreakdown,
      rangeLabel: range.label,
      appFilterActive: Boolean(selectedApp),
      sym: currencySymbol,
    }),
  };
}
