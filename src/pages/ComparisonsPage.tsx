import { useOutletContext } from "react-router-dom";
import StatCard from "@/components/StatCard";
import WeeklyComparisonSection from "@/components/WeeklyComparisonSection";
import {
  weekTotal,
  formatCurrency,
  getPreviousWeek,
  getRecordWeek,
  getLoggedDays,
  samePointTotal,
} from "@/lib/store";
import { buildAverageWeekReference, buildIdealWeekReference, buildWeeklyComparisonPoints } from "@/lib/weeklyComparison";
import type { StoreContext } from "./types";

export default function ComparisonsPage() {
  const { openWeek, weeks, settings } = useOutletContext<StoreContext>();
  const sym = settings.currencySymbol;

  if (!openWeek) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">No open week to compare.</p>
      </div>
    );
  }

  const total = weekTotal(openWeek);
  const prev = getPreviousWeek(weeks, openWeek);
  const record = getRecordWeek(weeks, openWeek);
  const averageReference = buildAverageWeekReference(weeks, openWeek);
  const idealReference = buildIdealWeekReference(weeks, openWeek);
  const loggedDays = getLoggedDays(openWeek);
  const prevSP = prev ? samePointTotal(prev, loggedDays) : 0;
  const avgSP = averageReference ? samePointTotal(averageReference.week, loggedDays) : 0;
  const recSP = record ? samePointTotal(record, loggedDays) : 0;
  const idealSP = idealReference ? samePointTotal(idealReference.week, loggedDays) : 0;
  const recFull = record ? weekTotal(record) : 0;
  const diffPrev = prev ? total - prevSP : 0;
  const diffAvg = averageReference ? total - avgSP : 0;
  const diffRec = record ? total - recSP : 0;
  const diffIdeal = idealReference ? total - idealSP : 0;
  const pctPrev = prevSP > 0 ? (diffPrev / prevSP) * 100 : 0;
  const pctAvg = avgSP > 0 ? (diffAvg / avgSP) * 100 : 0;
  const pctRec = recSP > 0 ? (diffRec / recSP) * 100 : 0;
  const pctIdeal = idealSP > 0 ? (diffIdeal / idealSP) * 100 : 0;
  const needToBeat = Math.max(0, recFull + 0.01 - total);
  const previousPoints = prev ? buildWeeklyComparisonPoints(openWeek, prev, loggedDays) : [];
  const averagePoints = averageReference ? buildWeeklyComparisonPoints(openWeek, averageReference.week, loggedDays) : [];
  const recordPoints = record ? buildWeeklyComparisonPoints(openWeek, record, loggedDays) : [];
  const idealPoints = idealReference ? buildWeeklyComparisonPoints(openWeek, idealReference.week, loggedDays) : [];
  const averageSampleCount = averageReference?.sampleCounts.reduce((sum, count) => sum + count, 0) ?? 0;
  const averageWeekdayCount = averageReference?.sampleCounts.filter((count) => count > 0).length ?? 0;
  const idealSampleCount = idealReference?.sampleCounts.reduce((sum, count) => sum + count, 0) ?? 0;
  const idealWeekdayCount = idealReference?.sampleCounts.filter((count) => count > 0).length ?? 0;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Comparisons</h1>
      <p className="text-sm text-muted-foreground">
        Same-point comparison ({loggedDays.length} logged day{loggedDays.length !== 1 ? "s" : ""})
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard label="Current Total" value={formatCurrency(total, sym)} variant="primary" />
        <StatCard
          label="vs Previous"
          value={prev ? formatCurrency(diffPrev, sym) : "—"}
          variant={diffPrev > 0 ? "success" : diffPrev < 0 ? "warning" : "default"}
          sub={prev ? `${pctPrev > 0 ? "+" : ""}${pctPrev.toFixed(1)}%` : "No data"}
        />
        <StatCard
          label="vs Average"
          value={averageReference ? formatCurrency(diffAvg, sym) : "—"}
          variant={diffAvg > 0 ? "success" : diffAvg < 0 ? "warning" : "default"}
          sub={averageReference ? `${pctAvg > 0 ? "+" : ""}${pctAvg.toFixed(1)}%` : "No history"}
        />
        <StatCard
          label="vs Record"
          value={record ? formatCurrency(diffRec, sym) : "—"}
          variant={diffRec > 0 ? "gold" : diffRec < 0 ? "warning" : "default"}
          sub={record ? `${pctRec > 0 ? "+" : ""}${pctRec.toFixed(1)}%` : "No data"}
        />
        <StatCard
          label="vs Ideal"
          value={idealReference ? formatCurrency(diffIdeal, sym) : "—"}
          variant={diffIdeal > 0 ? "gold" : diffIdeal < 0 ? "warning" : "default"}
          sub={idealReference ? `${pctIdeal > 0 ? "+" : ""}${pctIdeal.toFixed(1)}%` : "No history"}
        />
        <StatCard
          label="To Beat Record"
          value={record ? formatCurrency(needToBeat, sym) : "—"}
          variant="gold"
        />
      </div>

      {prev ? (
        <WeeklyComparisonSection
          title="This week vs previous week"
          description="Daily results and running difference through the same tracked days."
          referenceLabel="Previous week"
          points={previousPoints}
          symbol={sym}
          tone="previous"
        />
      ) : null}

      {averageReference ? (
        <WeeklyComparisonSection
          title="This week vs average week"
          description="Daily progress against your historical weekday averages, excluding this current week."
          referenceLabel="Average week"
          referenceDetail={`${averageWeekdayCount}/7 weekdays · ${averageSampleCount} tracked day${averageSampleCount === 1 ? "" : "s"}`}
          points={averagePoints}
          symbol={sym}
          tone="average"
        />
      ) : null}

      {record ? (
        <WeeklyComparisonSection
          title="This week vs record week"
          description="Daily progress against your best week at the same point."
          referenceLabel="Record week"
          points={recordPoints}
          symbol={sym}
          tone="record"
        />
      ) : null}

      {idealReference ? (
        <WeeklyComparisonSection
          title="This week vs ideal week"
          description="Aspirational target built from your best historical Monday, Tuesday, Wednesday, and so on."
          referenceLabel="Ideal week"
          referenceDetail={`${idealWeekdayCount}/7 weekday records · ${idealSampleCount} tracked day${idealSampleCount === 1 ? "" : "s"}`}
          points={idealPoints}
          symbol={sym}
          tone="ideal"
        />
      ) : null}
    </div>
  );
}
