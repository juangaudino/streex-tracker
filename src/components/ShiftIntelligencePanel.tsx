import { Activity, BarChart3, Clock, Gauge, Moon, Route, Sparkles, Sun } from "lucide-react";
import { formatCurrency } from "@/lib/store";
import { buildPatternIntelligence } from "@/lib/shiftIntelligence";
import type { PerformanceMode } from "@/lib/performanceMode";
import type { EarningsSnapshot, WeekRecord } from "@/lib/types";
import { cn } from "@/lib/utils";
import { buildActiveDayAverageComparison } from "@/lib/weeklyOperations";

interface ShiftIntelligencePanelProps {
  weeks: WeekRecord[];
  earningsSnapshots?: EarningsSnapshot[];
  currencySymbol: string;
  mode: PerformanceMode;
  heading?: string;
  description?: string;
  snapshotTitle?: string;
  snapshotOnly?: boolean;
  showModeBadge?: boolean;
  showSnapshotInsight?: boolean;
  historicalWeeks?: WeekRecord[];
}

function Metric({ label, value, sub, icon, tone = "default" }: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  tone?: "default" | "primary";
}) {
  return (
    <div className={cn(
      "rounded-xl border p-3 min-w-0",
      tone === "primary" ? "border-primary/25 bg-primary/5" : "border-border bg-card",
    )}>
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <p className="mt-1 text-lg font-bold font-mono truncate">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground truncate">{sub}</p>}
    </div>
  );
}

function formatNullableCurrency(value: number | null, currencySymbol: string): string {
  return value ? formatCurrency(value, currencySymbol) : "—";
}

function formatNullableNumber(value: number | null, suffix = ""): string {
  return value ? `${value.toFixed(1)}${suffix}` : "—";
}

function buildEfficiencyInsight(summary: ReturnType<typeof buildPatternIntelligence>["summary"]): string {
  if (summary.activeShifts > 0) return "A shift is currently active. End it when you finish to lock in duration and efficiency.";
  if (summary.completedShifts === 0) return "Start and complete shifts to unlock your operating rhythm.";
  if (summary.earningsPerMile && summary.earningsPerHour) {
    return `Your saved shifts are averaging ${formatNullableNumber(summary.milesPerHour, " mi/hr")} with a measured efficiency baseline.`;
  }
  if (summary.totalMiles <= 0) return "Add miles to completed shifts to unlock earnings-per-mile and miles-per-hour context.";
  return "Complete a few more shifts to sharpen your efficiency read.";
}

function formatTimingMetric(
  hour: ReturnType<typeof buildPatternIntelligence>["hourlyHeatmap"][number] | undefined,
  source: ReturnType<typeof buildPatternIntelligence>["timingSource"],
  currencySymbol: string,
): string {
  if (!hour) return "track more shifts";
  if (source === "snapshot") {
    const updates = hour.observations ?? 0;
    return `${formatCurrency(hour.earnings, currencySymbol)} in update${updates === 1 ? "" : "s"}`;
  }
  return `${formatCurrency(hour.earningsPerHour, currencySymbol)}/hr est.`;
}

