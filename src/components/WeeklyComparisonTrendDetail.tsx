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
import { formatCurrency } from "@/lib/store";
import type { WeeklyComparisonPoint } from "@/lib/weeklyComparison";

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

export default function WeeklyComparisonTrendDetail({
  points,
  symbol,
  referenceLabel,
  referenceStroke,
  lastTrackedDay,
}: {
  points: WeeklyComparisonPoint[];
  symbol: string;
  referenceLabel: string;
  referenceStroke: string;
  lastTrackedDay?: string;
}) {
  return (
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
          <Line name={referenceLabel} type="monotone" dataKey="referenceCumulative" stroke={referenceStroke} strokeWidth={2.5} strokeDasharray="6 4" dot={{ r: 3 }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
