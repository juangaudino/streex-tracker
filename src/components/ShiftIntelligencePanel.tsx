import { Activity, BarChart3, Clock, Gauge, Moon, Route, Sparkles, Sun } from "lucide-react";
import { formatCurrency } from "@/lib/store";
import { buildPatternIntelligence } from "@/lib/shiftIntelligence";
import type { PerformanceMode } from "@/lib/performanceMode";
import type { WeekRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ShiftIntelligencePanelProps {
  weeks: WeekRecord[];
  currencySymbol: string;
  mode: PerformanceMode;
}

function Metric({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 min-w-0">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <p className="mt-1 text-lg font-bold font-mono truncate">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground truncate">{sub}</p>}
    </div>
  );
}

export default function ShiftIntelligencePanel({ weeks, currencySymbol, mode }: ShiftIntelligencePanelProps) {
  const intelligence = buildPatternIntelligence(weeks);
  const { summary } = intelligence;
  const maxEph = Math.max(1, ...intelligence.hourlyHeatmap.map((bucket) => bucket.earningsPerHour));

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Shift Intelligence
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manual shift and mileage signals. No GPS, no background tracking.
          </p>
        </div>
        <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
          {mode}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Metric icon={<Clock className="h-3.5 w-3.5" />} label="Hours" value={`${summary.totalHours.toFixed(1)}h`} />
        <Metric icon={<Activity className="h-3.5 w-3.5" />} label="Per Hour" value={summary.earningsPerHour ? formatCurrency(summary.earningsPerHour, currencySymbol) : "—"} />
        <Metric icon={<Route className="h-3.5 w-3.5" />} label="Miles" value={`${summary.totalMiles.toFixed(1)}`} />
        <Metric icon={<Gauge className="h-3.5 w-3.5" />} label="Per Mile" value={summary.earningsPerMile ? formatCurrency(summary.earningsPerMile, currencySymbol) : "—"} />
      </div>

      {!intelligence.hasEnoughShiftData ? (
        <div className="rounded-xl border border-border bg-card/70 p-4">
          <p className="text-sm font-semibold">Pattern intelligence is warming up.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Log at least three completed shifts to unlock stronger hour, app, and productivity patterns.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {intelligence.strongestHours.map((hour) => (
              <Metric
                key={hour.hour}
                icon={<Sparkles className="h-3.5 w-3.5 text-primary" />}
                label="Strong Hour"
                value={hour.label}
                sub={`${formatCurrency(hour.earningsPerHour, currencySymbol)}/hr`}
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

          {mode === "advanced" && (
            <>
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold">Hourly Heatmap</p>
                </div>
                <div className="grid grid-cols-6 sm:grid-cols-12 gap-1">
                  {intelligence.hourlyHeatmap.map((bucket) => {
                    const intensity = bucket.hours > 0 ? Math.max(0.12, bucket.earningsPerHour / maxEph) : 0;
                    return (
                      <div key={bucket.hour} className="space-y-1">
                        <div
                          className={cn("h-8 rounded-md border border-border/60", bucket.hours > 0 ? "bg-primary" : "bg-muted/40")}
                          style={{ opacity: bucket.hours > 0 ? Math.min(0.85, intensity) : 1 }}
                          title={`${bucket.label}: ${formatCurrency(bucket.earningsPerHour, currencySymbol)}/hr`}
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
