import { appBonusTotal } from "./rewardIncome";
import { dayTotal, weekTotal } from "./store";
import { DAY_NAMES, type WeekRecord } from "./types";

export interface CareerMonthRecord {
  key: string;
  label: string;
  total: number;
  activeDays: number;
  isCurrent: boolean;
}

export interface CareerDayRecord {
  date: string;
  dayName: string;
  total: number;
}

export interface CareerWeekRecord {
  id: string;
  startDate: string;
  endDate: string;
  total: number;
  activeDays: number;
}

export interface CareerAppRecord {
  app: string;
  total: number;
  share: number;
  activeDays: number;
  currentMonthTotal: number;
  previousMonthTotal: number;
}

export interface CareerWeekdayRecord {
  dayName: string;
  total: number;
  average: number;
  count: number;
}

export interface CareerDrillDownData {
  monthly: {
    currentKey: string;
    currentLabel: string;
    currentTotal: number;
    previousKey: string;
    previousLabel: string;
    previousTotal: number;
    previousSamePointTotal: number;
    bestHistoricalLabel: string;
    bestHistoricalTotal: number;
    provisionalRank: number | null;
    rankedMonths: number;
    gapToBest: number | null;
    gapToTop3: number | null;
    gapToTop5: number | null;
    topMonths: CareerMonthRecord[];
  };
  rankedDays: number;
  rankedWeeks: number;
  topDays: CareerDayRecord[];
  topWeeks: CareerWeekRecord[];
  apps: CareerAppRecord[];
  weekdays: CareerWeekdayRecord[];
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, (month || 1) - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function appNames(weeks: WeekRecord[]): string[] {
  return Array.from(new Set(weeks.flatMap((week) => week.entries.flatMap((day) => [
    ...Object.keys(day.apps ?? {}),
    ...(day.bonuses ?? []).map((bonus) => bonus.app),
  ]))))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

function dayAppTotal(day: WeekRecord["entries"][number], app: string): number {
  return roundMoney((Number(day.apps?.[app]) || 0) + appBonusTotal(day, app));
}

function gapToRank(historicalTotals: number[], currentTotal: number, rank: number): number | null {
  if (currentTotal <= 0) return null;
  const currentRank = historicalTotals.filter((total) => total > currentTotal).length + 1;
  if (historicalTotals.length + 1 <= rank || currentRank <= rank) return 0;
  const target = historicalTotals[rank - 1];
  return roundMoney(target - currentTotal + 0.01);
}

export function buildCareerDrillDownData(
  weeks: WeekRecord[],
  now = new Date(),
): CareerDrillDownData {
  const currentKey = monthKey(now);
  const previousDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousKey = monthKey(previousDate);
  const currentDayOfMonth = now.getDate();
  const days = weeks.flatMap((week) => week.entries);

  const monthMap = new Map<string, { total: number; activeDays: number }>();
  for (const day of days) {
    const key = day.date.slice(0, 7);
    const total = dayTotal(day);
    const bucket = monthMap.get(key) ?? { total: 0, activeDays: 0 };
    bucket.total += total;
    if (total > 0) bucket.activeDays += 1;
    monthMap.set(key, bucket);
  }

  const monthRecords = [...monthMap.entries()]
    .map(([key, value]) => ({
      key,
      label: monthLabel(key),
      total: roundMoney(value.total),
      activeDays: value.activeDays,
      isCurrent: key === currentKey,
    }))
    .filter((month) => month.total > 0);

  const rankedMonths = [...monthRecords].sort((a, b) => b.total - a.total || a.key.localeCompare(b.key));
  const historicalMonths = rankedMonths.filter((month) => !month.isCurrent);
  const historicalTotals = historicalMonths.map((month) => month.total);
  const currentTotal = roundMoney(monthMap.get(currentKey)?.total ?? 0);
  const previousTotal = roundMoney(monthMap.get(previousKey)?.total ?? 0);
  const previousSamePointTotal = roundMoney(days
    .filter((day) => day.date.startsWith(`${previousKey}-`))
    .filter((day) => Number(day.date.slice(8, 10)) <= currentDayOfMonth)
    .reduce((sum, day) => sum + dayTotal(day), 0));
  const currentRankIndex = rankedMonths.findIndex((month) => month.key === currentKey);
  const bestHistorical = historicalMonths[0];

  const rankedDays = days
    .map((day) => ({ date: day.date, dayName: day.dayName, total: roundMoney(dayTotal(day)) }))
    .filter((day) => day.total > 0)
    .sort((a, b) => b.total - a.total || a.date.localeCompare(b.date));
  const topDays = rankedDays.slice(0, 5);

  const rankedWeeks = weeks
    .map((week) => ({
      id: week.id,
      startDate: week.startDate,
      endDate: week.endDate,
      total: roundMoney(weekTotal(week)),
      activeDays: week.entries.filter((day) => dayTotal(day) > 0).length,
    }))
    .filter((week) => week.total > 0)
    .sort((a, b) => b.total - a.total || a.startDate.localeCompare(b.startDate));
  const topWeeks = rankedWeeks.slice(0, 5);

  const lifetimeTotal = roundMoney(days.reduce((sum, day) => sum + dayTotal(day), 0));
  const apps = appNames(weeks)
    .map((app) => {
      let total = 0;
      let activeDays = 0;
      let currentMonthTotal = 0;
      let previousMonthTotal = 0;
      for (const day of days) {
        const amount = dayAppTotal(day, app);
        total += amount;
        if (amount > 0) activeDays += 1;
        if (day.date.startsWith(`${currentKey}-`)) currentMonthTotal += amount;
        if (day.date.startsWith(`${previousKey}-`)) previousMonthTotal += amount;
      }
      return {
        app,
        total: roundMoney(total),
        share: lifetimeTotal > 0 ? roundMoney((total / lifetimeTotal) * 100) : 0,
        activeDays,
        currentMonthTotal: roundMoney(currentMonthTotal),
        previousMonthTotal: roundMoney(previousMonthTotal),
      };
    })
    .filter((app) => app.total > 0)
    .sort((a, b) => b.total - a.total || a.app.localeCompare(b.app));

  const weekdays = DAY_NAMES.map((dayName) => {
    const matching = days.filter((day) => day.dayName === dayName && dayTotal(day) > 0);
    const total = roundMoney(matching.reduce((sum, day) => sum + dayTotal(day), 0));
    return {
      dayName,
      total,
      average: matching.length ? roundMoney(total / matching.length) : 0,
      count: matching.length,
    };
  })
    .filter((weekday) => weekday.count > 0)
    .sort((a, b) => b.average - a.average || DAY_NAMES.indexOf(a.dayName as typeof DAY_NAMES[number]) - DAY_NAMES.indexOf(b.dayName as typeof DAY_NAMES[number]));

  return {
    monthly: {
      currentKey,
      currentLabel: monthLabel(currentKey),
      currentTotal,
      previousKey,
      previousLabel: monthLabel(previousKey),
      previousTotal,
      previousSamePointTotal,
      bestHistoricalLabel: bestHistorical?.label ?? "—",
      bestHistoricalTotal: bestHistorical?.total ?? 0,
      provisionalRank: currentTotal > 0 && currentRankIndex >= 0 ? currentRankIndex + 1 : null,
      rankedMonths: rankedMonths.length,
      gapToBest: bestHistorical
        ? Math.max(0, roundMoney(bestHistorical.total - currentTotal))
        : null,
      gapToTop3: gapToRank(historicalTotals, currentTotal, 3),
      gapToTop5: gapToRank(historicalTotals, currentTotal, 5),
      topMonths: rankedMonths.slice(0, 5),
    },
    rankedDays: rankedDays.length,
    rankedWeeks: rankedWeeks.length,
    topDays,
    topWeeks,
    apps,
    weekdays,
  };
}
