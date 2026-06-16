import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  BarChart3,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  Filter,
  Gauge,
  Layers3,
  MapPinned,
  RefreshCw,
  Table2,
  Trophy,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { buildDeepInsightsData, type DeepInsightsData, type DeepInsightsFilters, type DeepInsightsTimePreset } from "@/lib/deepInsights";
import { formatCurrency } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { StoreContext } from "./types";

const TIME_OPTIONS: Array<{ value: DeepInsightsTimePreset; label: string }> = [
  { value: "all", label: "All time" },
  { value: "this-week", label: "This week" },
  { value: "last-7-days", label: "Last 7 days" },
  { value: "last-30-days", label: "Last 30 days" },
  { value: "last-3-months", label: "Last 3 months" },
  { value: "last-6-months", label: "Last 6 months" },
  { value: "this-year", label: "This year" },
  { value: "last-12-months", label: "Last 12 months" },
];

const CHART_COLORS = ["#E6CE20", "#38BDF8", "#34D399", "#F97316", "#A78BFA", "#F43F5E", "#94A3B8"];

const tooltipStyle = {
  background: "rgba(5, 6, 5, 0.96)",
  border: "1px solid rgba(230, 206, 32, 0.22)",
  borderRadius: 12,
  color: "#fff",
  boxShadow: "0 20px 45px rgba(0,0,0,0.35)",
};

function formatCompact(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: Math.abs(value) >= 10000 ? "compact" : "standard",
    maximumFractionDigits: Math.abs(value) >= 1000 ? 0 : 1,
  }).format(value);
}

function formatHours(value: number): string {
  if (!value) return "0h";
  return `${value.toFixed(value >= 10 ? 1 : 2)}h`;
}

function formatMetric(value: number | null, suffix = ""): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return `${formatCompact(value)}${suffix}`;
}

function ChartTooltip({ valuePrefix = "", valueSuffix = "" }: { valuePrefix?: string; valueSuffix?: string }) {
  return (
    <Tooltip
      cursor={{ fill: "rgba(255,255,255,0.05)", stroke: "rgba(230,206,32,0.18)" }}
      contentStyle={tooltipStyle}
      labelStyle={{ color: "#E6CE20", fontWeight: 700 }}
      itemStyle={{ color: "#fff" }}
      formatter={(value: unknown) => {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) return "—";
        return `${valuePrefix}${formatCompact(numeric)}${valueSuffix}`;
      }}
    />
  );
}

function Panel({
  title,
  subtitle,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-white/10 bg-white/[0.045] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.28)] backdrop-blur", className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="h-4 w-4 text-[#E6CE20]" />}
            <h2 className="text-sm font-bold tracking-wide text-white">{title}</h2>
          </div>
          {subtitle && <p className="text-xs leading-relaxed text-white/52">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-dashed border-white/10 bg-black/20 px-5 text-center text-sm text-white/50">
      {children}
    </div>
  );
}

function KpiCard({
  label,
  value,
  detail,
  tone = "neutral",
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: "neutral" | "yellow" | "blue" | "green";
}) {
  const toneClass = {
    neutral: "from-white/[0.08] to-white/[0.025] border-white/10",
    yellow: "from-[#E6CE20]/16 to-white/[0.025] border-[#E6CE20]/25",
    blue: "from-sky-400/14 to-white/[0.025] border-sky-300/20",
    green: "from-emerald-400/14 to-white/[0.025] border-emerald-300/20",
  }[tone];

  return (
    <div className={cn("rounded-2xl border bg-gradient-to-br p-4", toneClass)}>
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">{label}</p>
      <p className="mt-2 font-mono text-2xl font-black leading-none tracking-tight text-white">{value}</p>
      {detail && <p className="mt-2 text-xs text-white/50">{detail}</p>}
    </div>
  );
}

