import type { WeekRecord, DayEntry } from "./types";
import { dayTotal } from "./store";
import { appBonusTotal } from "./rewardIncome";

export interface MonthDayCell {
  date: string;
  dayName: string;
  total: number;
  logged: boolean;
  worked: boolean; // total > 0
  tier: "off" | "low" | "solid" | "strong" | "top" | "legendary";
  isAllTimeBest: boolean;
}

export interface MonthAppBreakdown {
  app: string;
  total: number;
  pct: number;
  prevTotal: number;
  growthPct: number | null; // vs prev month, null if no prior
  topDays: number; // count of "top 20%" days where this app led
}

export interface MonthSummary {
  /** YYYY-MM */
  key: string;
  year: number;
  month: number; // 0-indexed
  monthName: string;
  monthLabel: string; // "May 2026"
  nextMonthName: string;

  totalEarned: number;
  daysWorked: number;
  daysOff: number;
  legendaryDays: number;
  bestDay: { total: number; date: string; dayName: string };
  longestStreak: number;

  /** Strongest week within the month (weeks counted by their startDate's month). */
  strongestWeek: {
    weekId: string;
    startDate: string;
    endDate: string;
    total: number;
    activeDays: number;
    bestApp: { app: string; total: number };
    isBestEver: boolean;
    weekLabel: string; // "Week 2"
  } | null;

  apps: MonthAppBreakdown[];

  /** Calendar grid — full Mon-Sun weeks covering the month. */
  heatmap: MonthDayCell[]; // length = 7 * weeksShown
  weeksShown: number;

  /** Goal context */
  goalSum: number; // sum of weekly goals for weeks counted
  goalHits: number; // number of weeks that reached goal

