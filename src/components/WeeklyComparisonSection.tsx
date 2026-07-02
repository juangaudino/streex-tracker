import { ChevronRight, TrendingUp } from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import DiffValue from "@/components/DiffValue";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { formatCurrency } from "@/lib/store";
import type { WeeklyComparisonPoint } from "@/lib/weeklyComparison";

interface WeeklyComparisonSectionProps {
  title: string;
  description: string;
  referenceLabel: string;
  points: WeeklyComparisonPoint[];
  symbol: string;
}

function ComparisonTooltip({
  active,
  payload,
  label,
  symbol,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  symbol: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-border bg-background/95 p-3 shadow-xl backdrop-blur">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      {payload.map((item) => (
        <div key={item.name} className="flex items-center justify-between gap-5 text-sm">
          <span style={{ color: item.color }}>{item.name}</span>
          <span className="font-mono font-semibold">{formatCurrency(item.value, symbol)}</span>
        </div>
      ))}
    </div>
  );
}

export default function WeeklyComparisonSection({
  title,
  description,
  referenceLabel,
  points,
  symbol,
}: WeeklyComparisonSectionProps) {
  const trackedPoints = points.filter((point) => point.isTracked);
  const futurePoints = points.filter((point) => point.isFuture);
  const finalDifference = trackedPoints.at(-1)?.cumulativeDiff ?? 0;
  const currentTotal = trackedPoints.at(-1)?.currentCumulative ?? 0;
  const referenceTotal = points.at(-1)?.referenceCumulative ?? 0;
  const remainingToMatch = Math.max(0, referenceTotal - currentTotal);
  const requiredPerDay = futurePoints.length ? remainingToMatch / futurePoints.length : 0;
  const lastTrackedDay = trackedPoints.at(-1)?.day;

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-4 sm:px-5">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Running gap</p>
          <DiffValue value={finalDifference} symbol={symbol} className="mt-1 justify-end" />
        </div>
      </div>

      <div className="divide-y divide-border">
        {trackedPoints.length ? points.map((point) => (
          <div key={point.dayIndex} className={point.isFuture ? "bg-secondary/15 px-4 py-3.5 sm:px-5" : "px-4 py-3.5 sm:px-5"}>
            {point.isFuture && point.dayIndex === futurePoints[0]?.dayIndex ? (
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Upcoming</p>
            ) : null}
            <div className="flex items-center justify-between gap-4">
              <p className="font-semibold">{point.day}</p>
              {point.dailyDiff !== null ? (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Day</span>
                  <DiffValue value={point.dailyDiff} symbol={symbol} />
                </div>
              ) : (
                <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                  {point.isFuture ? "Upcoming" : "Not logged"}
                </span>
              )}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">This week</p>
                <p className={point.current === null ? "mt-0.5 text-sm font-medium text-muted-foreground" : "mt-0.5 font-mono font-semibold"}>
                  {point.current === null ? "Pending" : formatCurrency(point.current, symbol)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">{referenceLabel}</p>
                <p className="mt-0.5 font-mono text-muted-foreground">{formatCurrency(point.reference, symbol)}</p>
              </div>
            </div>
            {point.cumulativeDiff !== null ? (
              <div className="mt-2 flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2">
                <span className="text-xs font-medium text-muted-foreground">Running difference</span>
                <DiffValue value={point.cumulativeDiff} symbol={symbol} />
              </div>
            ) : null}
          </div>
        )) : (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground sm:px-5">
            Log a day to begin the same-point comparison.
          </p>
        )}
      </div>

      {trackedPoints.length ? <Sheet>
        <SheetTrigger asChild>
          <button
            type="button"
            className="group w-full border-t border-border px-4 py-4 text-left transition-colors hover:bg-secondary/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-5"
            aria-label={`Open cumulative trend for ${title}`}
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Cumulative trend</span>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                View details
                <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
            <div className="h-20 w-full" aria-hidden="true">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={points} margin={{ top: 6, right: 4, bottom: 2, left: 4 }}>
                  <Line type="monotone" dataKey="currentCumulative" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={false} connectNulls={false} />
                  <Line type="monotone" dataKey="projectedCumulative" stroke="hsl(var(--primary))" strokeWidth={2} strokeDasharray="5 4" dot={false} connectNulls={false} />
                  <Line type="monotone" dataKey="referenceCumulative" stroke="hsl(var(--muted-foreground))" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-primary" />This week</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 border-t-2 border-dashed border-primary" />Projection</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 border-t-2 border-dashed border-muted-foreground" />{referenceLabel}</span>
            </div>
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" className="max-h-[88dvh] overflow-y-auto rounded-t-2xl pb-[max(env(safe-area-inset-bottom),1.25rem)] sm:inset-x-auto sm:left-1/2 sm:w-[min(48rem,calc(100vw-2rem))] sm:-translate-x-1/2">
          <SheetHeader className="pr-8 text-left">
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>Actual earnings, historical reference, and an estimated finish at your current tracked-day pace.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 h-72 w-full sm:h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points} margin={{ top: 10, right: 10, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <YAxis
                  width={54}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value: number) => `${symbol}${Math.round(value)}`}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                />
                <Tooltip content={<ComparisonTooltip symbol={symbol} />} />
                <Legend verticalAlign="top" height={36} />
                {lastTrackedDay ? <ReferenceLine x={lastTrackedDay} stroke="hsl(var(--border))" strokeDasharray="3 3" label={{ value: "Today", position: "insideTopRight", fill: "hsl(var(--muted-foreground))", fontSize: 11 }} /> : null}
                <Line name="This week" type="monotone" dataKey="currentCumulative" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} connectNulls={false} />
                <Line name="Projected pace" type="monotone" dataKey="projectedCumulative" stroke="hsl(var(--primary))" strokeWidth={2.5} strokeDasharray="7 5" dot={false} connectNulls={false} />
                <Line name={referenceLabel} type="monotone" dataKey="referenceCumulative" stroke="hsl(var(--muted-foreground))" strokeWidth={2.5} strokeDasharray="6 4" dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 rounded-xl border border-border bg-secondary/40 p-4">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium">Difference at the current point</span>
              <DiffValue value={finalDifference} symbol={symbol} />
            </div>
            {futurePoints.length ? (
              <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3">
                <div>
                  <p className="text-xs text-muted-foreground">Remaining to match</p>
                  <p className="mt-1 font-mono font-semibold">{formatCurrency(remainingToMatch, symbol)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Needed per remaining day</p>
                  <p className="mt-1 font-mono font-semibold">{formatCurrency(requiredPerDay, symbol)}</p>
                </div>
              </div>
            ) : null}
          </div>
        </SheetContent>
      </Sheet> : null}
    </section>
  );
}