export default function ShiftIntelligencePanel({
  weeks,
  earningsSnapshots = [],
  currencySymbol,
  mode,
  heading = "Shift Intelligence",
  description,
  snapshotTitle = "Advanced Operations Snapshot",
  snapshotOnly = false,
  showModeBadge = true,
  showSnapshotInsight = true,
  historicalWeeks,
}: ShiftIntelligencePanelProps) {
  const intelligence = buildPatternIntelligence(weeks, earningsSnapshots);
  const { summary } = intelligence;
  const maxEph = Math.max(1, ...intelligence.hourlyHeatmap.map((bucket) => bucket.earningsPerHour));
  const isAdvanced = mode === "advanced";
  const strongWindowLabel = intelligence.timingSource === "snapshot" ? "Observed Update Hour" : "Estimated Window";
  const heatmapTitle = intelligence.timingSource === "snapshot" ? "Update Heatmap" : "Estimated Hourly Heatmap";
  const headerDescription = description ?? (isAdvanced
    ? "Operational view with shift, mileage, and efficiency context."
    : "Simple view for quick shift and earnings rhythm.");
  const activeDayAverage = buildActiveDayAverageComparison(weeks, historicalWeeks ?? []);
  const snapshot = (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Gauge className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold">{snapshotTitle}</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Metric icon={<Clock className="h-3.5 w-3.5" />} label="Duration" value={`${summary.totalHours.toFixed(1)}h`} sub={`${summary.completedShifts} completed`} tone="primary" />
        <Metric icon={<Activity className="h-3.5 w-3.5" />} label="Earnings/Hr" value={formatNullableCurrency(summary.earningsPerHour, currencySymbol)} sub="efficiency" tone="primary" />
        <Metric icon={<Route className="h-3.5 w-3.5" />} label="Miles" value={`${summary.totalMiles.toFixed(1)}`} sub={`${summary.workDays} work day${summary.workDays === 1 ? "" : "s"}`} tone="primary" />
        <Metric icon={<Gauge className="h-3.5 w-3.5" />} label="Earnings/Mi" value={formatNullableCurrency(summary.earningsPerMile, currencySymbol)} sub={formatNullableNumber(summary.milesPerHour, " mi/hr")} tone="primary" />
      </div>
      <div className={cn("grid grid-cols-2 gap-2", historicalWeeks ? "sm:grid-cols-3" : "sm:grid-cols-4")}>
        <Metric icon={<BarChart3 className="h-3.5 w-3.5" />} label="Rides" value={`${summary.totalRides}`} sub={summary.earningsPerRide ? `${formatCurrency(summary.earningsPerRide, currencySymbol)}/ride` : "track rides"} />
        <Metric icon={<Activity className="h-3.5 w-3.5" />} label="Active" value={`${summary.activeShifts}`} sub="open shift" />
        <Metric icon={<Clock className="h-3.5 w-3.5" />} label="Avg Shift" value={formatNullableNumber(summary.averageShiftHours, "h")} sub="completed only" />
        <Metric icon={<BarChart3 className="h-3.5 w-3.5" />} label="Blocks" value={`${summary.totalShifts}`} sub={`${summary.multiShiftDays} split day${summary.multiShiftDays === 1 ? "" : "s"}`} />
        <Metric icon={<Route className="h-3.5 w-3.5" />} label="Miles/Hr" value={formatNullableNumber(summary.milesPerHour)} sub="movement pace" />
        {historicalWeeks && (
          <Metric
            icon={<Activity className="h-3.5 w-3.5" />}
            label="Avg / Active Day"
            value={activeDayAverage.currentAverage !== null ? formatCurrency(activeDayAverage.currentAverage, currencySymbol) : "—"}
            sub={activeDayAverage.percentDifference !== null && activeDayAverage.historicalAverage !== null
              ? `${activeDayAverage.percentDifference >= 0 ? "+" : ""}${activeDayAverage.percentDifference.toFixed(0)}% vs ${formatCurrency(activeDayAverage.historicalAverage, currencySymbol)} history`
              : activeDayAverage.currentActiveDays > 0 ? "building history" : "no earning days yet"}
          />
        )}
      </div>
      {showSnapshotInsight && (
        <p className="rounded-lg border border-border/70 bg-card/70 p-3 text-xs text-muted-foreground">
          {buildEfficiencyInsight(summary)}
        </p>
      )}
    </div>
  );

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
            {heading}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {headerDescription}
          </p>
        </div>
        {showModeBadge && (
          <span className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
            isAdvanced ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
          )}>
            {isAdvanced ? "Advanced" : "Simple"}
          </span>
        )}
      </div>

      {snapshotOnly ? (
        snapshot
      ) : !isAdvanced ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <Metric
              icon={<Clock className="h-3.5 w-3.5" />}
              label="Hours"
              value={`${summary.totalHours.toFixed(1)}h`}
              sub={`${summary.completedShifts} completed shift${summary.completedShifts === 1 ? "" : "s"}`}
            />
            <Metric
              icon={<Activity className="h-3.5 w-3.5" />}
              label="Per Hour"
              value={formatNullableCurrency(summary.earningsPerHour, currencySymbol)}
              sub="completed shifts"
            />
            <Metric
              icon={<BarChart3 className="h-3.5 w-3.5" />}
              label="Rides"
              value={`${summary.totalRides}`}
              sub={summary.earningsPerRide ? `${formatCurrency(summary.earningsPerRide, currencySymbol)}/ride` : "optional"}
            />
            <Metric
              icon={<Sparkles className="h-3.5 w-3.5 text-primary" />}
              label={strongWindowLabel}
              value={intelligence.strongestHours[0]?.label ?? "—"}
              sub={formatTimingMetric(intelligence.strongestHours[0], intelligence.timingSource, currencySymbol)}
            />
          </div>
          {!intelligence.hasEnoughShiftData && (
            <div className="rounded-xl border border-border bg-card/70 p-4">
              <p className="text-sm font-semibold">Shift patterns are warming up.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Simple Mode stays light. Switch to Advanced after more completed shifts and saved earnings updates for deeper operating context.
              </p>
            </div>
          )}
        </>
      ) : (
        <>
          {snapshot}

          {!intelligence.hasEnoughTimingData ? (
            <div className="rounded-xl border border-border bg-card/70 p-4">
              <p className="text-sm font-semibold">Track more shifts to unlock deeper patterns.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Advanced metrics above use real saved data now. Timing patterns unlock after at least three completed shifts or three saved earning updates.
              </p>
            </div>
          ) : (
            <>
              <p className="rounded-xl border border-border bg-card/70 p-3 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{intelligence.timingSourceLabel}.</span>{" "}
                {intelligence.timingCopy}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {intelligence.strongestHours.map((hour) => (
                  <Metric
                    key={hour.hour}
                    icon={<Sparkles className="h-3.5 w-3.5 text-primary" />}
                    label={strongWindowLabel}
                    value={hour.label}
                    sub={formatTimingMetric(hour, intelligence.timingSource, currencySymbol)}
                  />
                ))}
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2">
                  {intelligence.morningVsNight.style === "night" ? (
                    <Moon className="h-4 w-4 text-primary" />
                  ) : (
                    <Sun className="h-4 w-4 text-gold" />
                  )}
                  <p className="text-sm font-semibold">Morning vs Night</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{intelligence.morningVsNight.copy}</p>
              </div>

              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold">{heatmapTitle}</p>
                </div>
                <div className="grid grid-cols-6 sm:grid-cols-12 gap-1">
                  {intelligence.hourlyHeatmap.map((bucket) => {
                    const intensity = bucket.hours > 0 ? Math.max(0.12, bucket.earningsPerHour / maxEph) : 0;
                    return (
                      <div key={bucket.hour} className="space-y-1">
                        <div
                          className={cn("h-8 rounded-md border border-border/60", bucket.hours > 0 ? "bg-primary" : "bg-muted/40")}
                          style={{ opacity: bucket.hours > 0 ? Math.min(0.85, intensity) : 1 }}
                          title={`${bucket.label}: ${formatTimingMetric(bucket, intelligence.timingSource, currencySymbol)}`}
                        />
                        <p className="text-[8px] text-muted-foreground text-center">{bucket.hour}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-sm font-semibold">Best Apps by Hour</p>
                  <div className="mt-2 space-y-1.5">
                    {intelligence.bestAppsByHour.slice(0, 4).map((item) => (
                      <p key={`${item.hour}-${item.app}`} className="text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">{item.label}</span> · {item.app}
                      </p>
                    ))}
                    {!intelligence.bestAppsByHour.length && (
                      <p className="text-xs text-muted-foreground">More app/hour history needed.</p>
                    )}
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-sm font-semibold">Recovery Windows</p>
                  <div className="mt-2 space-y-1.5">
                    {intelligence.recoveryWindows.map((item) => (
                      <p key={item.hour} className="text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">{item.label}</span> · lower-intensity period
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {intelligence.fatigueNote && (
            <div className="rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
              {intelligence.fatigueNote}
            </div>
          )}
        </>
      )}
    </section>
  );
}