function DataRows({
  rows,
  empty,
}: {
  rows: Array<{ left: string; sub?: string; right: string; accent?: string }>;
  empty: string;
}) {
  if (!rows.length) {
    return <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/50">{empty}</div>;
  }

  return (
    <div className="divide-y divide-white/10 overflow-hidden rounded-xl border border-white/10 bg-black/20">
      {rows.map((row) => (
        <div key={`${row.left}-${row.sub}-${row.right}`} className="flex items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">{row.left}</p>
            {row.sub && <p className="mt-0.5 truncate text-xs text-white/45">{row.sub}</p>}
          </div>
          <p className={cn("shrink-0 font-mono text-sm font-black text-white", row.accent)}>{row.right}</p>
        </div>
      ))}
    </div>
  );
}

function Filters({
  filters,
  data,
  onChange,
  onReset,
}: {
  filters: DeepInsightsFilters;
  data: DeepInsightsData;
  onChange: (filters: DeepInsightsFilters) => void;
  onReset: () => void;
}) {
  const selectClass = "h-10 rounded-xl border border-white/10 bg-black/45 px-3 text-sm font-semibold text-white outline-none transition focus:border-[#E6CE20]/55";
  const filterActive = filters.timePreset !== "all" || filters.app !== "all" || filters.weekday !== "all";

  return (
    <Panel title="Explore your data" subtitle="Every module below respects these filters." icon={Filter} className="border-[#E6CE20]/15 bg-[#0B0B0B]/80">
      <div className="grid gap-3 md:grid-cols-[1.2fr_1fr_1fr_auto]">
        <label className="grid gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
          Time
          <select
            className={selectClass}
            value={filters.timePreset}
            onChange={(event) => onChange({ ...filters, timePreset: event.target.value as DeepInsightsTimePreset })}
          >
            {TIME_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
          App
          <select
            className={selectClass}
            value={filters.app}
            onChange={(event) => onChange({ ...filters, app: event.target.value })}
          >
            <option value="all">All apps</option>
            {data.appOptions.map((app) => <option key={app} value={app}>{app}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
          Weekday
          <select
            className={selectClass}
            value={filters.weekday}
            onChange={(event) => onChange({ ...filters, weekday: event.target.value })}
          >
            <option value="all">All weekdays</option>
            {data.weekdayOptions.map((weekday) => <option key={weekday} value={weekday}>{weekday}</option>)}
          </select>
        </label>
        <button
          type="button"
          onClick={onReset}
          disabled={!filterActive}
          className="inline-flex h-10 items-center justify-center gap-2 self-end rounded-xl border border-white/10 bg-white/[0.06] px-4 text-sm font-bold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <RefreshCw className="h-4 w-4" />
          Reset
        </button>
      </div>
    </Panel>
  );
}

export default function DeepInsightsPage() {
  const { weeks, earningsSnapshots, settings } = useOutletContext<StoreContext>();
  const [filters, setFilters] = useState<DeepInsightsFilters>({ timePreset: "all", app: "all", weekday: "all" });
  const sym = settings.currencySymbol || "$";
  const data = useMemo(
    () => buildDeepInsightsData({ weeks, earningsSnapshots, filters, currencySymbol: sym }),
    [weeks, earningsSnapshots, filters, sym],
  );

  const trendData = data.days.filter((day) => day.earnings > 0);
  const hourlyWeeks = data.weeks.filter((week) => week.earningsPerHour !== null);
  const mileageWeeks = data.weeks.filter((week) => week.earningsPerMile !== null);
  const hoursWeeks = data.weeks.filter((week) => week.hours > 0);
  const filteredNote = data.appFilterActive
    ? "App filter is active. Efficiency metrics hide because Streex does not store app-specific hours yet."
    : null;

  return (
    <div className="min-h-full bg-[#050605] text-white">
      <div className="pointer-events-none fixed inset-0 -z-0 bg-[radial-gradient(circle_at_25%_10%,rgba(230,206,32,0.14),transparent_26%),radial-gradient(circle_at_80%_0%,rgba(56,189,248,0.12),transparent_25%),linear-gradient(180deg,#050605_0%,#0B0B0B_48%,#050605_100%)]" />
      <div className="relative z-10 mx-auto max-w-[1500px] space-y-5 px-4 py-5 sm:px-6 lg:px-8">
        <header className="overflow-hidden rounded-3xl border border-[#E6CE20]/20 bg-[#0B0B0B]/86 p-5 shadow-[0_30px_100px_rgba(0,0,0,0.45)] lg:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <p className="text-[11px] font-black uppercase tracking-[0.34em] text-[#E6CE20]">Streex Control Room</p>
              <div>
                <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">Deep Insights</h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/58">
                  Your career, visualized. Desktop-first analytics built from your real earnings, shifts, rides, miles, and snapshots.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-right sm:grid-cols-4 lg:min-w-[520px]">
              <KpiCard label="Period" value={data.rangeLabel} detail={`${data.totals.activeDays} earning days`} tone="yellow" />
              <KpiCard label="Earnings" value={formatCurrency(data.totals.earnings, sym)} detail="Filtered total" tone="blue" />
              <KpiCard label="Hours" value={formatHours(data.totals.hours)} detail={data.totals.hours ? "Valid shift time" : "No shift time"} />
              <KpiCard label="Avg / hr" value={data.totals.earningsPerHour ? `${formatCurrency(data.totals.earningsPerHour, sym)}/hr` : "—"} detail="Operational only" tone="green" />
            </div>
          </div>
        </header>

        <Filters filters={filters} data={data} onChange={setFilters} onReset={() => setFilters({ timePreset: "all", app: "all", weekday: "all" })} />

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
          <KpiCard label="Avg / mile" value={data.totals.earningsPerMile ? `${formatCurrency(data.totals.earningsPerMile, sym)}/mi` : "—"} detail={data.totals.miles ? `${formatCompact(data.totals.miles)} miles` : "No mileage"} />
          <KpiCard label="Best day" value={data.totals.bestDay ? formatCurrency(data.totals.bestDay.earnings, sym) : "—"} detail={data.totals.bestDay ? `${data.totals.bestDay.dayName} · ${data.totals.bestDay.date}` : "No earning days"} tone="yellow" />
          <KpiCard label="Best week" value={data.totals.bestWeek ? formatCurrency(data.totals.bestWeek.earnings, sym) : "—"} detail={data.totals.bestWeek?.label ?? "No weeks"} />
          <KpiCard label="Shifts" value={formatCompact(data.totals.shifts)} detail="Recorded blocks" />
          <KpiCard label="Rides" value={formatCompact(data.totals.rides)} detail={data.totals.rides ? "Recorded rides" : "No ride data"} />
          <KpiCard label="Miles" value={formatCompact(data.totals.miles)} detail={data.totals.miles ? "Recorded miles" : "No mileage"} />
          <KpiCard label="Active days" value={formatCompact(data.totals.activeDays)} detail="Days with earnings" />
          <KpiCard label="Operational" value={formatCurrency(data.totals.operationalEarnings, sym)} detail="Bonus/reward excluded" tone="green" />
        </section>

        {filteredNote && (
          <div className="rounded-2xl border border-[#E6CE20]/20 bg-[#E6CE20]/10 px-4 py-3 text-sm text-[#F8E875]">
            {filteredNote}
          </div>
        )}

        <section className="grid gap-5 xl:grid-cols-[1.35fr_0.85fr]">
          <Panel title="Earnings Trend" subtitle="Daily earnings across the selected period." icon={Activity}>
            {trendData.length ? (
              <div className="h-[330px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="deepTrend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#E6CE20" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#E6CE20" stopOpacity={0.04} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                    <XAxis dataKey="label" stroke="rgba(255,255,255,0.35)" tickLine={false} axisLine={false} minTickGap={26} />
                    <YAxis stroke="rgba(255,255,255,0.35)" tickLine={false} axisLine={false} tickFormatter={(value) => `$${formatCompact(Number(value))}`} />
                    <ChartTooltip valuePrefix={sym} />
                    <Area type="monotone" dataKey="earnings" stroke="#E6CE20" strokeWidth={3} fill="url(#deepTrend)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState>No records found for this period. Try expanding the date range.</EmptyState>
            )}
          </Panel>

          <Panel title="App Contribution" subtitle="Money mix by platform, including bonuses assigned to each app." icon={Layers3}>
            {data.appBreakdown.length ? (
              <div className="grid gap-4 md:grid-cols-[220px_1fr] xl:grid-cols-1">
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data.appBreakdown} dataKey="earnings" nameKey="app" innerRadius={58} outerRadius={88} paddingAngle={3}>
                        {data.appBreakdown.map((entry, index) => <Cell key={entry.app} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                      </Pie>
                      <ChartTooltip valuePrefix={sym} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <DataRows
                  empty="No app earnings in this period."
                  rows={data.appBreakdown.slice(0, 6).map((app, index) => ({
                    left: app.app,
                    sub: `${Math.round(app.share)}% · ${app.days} active days`,
                    right: formatCurrency(app.earnings, sym),
                    accent: index === 0 ? "text-[#E6CE20]" : undefined,
                  }))}
                />
              </div>
            ) : (
              <EmptyState>No app/platform earnings found for this period.</EmptyState>
            )}
          </Panel>
        </section>

        <section className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
          <Panel title="Weekly Comparison" subtitle="Filtered earnings grouped by tracked week." icon={BarChart3}>
            {data.weeks.length ? (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.weeks}>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                    <XAxis dataKey="label" stroke="rgba(255,255,255,0.35)" tickLine={false} axisLine={false} minTickGap={18} />
                    <YAxis stroke="rgba(255,255,255,0.35)" tickLine={false} axisLine={false} tickFormatter={(value) => `$${formatCompact(Number(value))}`} />
                    <ChartTooltip valuePrefix={sym} />
                    <Bar dataKey="earnings" radius={[8, 8, 2, 2]} fill="#38BDF8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState>No weekly records found for this period.</EmptyState>
            )}
          </Panel>

          <Panel title="Weekday Earnings" subtitle="Average earning day by weekday in the selected view." icon={CalendarDays}>
            {data.weekdayEarnings.some((day) => day.earnings > 0) ? (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.weekdayEarnings}>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                    <XAxis dataKey="dayName" stroke="rgba(255,255,255,0.35)" tickLine={false} axisLine={false} tickFormatter={(value) => String(value).slice(0, 3)} />
                    <YAxis stroke="rgba(255,255,255,0.35)" tickLine={false} axisLine={false} tickFormatter={(value) => `$${formatCompact(Number(value))}`} />
                    <ChartTooltip valuePrefix={sym} />
                    <Bar dataKey="average" radius={[8, 8, 2, 2]} fill="#E6CE20" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState>No earning days available for this weekday filter.</EmptyState>
            )}
          </Panel>

          <Panel title="Hours Worked" subtitle="Valid shift duration only. Missing shift time stays hidden." icon={Clock3}>
            {hoursWeeks.length ? (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hoursWeeks}>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                    <XAxis dataKey="label" stroke="rgba(255,255,255,0.35)" tickLine={false} axisLine={false} minTickGap={18} />
                    <YAxis stroke="rgba(255,255,255,0.35)" tickLine={false} axisLine={false} tickFormatter={(value) => `${formatCompact(Number(value))}h`} />
                    <ChartTooltip valueSuffix="h" />
                    <Bar dataKey="hours" radius={[8, 8, 2, 2]} fill="#34D399" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState>No shift-duration data recorded for this period.</EmptyState>
            )}
          </Panel>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <Panel title="Earnings / Hour Trend" subtitle="Uses operational earnings only when valid shift duration exists." icon={Gauge}>
            {hourlyWeeks.length ? (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={hourlyWeeks}>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                    <XAxis dataKey="label" stroke="rgba(255,255,255,0.35)" tickLine={false} axisLine={false} minTickGap={18} />
                    <YAxis stroke="rgba(255,255,255,0.35)" tickLine={false} axisLine={false} tickFormatter={(value) => `$${formatCompact(Number(value))}`} />
                    <ChartTooltip valuePrefix={sym} valueSuffix="/hr" />
                    <Line type="monotone" dataKey="earningsPerHour" stroke="#34D399" strokeWidth={3} dot={{ r: 3, fill: "#34D399" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState>No hourly efficiency can be calculated for this period.</EmptyState>
            )}
          </Panel>

          <Panel title="Earnings / Mile Trend" subtitle="Appears only where mileage exists." icon={MapPinned}>
            {mileageWeeks.length ? (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={mileageWeeks}>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                    <XAxis dataKey="label" stroke="rgba(255,255,255,0.35)" tickLine={false} axisLine={false} minTickGap={18} />
                    <YAxis stroke="rgba(255,255,255,0.35)" tickLine={false} axisLine={false} tickFormatter={(value) => `$${Number(value).toFixed(1)}`} />
                    <ChartTooltip valuePrefix={sym} valueSuffix="/mi" />
                    <Line type="monotone" dataKey="earningsPerMile" stroke="#A78BFA" strokeWidth={3} dot={{ r: 3, fill: "#A78BFA" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState>No mileage data recorded for this period.</EmptyState>
            )}
          </Panel>
        </section>

        <section className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
          <Panel title="Data-Supported Signals" subtitle="Short conclusions only when the filtered data supports them." icon={CircleDollarSign}>
            {data.insights.length ? (
              <div className="space-y-3">
                {data.insights.map((insight) => (
                  <div key={insight} className="rounded-xl border border-[#E6CE20]/18 bg-[#E6CE20]/8 px-4 py-3 text-sm leading-relaxed text-white/78">
                    {insight}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState>Insights will appear once this view has enough earnings, app, shift, or mileage data.</EmptyState>
            )}
          </Panel>

          <Panel title="Performance Tables" subtitle="Rankings are deterministic and filtered by the current controls." icon={Table2}>
            <div className="grid gap-4 lg:grid-cols-2">
              <DataRows
                empty="No earning days in this period."
                rows={data.topDays.slice(0, 5).map((day, index) => ({
                  left: `${index + 1}. ${day.dayName}`,
                  sub: day.date,
                  right: formatCurrency(day.earnings, sym),
                  accent: index === 0 ? "text-[#E6CE20]" : undefined,
                }))}
              />
              <DataRows
                empty="No low-day rankings for this period."
                rows={data.lowDays.slice(0, 5).map((day) => ({
                  left: day.dayName,
                  sub: day.date,
                  right: formatCurrency(day.earnings, sym),
                }))}
              />
              <DataRows
                empty="No weekly rankings for this period."
                rows={data.bestWeeks.slice(0, 5).map((week, index) => ({
                  left: `${index + 1}. ${week.label}`,
                  sub: `${formatHours(week.hours)} · ${week.shifts} shifts`,
                  right: formatCurrency(week.earnings, sym),
                  accent: index === 0 ? "text-[#E6CE20]" : undefined,
                }))}
              />
              <DataRows
                empty="No shift-level earnings can be resolved for this period."
                rows={data.bestShifts.slice(0, 5).map((shift, index) => ({
                  left: `${index + 1}. ${shift.dayName}`,
                  sub: `${shift.date} · ${shift.label} · ${shift.source}`,
                  right: `${formatCurrency(shift.rate, sym)}/hr`,
                  accent: index === 0 ? "text-[#E6CE20]" : undefined,
                }))}
              />
            </div>
          </Panel>
        </section>

        <Panel title="App Performance Breakdown" subtitle="Totals by platform in the selected filter." icon={Trophy}>
          <DataRows
            empty="No app performance data for this period."
            rows={data.appBreakdown.map((app, index) => ({
              left: app.app,
              sub: `${app.days} active days · ${Math.round(app.share)}% share`,
              right: formatCurrency(app.earnings, sym),
              accent: index === 0 ? "text-[#E6CE20]" : undefined,
            }))}
          />
        </Panel>
      </div>
    </div>
  );
}