  // Comparative
  prevMonth: { key: string; total: number; daysWorked: number } | null;
  isBestMonthEver: boolean;
  growthStreak: number; // consecutive months of growth ending with this month
  highestSingleDayEver: boolean; // bestDay is also lifetime best
  slowStartStrongFinish: boolean;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function monthKeyFromDate(dateStr: string): string {
  return dateStr.slice(0, 7); // YYYY-MM
}

function monthNameOf(month: number): string {
  return [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ][month];
}

/** Distinct months that have any logged or worked day, sorted ascending. */
export function listMonthsWithData(weeks: WeekRecord[]): string[] {
  const set = new Set<string>();
  for (const w of weeks) {
    for (const d of w.entries) {
      const isLogged = d.logged !== undefined ? d.logged : dayTotal(d) > 0;
      if (isLogged || dayTotal(d) > 0) set.add(monthKeyFromDate(d.date));
    }
  }
  return [...set].sort();
}

/** All days across all weeks for a given month (calendar month, by date). */
function daysInMonth(weeks: WeekRecord[], year: number, month: number): DayEntry[] {
  const key = `${year}-${pad(month + 1)}`;
  const map = new Map<string, DayEntry>();
  for (const w of weeks) {
    for (const d of w.entries) {
      if (d.date.startsWith(key)) {
        // Last write wins (in case of duplicates)
        map.set(d.date, d);
      }
    }
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** Weeks whose startDate falls in the given month (used for "strongest week" + goal counts). */
function weeksInMonth(weeks: WeekRecord[], year: number, month: number): WeekRecord[] {
  const key = `${year}-${pad(month + 1)}`;
  return weeks.filter((w) => w.startDate.startsWith(key));
}

function totalOf(days: DayEntry[]): number {
  return days.reduce((s, d) => s + dayTotal(d), 0);
}

export function getMonthSummary(
  weeks: WeekRecord[],
  year: number,
  month: number,
): MonthSummary {
  const monthDays = daysInMonth(weeks, year, month);
  const wMonth = weeksInMonth(weeks, year, month);
  const totalEarned = totalOf(monthDays);
  const workedDays = monthDays.filter((d) => dayTotal(d) > 0);
  const daysWorked = workedDays.length;
  const monthDate = new Date(year, month, 1);

  // Best day in month
  let bestDay = { total: 0, date: "", dayName: "—" };
  for (const d of monthDays) {
    const t = dayTotal(d);
    if (t > bestDay.total) bestDay = { total: t, date: d.date, dayName: d.dayName };
  }

  // Lifetime best day for cross-checks
  let lifetimeBestDay = { total: 0, date: "" };
  for (const w of weeks) {
    for (const d of w.entries) {
      const t = dayTotal(d);
      if (t > lifetimeBestDay.total) lifetimeBestDay = { total: t, date: d.date };
    }
  }

  // Longest streak within the month (consecutive worked days)
  let longestStreak = 0;
  let cur = 0;
  let prevDate: Date | null = null;
  for (const d of monthDays) {
    const t = dayTotal(d);
    const dt = new Date(d.date);
    if (t > 0) {
      if (prevDate && (dt.getTime() - prevDate.getTime()) / 86400000 === 1) {
        cur++;
      } else {
        cur = 1;
      }
      longestStreak = Math.max(longestStreak, cur);
      prevDate = dt;
    } else {
      cur = 0;
      prevDate = dt;
    }
  }

  // Strongest week (by total) — weeks anchored in this month
  let strongestWeek: MonthSummary["strongestWeek"] = null;
  if (wMonth.length > 0) {
    let best: WeekRecord | null = null;
    let bestTotal = -1;
    for (const w of wMonth) {
      const t = w.entries.reduce((s, d) => s + dayTotal(d), 0);
      if (t > bestTotal) { bestTotal = t; best = w; }
    }
    if (best && bestTotal > 0) {
      const apps = Object.keys(best.entries[0]?.apps || {});
      let bestApp = { app: "—", total: 0 };
      for (const a of apps) {
        const t = best.entries.reduce((s, d) => s + (d.apps[a] || 0), 0);
        if (t > bestApp.total) bestApp = { app: a, total: t };
      }
      const activeDays = best.entries.filter((d) => dayTotal(d) > 0).length;
      const allWeekTotals = weeks.map((w) => w.entries.reduce((s, d) => s + dayTotal(d), 0));
      const isBestEver = bestTotal >= Math.max(...allWeekTotals, 0);
      const sortedMonthWeeks = [...wMonth].sort((a, b) => a.startDate.localeCompare(b.startDate));
      const idx = sortedMonthWeeks.findIndex((w) => w.id === best!.id);
      strongestWeek = {
        weekId: best.id,
        startDate: best.startDate,
        endDate: best.endDate,
        total: bestTotal,
        activeDays,
        bestApp,
        isBestEver,
        weekLabel: `Week ${idx + 1}`,
      };
    }
  }

  // App breakdown
  const appTotals = new Map<string, number>();
  for (const d of monthDays) {
    for (const [a, v] of Object.entries(d.apps || {})) {
      appTotals.set(a, (appTotals.get(a) || 0) + (v || 0) + appBonusTotal(d, a));
    }
    for (const bonus of d.bonuses ?? []) {
      if (Object.prototype.hasOwnProperty.call(d.apps ?? {}, bonus.app)) continue;
      appTotals.set(bonus.app, (appTotals.get(bonus.app) || 0) + bonus.amount);
    }
  }
  // Previous month for app growth
  const prevDateRef = new Date(year, month - 1, 1);
  const prevMonthDays = daysInMonth(weeks, prevDateRef.getFullYear(), prevDateRef.getMonth());
  const prevAppTotals = new Map<string, number>();
  for (const d of prevMonthDays) {
    for (const [a, v] of Object.entries(d.apps || {})) {
      prevAppTotals.set(a, (prevAppTotals.get(a) || 0) + (v || 0) + appBonusTotal(d, a));
    }
    for (const bonus of d.bonuses ?? []) {
      if (Object.prototype.hasOwnProperty.call(d.apps ?? {}, bonus.app)) continue;
      prevAppTotals.set(bonus.app, (prevAppTotals.get(bonus.app) || 0) + bonus.amount);
    }
  }

  // Tiers (calculated on workedDays)
  const workedAvg = workedDays.length > 0
    ? workedDays.reduce((s, d) => s + dayTotal(d), 0) / workedDays.length
    : 0;
  const sortedTotals = workedDays.map((d) => dayTotal(d)).sort((a, b) => b - a);
  const top20Cutoff = sortedTotals.length > 0
    ? sortedTotals[Math.max(0, Math.floor(sortedTotals.length * 0.2) - 1)]
    : Infinity;
  const top30Cutoff = sortedTotals.length > 0
    ? sortedTotals[Math.max(0, Math.floor(sortedTotals.length * 0.3) - 1)]
    : Infinity;

  // Lifetime top 10% cutoff (for "top" tier — gold)
  const lifetimeTotals: number[] = [];
  for (const w of weeks) {
    for (const d of w.entries) {
      const t = dayTotal(d);
      if (t > 0) lifetimeTotals.push(t);
    }
  }
  lifetimeTotals.sort((a, b) => b - a);
  const lifetimeTop10Cutoff = lifetimeTotals.length >= 10
    ? lifetimeTotals[Math.max(0, Math.floor(lifetimeTotals.length * 0.1) - 1)]
    : Infinity;

  // Best day per weekday (lifetime) — for "new weekday record" legendary trigger
  const weekdayBest = new Map<number, { total: number; date: string }>();
  for (const w of weeks) {
    for (const d of w.entries) {
      const t = dayTotal(d);
      if (t <= 0) continue;
      const wd = new Date(d.date).getDay();
      const cur = weekdayBest.get(wd);
      if (!cur || t > cur.total) weekdayBest.set(wd, { total: t, date: d.date });
    }
  }

  // App "topDays" — count days where the app led and the day was top 20%
  const appTopDays = new Map<string, number>();
  for (const d of workedDays) {
    if (dayTotal(d) < top20Cutoff) continue;
    let leader = { app: "", total: 0 };
    const appNames = new Set([
      ...Object.keys(d.apps || {}),
      ...(d.bonuses ?? []).map((bonus) => bonus.app),
    ]);
    for (const a of appNames) {
      const total = (d.apps?.[a] || 0) + appBonusTotal(d, a);
      if (total > leader.total) leader = { app: a, total };
    }
    if (leader.app) appTopDays.set(leader.app, (appTopDays.get(leader.app) || 0) + 1);
  }

  const apps: MonthAppBreakdown[] = [...appTotals.entries()]
    .filter(([, t]) => t > 0)
    .map(([app, total]) => {
      const prev = prevAppTotals.get(app) || 0;
      const growthPct = prev > 0 ? ((total - prev) / prev) * 100 : null;
      return {
        app,
        total,
        pct: totalEarned > 0 ? (total / totalEarned) * 100 : 0,
        prevTotal: prev,
        growthPct,
        topDays: appTopDays.get(app) || 0,
      };
    })
    .sort((a, b) => b.total - a.total);

  // Heatmap — Mon..Sun grid covering the month
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);
  const dayMap = new Map<string, DayEntry>();
  for (const d of monthDays) dayMap.set(d.date, d);

  // Find Monday on or before the first
  const start = new Date(firstOfMonth);
  const dow = (start.getDay() + 6) % 7; // 0 = Monday
  start.setDate(start.getDate() - dow);
  // Find Sunday on or after the last
  const end = new Date(lastOfMonth);
  const dowEnd = (end.getDay() + 6) % 7;
  end.setDate(end.getDate() + (6 - dowEnd));

  const heatmap: MonthDayCell[] = [];
  const cursor = new Date(start);
  const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  while (cursor <= end) {
    const ds = `${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}-${pad(cursor.getDate())}`;
    const inMonth = cursor.getMonth() === month && cursor.getFullYear() === year;
    const entry = dayMap.get(ds);
    const t = entry ? dayTotal(entry) : 0;
    const logged = entry ? (entry.logged !== undefined ? !!entry.logged : t > 0) : false;
    const worked = t > 0;
    let tier: MonthDayCell["tier"] = "off";
    if (worked) {
      if (t >= lifetimeTop10Cutoff) tier = "top";
      else if (t >= top20Cutoff) tier = "strong";
      else if (t >= top30Cutoff || t >= workedAvg) tier = "solid";
      else tier = "low";
    }
    const isAllTimeBest = worked && lifetimeBestDay.date === ds && lifetimeBestDay.total > 0;
    const isMonthBest = worked && t > 0 && t === bestDay.total && ds === bestDay.date;
    const wd = cursor.getDay();
    const wdRec = weekdayBest.get(wd);
    const isWeekdayRecord = worked && wdRec?.date === ds && (wdRec?.total || 0) > 0;
    if (isAllTimeBest || isMonthBest || isWeekdayRecord) tier = "legendary";
    heatmap.push({
      date: inMonth ? ds : "",
      dayName: dayNames[(cursor.getDay() + 6) % 7],
      total: inMonth ? t : 0,
      logged: inMonth ? logged : false,
      worked: inMonth ? worked : false,
      tier: inMonth ? tier : "off",
      isAllTimeBest: inMonth && isAllTimeBest,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  const weeksShown = heatmap.length / 7;

  const legendaryDays = heatmap.filter((c) => c.tier === "legendary").length;
  const totalCalDays = lastOfMonth.getDate();
  const daysOff = totalCalDays - daysWorked;

  // Goals
  const goalSum = wMonth.reduce((s, w) => s + (w.weeklyGoal || 0), 0);
  const goalHits = wMonth.filter((w) => w.weeklyGoal > 0 && w.entries.reduce((s, d) => s + dayTotal(d), 0) >= w.weeklyGoal).length;

  // Comparatives
  const prevKey = `${prevDateRef.getFullYear()}-${pad(prevDateRef.getMonth() + 1)}`;
  const prevTotal = totalOf(prevMonthDays);
  const prevDaysWorked = prevMonthDays.filter((d) => dayTotal(d) > 0).length;
  const prevMonth = prevMonthDays.length > 0
    ? { key: prevKey, total: prevTotal, daysWorked: prevDaysWorked }
    : null;

  // Best month ever (by total)
  const allMonthKeys = listMonthsWithData(weeks);
  let bestMonthTotal = 0;
  for (const k of allMonthKeys) {
    const [yy, mm] = k.split("-").map(Number);
    const t = totalOf(daysInMonth(weeks, yy, mm - 1));
    if (t > bestMonthTotal) bestMonthTotal = t;
  }
  const isBestMonthEver = totalEarned > 0 && totalEarned >= bestMonthTotal;

  // Growth streak — count consecutive months ending with this one where each > prior
  let growthStreak = 0;
  {
    let curT = totalEarned;
    let cursor = new Date(year, month, 1);
    let safety = 0;
    while (safety++ < 24) {
      const prev = new Date(cursor);
      prev.setMonth(prev.getMonth() - 1);
      const prevT = totalOf(daysInMonth(weeks, prev.getFullYear(), prev.getMonth()));
      if (prevT > 0 && curT > prevT) {
        growthStreak++;
        curT = prevT;
        cursor = prev;
      } else {
        break;
      }
    }
    if (growthStreak > 0) growthStreak += 1; // include current month
  }

  const highestSingleDayEver = bestDay.total > 0 && bestDay.date === lifetimeBestDay.date;

  // Slow start strong finish — first half avg vs second half avg
  const half = Math.ceil(monthDays.length / 2);
  const firstHalf = monthDays.slice(0, half).filter((d) => dayTotal(d) > 0);
  const secondHalf = monthDays.slice(half).filter((d) => dayTotal(d) > 0);
  const avgFirst = firstHalf.length > 0 ? firstHalf.reduce((s, d) => s + dayTotal(d), 0) / firstHalf.length : 0;
  const avgSecond = secondHalf.length > 0 ? secondHalf.reduce((s, d) => s + dayTotal(d), 0) / secondHalf.length : 0;
  const slowStartStrongFinish = avgFirst > 0 && avgSecond >= avgFirst * 1.4 && secondHalf.length >= 3;

  const nextDate = new Date(year, month + 1, 1);

  return {
    key: `${year}-${pad(month + 1)}`,
    year,
    month,
    monthName: monthNameOf(month),
    monthLabel: `${monthNameOf(month)} ${year}`,
    nextMonthName: monthNameOf(nextDate.getMonth()),
    totalEarned,
    daysWorked,
    daysOff,
    legendaryDays,
    bestDay,
    longestStreak,
    strongestWeek,
    apps,
    heatmap,
    weeksShown,
    goalSum,
    goalHits,
    prevMonth,
    isBestMonthEver,
    growthStreak,
    highestSingleDayEver,
    slowStartStrongFinish,
  };
}

/** Headline copy for screen 1. */
export function getMonthHeadline(s: MonthSummary): string {
  if (s.totalEarned <= 0) return "A quiet chapter. Still part of the story.";
  if (s.isBestMonthEver && s.prevMonth) return `Your best ${s.monthName} yet. By far.`;
  if (s.growthStreak >= 3) return `${s.growthStreak} months of growth in a row. Don't stop.`;
  if (s.highestSingleDayEver) return "One legendary day. A month to remember.";
  if (s.goalHits >= 3) return "Consistency was your superpower this month.";
  if (s.prevMonth && s.daysWorked > s.prevMonth.daysWorked) return "More days. More momentum. More you.";
  if (s.slowStartStrongFinish) return "A slow start that turned into something special.";
  return "You showed up. Every week. That matters.";
}

/** Closing line for screen 6. */
export function getMonthClose(s: MonthSummary): string {
  if (s.growthStreak >= 3) return `${s.growthStreak} months of growth in a row. This is a streak worth protecting.`;
  if (s.isBestMonthEver && s.totalEarned > 0) return "This was your best month yet. Now you know what's possible.";
  if (s.goalSum > 0 && s.totalEarned >= s.goalSum) return `You aimed for ${formatShort(s.goalSum)}. You hit ${formatShort(s.totalEarned)}. Remember that.`;
  if (s.daysWorked >= 12) return `You showed up ${s.daysWorked} days this month. That's the foundation of everything.`;
  if (s.prevMonth && s.totalEarned < s.prevMonth.total) return "Not your biggest month. But you stayed in the game. That counts.";
  return `You're building something real. ${s.nextMonthName} starts soon.`;
}

function formatShort(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return `$${Math.round(n)}`;
}

/** Returns the previous calendar month relative to today, as { year, month }. */
export function getPreviousMonth(now = new Date()): { year: number; month: number } {
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

/** True if today is in a different month than the most recently worked day. */
export function shouldShowFreshChapter(weeks: WeekRecord[], now = new Date()): { show: boolean; lastMonth?: { year: number; month: number } } {
  const months = listMonthsWithData(weeks);
  if (months.length === 0) return { show: false };
  const lastKey = months[months.length - 1];
  const [yy, mm] = lastKey.split("-").map(Number);
  const curKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  if (curKey > lastKey) {
    return { show: true, lastMonth: { year: yy, month: mm - 1 } };
  }
  return { show: false };
}
