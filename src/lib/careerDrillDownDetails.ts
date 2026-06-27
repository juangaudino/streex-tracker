import type { MetricDrillDownDetail } from "@/components/MetricDrillDownSheet";
import type { CareerStats, PerformanceInsights } from "./career";
import type { CareerDrillDownData } from "./careerDrillDowns";
import { formatCurrency } from "./store";
import type { buildPatternIntelligence } from "./shiftIntelligence";

interface CareerDrillDownDetailsArgs {
  data: CareerDrillDownData;
  stats: CareerStats;
  performance: PerformanceInsights;
  efficiency: ReturnType<typeof buildPatternIntelligence>["summary"];
  currencySymbol: string;
}

export interface CareerDrillDownDetails {
  monthly: MetricDrillDownDetail;
  records: MetricDrillDownDetail;
  apps: MetricDrillDownDetail;
  weekdays: MetricDrillDownDetail;
  efficiency: MetricDrillDownDetail;
}

export function buildCareerDrillDownDetails({
  data,
  stats,
  performance,
  efficiency,
  currencySymbol,
}: CareerDrillDownDetailsArgs): CareerDrillDownDetails {
  const money = (value: number) => formatCurrency(value, currencySymbol);
  const gapValue = (value: number | null) => {
    if (value === null) return "Building";
    if (value <= 0) return "Already there";
    return money(value);
  };

  const monthlyProgressPage: Omit<MetricDrillDownDetail, "pages"> = {
    eyebrow: "Monthly Progress",
    title: `${data.monthly.currentLabel} in context`,
    summary: "This separates same-point pace from the full-month targets you are chasing.",
    stats: [
      { label: "Current month", value: money(data.monthly.currentTotal), helper: "Month to date" },
      { label: "Last month", value: money(data.monthly.previousTotal), helper: "Completed month total" },
      { label: "Same point", value: money(data.monthly.previousSamePointTotal), helper: `${data.monthly.previousLabel} through this day` },
      { label: "Provisional rank", value: data.monthly.provisionalRank ? `#${data.monthly.provisionalRank}` : "Building", helper: `${data.monthly.rankedMonths} earning months` },
    ],
    sections: [{
      title: "Monthly chase",
      rows: [
        { label: "Best historical month", value: data.monthly.bestHistoricalTotal > 0 ? money(data.monthly.bestHistoricalTotal) : "Building", helper: data.monthly.bestHistoricalLabel },
        { label: "Gap to record", value: gapValue(data.monthly.gapToBest) },
        { label: "Gap to Top 3", value: gapValue(data.monthly.gapToTop3) },
        { label: "Gap to Top 5", value: gapValue(data.monthly.gapToTop5) },
      ],
    }],
    notes: [
      "The current month rank is provisional because the month is still in progress.",
      "Same-point pace compares earnings recorded through the same calendar day, while chase totals compare against completed months.",
    ],
  };
  const monthlyHistoryPage: Omit<MetricDrillDownDetail, "pages"> = {
    eyebrow: "Monthly History",
    title: "Your strongest earning months",
    summary: "Full monthly earnings totals, including bonuses and rewards assigned to the day received.",
    stats: [
      { label: "Best month", value: data.monthly.topMonths[0] ? money(data.monthly.topMonths[0].total) : "Building", helper: data.monthly.topMonths[0]?.label ?? "No monthly history" },
      { label: "Tracked months", value: `${data.monthly.rankedMonths}`, helper: "Months with earnings" },
      { label: "Current position", value: data.monthly.provisionalRank ? `#${data.monthly.provisionalRank}` : "Building", helper: "Provisional while open" },
      { label: "Current total", value: money(data.monthly.currentTotal), helper: "Month to date" },
    ],
    sections: data.monthly.topMonths.length ? [{
      title: "Top months",
      rows: data.monthly.topMonths.map((month, index) => ({
        label: `#${index + 1} · ${month.label}`,
        value: money(month.total),
        helper: `${month.activeDays} active days${month.isCurrent ? " · in progress" : ""}`,
      })),
    }] : undefined,
    notes: ["Completed months and the current in-progress month are clearly labeled so the ranking is not mistaken for a final result."],
  };
  const monthly: MetricDrillDownDetail = {
    ...monthlyProgressPage,
    pages: [
      { id: "progress", label: "Progress", detail: monthlyProgressPage },
      { id: "history", label: "History", detail: monthlyHistoryPage },
    ],
  };

  const dayMargin = data.topDays.length > 1 ? data.topDays[0].total - data.topDays[1].total : null;
  const weekMargin = data.topWeeks.length > 1 ? data.topWeeks[0].total - data.topWeeks[1].total : null;
  const dayRecordsPage: Omit<MetricDrillDownDetail, "pages"> = {
    eyebrow: "Day Records",
    title: "Your strongest earning days",
    summary: "Daily records ranked by total money received that day.",
    stats: [
      { label: "Best day", value: data.topDays[0] ? money(data.topDays[0].total) : "Building", helper: data.topDays[0]?.date ?? "No earning days" },
      { label: "Active days", value: `${data.rankedDays}`, helper: "Days with earnings" },
      { label: "Margin over #2", value: dayMargin === null ? "First record" : money(dayMargin), helper: "Record separation" },
      { label: "Best weekday", value: stats.bestWeekday.dayName, helper: stats.bestWeekday.avg > 0 ? `${money(stats.bestWeekday.avg)} average` : "Building" },
    ],
    sections: data.topDays.length ? [{
      title: "Top days",
      rows: data.topDays.map((day, index) => ({
        label: `#${index + 1} · ${day.dayName}`,
        value: money(day.total),
        helper: day.date,
      })),
    }] : undefined,
  };
  const weekRecordsPage: Omit<MetricDrillDownDetail, "pages"> = {
    eyebrow: "Week Records",
    title: "Your strongest earning weeks",
    summary: "Weekly records use the same complete money totals shown throughout Streex.",
    stats: [
      { label: "Best week", value: data.topWeeks[0] ? money(data.topWeeks[0].total) : "Building", helper: data.topWeeks[0] ? `${data.topWeeks[0].startDate} → ${data.topWeeks[0].endDate}` : "No weekly history" },
      { label: "Tracked weeks", value: `${data.rankedWeeks}`, helper: "Weeks with earnings" },
      { label: "Margin over #2", value: weekMargin === null ? "First record" : money(weekMargin), helper: "Record separation" },
      { label: "Average week", value: money(performance.avgWeeklyEarnings), helper: "Across tracked weeks" },
    ],
    sections: data.topWeeks.length ? [{
      title: "Top weeks",
      rows: data.topWeeks.map((week, index) => ({
        label: `#${index + 1} · ${week.startDate}`,
        value: money(week.total),
        helper: `${week.endDate} · ${week.activeDays} active days`,
      })),
    }] : undefined,
  };
  const records: MetricDrillDownDetail = {
    ...dayRecordsPage,
    pages: [
      { id: "day", label: "Day", detail: dayRecordsPage },
      { id: "week", label: "Week", detail: weekRecordsPage },
    ],
  };

  const topApp = data.apps[0];
  const apps: MetricDrillDownDetail = {
    eyebrow: "App Contribution",
    title: "How each platform shaped your earnings",
    summary: "This ranks apps by attributed earnings, not by rides, hours, or screen time.",
    stats: [
      { label: "Top earning app", value: topApp?.app ?? "Building", helper: "Lifetime leader" },
      { label: "Lifetime earnings", value: topApp ? money(topApp.total) : "—", helper: "For the leading app" },
      { label: "Contribution", value: topApp ? `${topApp.share.toFixed(1)}%` : "—", helper: "Share of lifetime earnings" },
      { label: "Active days", value: topApp ? `${topApp.activeDays}` : "—", helper: "Days with earnings from this app" },
      { label: "This month", value: topApp ? money(topApp.currentMonthTotal) : "—", helper: "Leading app month to date" },
      { label: "Last month", value: topApp ? money(topApp.previousMonthTotal) : "—", helper: "Leading app previous month" },
    ],
    sections: data.apps.length ? [{
      title: "Lifetime app mix",
      rows: data.apps.map((app, index) => ({
        label: `#${index + 1} · ${app.app}`,
        value: money(app.total),
        helper: `${app.share.toFixed(1)}% · ${app.activeDays} active days`,
      })),
    }] : undefined,
    notes: ["Bonuses count toward the app they were assigned to. This does not claim app-specific hours or efficiency."],
  };

  const leadingWeekday = data.weekdays[0];
  const weekdaySpread = data.weekdays.length > 1 ? data.weekdays[0].average - data.weekdays[1].average : null;
  const weekdays: MetricDrillDownDetail = {
    eyebrow: "Weekday Performance",
    title: "Your earning rhythm by weekday",
    summary: "Weekdays are compared by average earnings across active days, with sample size visible.",
    stats: [
      { label: "Strongest weekday", value: leadingWeekday?.dayName ?? "Building", helper: "Highest active-day average" },
      { label: "Average", value: leadingWeekday ? money(leadingWeekday.average) : "—", helper: "For the leading weekday" },
      { label: "Sample size", value: leadingWeekday ? `${leadingWeekday.count} days` : "—", helper: "Tracked active days" },
      { label: "Lead over #2", value: weekdaySpread === null ? "Building" : money(weekdaySpread), helper: "Average-day difference" },
    ],
    sections: data.weekdays.length ? [{
      title: "Weekday ranking",
      rows: data.weekdays.map((weekday, index) => ({
        label: `#${index + 1} · ${weekday.dayName}`,
        value: money(weekday.average),
        helper: `${weekday.count} active days · ${money(weekday.total)} total`,
      })),
    }] : undefined,
    notes: ["A higher average with a very small sample can change quickly as more days are recorded."],
  };

  const measuredOperationalEarnings = efficiency.earningsPerHour && efficiency.totalHours
    ? efficiency.earningsPerHour * efficiency.totalHours
    : 0;
  const efficiencyDetail: MetricDrillDownDetail = {
    eyebrow: "Hourly Efficiency",
    title: "How Career earnings per hour is measured",
    summary: "This uses operational earnings only on days with valid saved shift duration.",
    stats: [
      { label: "Average / hour", value: efficiency.earningsPerHour ? `${money(efficiency.earningsPerHour)}/hr` : "Building", helper: "Operational earnings divided by valid hours" },
      { label: "Valid hours", value: `${efficiency.totalHours.toFixed(1)}h`, helper: "Saved worked duration" },
      { label: "Measured earnings", value: measuredOperationalEarnings > 0 ? money(measuredOperationalEarnings) : "—", helper: "Operational money represented" },
      { label: "Completed shifts", value: `${efficiency.completedShifts}`, helper: "Saved completed blocks" },
      { label: "Average shift", value: efficiency.averageShiftHours ? `${efficiency.averageShiftHours.toFixed(1)}h` : "—", helper: "Completed shifts only" },
      { label: "Rides / hour", value: efficiency.ridesPerHour ? efficiency.ridesPerHour.toFixed(1) : "—", helper: "When ride count exists" },
    ],
    notes: [
      "Bonuses and reward income are excluded so hourly efficiency stays work-focused.",
      "This is Career-wide efficiency. Timing windows remain inside Shift Intelligence and retain their observed or estimated labels.",
    ],
  };

  return { monthly, records, apps, weekdays, efficiency: efficiencyDetail };
}
