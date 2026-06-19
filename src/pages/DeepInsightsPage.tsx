import { useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
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
import AdvancedComparisonBuilder from "@/components/AdvancedComparisonBuilder";
import { useTheme } from "@/contexts/ThemeContext";
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

interface DeepInsightsVisual {
  shell: string;
  aurora: string;
  hero: string;
  panel: string;
  filterPanel: string;
  kpiBase: string;
  kpiTones: Record<"neutral" | "yellow" | "blue" | "green", string>;
  text: string;
  muted: string;
  quiet: string;
  label: string;
  table: string;
  rowDivider: string;
  empty: string;
  select: string;
  reset: string;
  note: string;
  insight: string;
  gridStroke: string;
  axisStroke: string;
  tooltip: CSSProperties;
  tooltipLabel: CSSProperties;
  tooltipItem: CSSProperties;
}

function getVisual(isDark: boolean): DeepInsightsVisual {
  if (isDark) {
    return {
      shell: "bg-[#050605] text-white",
      aurora: "bg-[radial-gradient(circle_at_25%_10%,rgba(230,206,32,0.14),transparent_26%),radial-gradient(circle_at_80%_0%,rgba(56,189,248,0.12),transparent_25%),linear-gradient(180deg,#050605_0%,#0B0B0B_48%,#050605_100%)]",
      hero: "border-[#E6CE20]/20 bg-[#0B0B0B]/86 shadow-[0_30px_100px_rgba(0,0,0,0.45)]",
      panel: "border-white/10 bg-white/[0.045] shadow-[0_18px_60px_rgba(0,0,0,0.28)]",
      filterPanel: "border-[#E6CE20]/15 bg-[#0B0B0B]/80",
      kpiBase: "border bg-gradient-to-br",
      kpiTones: {
        neutral: "from-white/[0.08] to-white/[0.025] border-white/10",
        yellow: "from-[#E6CE20]/16 to-white/[0.025] border-[#E6CE20]/25",
        blue: "from-sky-400/14 to-white/[0.025] border-sky-300/20",
        green: "from-emerald-400/14 to-white/[0.025] border-emerald-300/20",
      },
      text: "text-white",
      muted: "text-white/58",
      quiet: "text-white/45",
      label: "text-white/45",
      table: "divide-y divide-white/10 border-white/10 bg-black/20",
      rowDivider: "border-white/10 bg-black/20",
      empty: "border-white/10 bg-black/20 text-white/50",
      select: "border-white/10 bg-black/45 text-white focus:border-[#E6CE20]/55",
      reset: "border-white/10 bg-white/[0.06] text-white hover:bg-white/10",
      note: "border-[#E6CE20]/20 bg-[#E6CE20]/10 text-[#F8E875]",
      insight: "border-[#E6CE20]/18 bg-[#E6CE20]/8 text-white/78",
      gridStroke: "rgba(255,255,255,0.08)",
      axisStroke: "rgba(255,255,255,0.35)",
      tooltip: {
        background: "rgba(5, 6, 5, 0.96)",
        border: "1px solid rgba(230, 206, 32, 0.22)",
        borderRadius: 12,
        color: "#fff",
        boxShadow: "0 20px 45px rgba(0,0,0,0.35)",
      },
      tooltipLabel: { color: "#E6CE20", fontWeight: 700 },
      tooltipItem: { color: "#fff" },
    };
  }

  return {
    shell: "bg-[#F7F8FA] text-slate-950",
    aurora: "bg-[radial-gradient(circle_at_20%_0%,rgba(230,206,32,0.18),transparent_30%),radial-gradient(circle_at_82%_4%,rgba(37,99,235,0.12),transparent_28%),linear-gradient(180deg,#FFFFFF_0%,#F7F8FA_42%,#EEF3F8_100%)]",
    hero: "border-slate-200/90 bg-white/88 shadow-[0_24px_80px_rgba(15,23,42,0.10)]",
    panel: "border-slate-200/90 bg-white/82 shadow-[0_16px_50px_rgba(15,23,42,0.08)]",
    filterPanel: "border-[#E6CE20]/30 bg-white/88",
    kpiBase: "border bg-gradient-to-br shadow-sm",
    kpiTones: {
      neutral: "from-white to-slate-50 border-slate-200/95",
      yellow: "from-[#FFF8B7] to-white border-[#E6CE20]/45",
      blue: "from-sky-50 to-white border-sky-200",
      green: "from-emerald-50 to-white border-emerald-200",
    },
    text: "text-slate-950",
    muted: "text-slate-600",
    quiet: "text-slate-500",
    label: "text-slate-500",
    table: "divide-y divide-slate-200 border-slate-200 bg-white/78",
    rowDivider: "border-slate-200 bg-white/78",
    empty: "border-slate-300 bg-slate-50/80 text-slate-500",
    select: "border-slate-200 bg-white text-slate-950 focus:border-[#D8BD00]",
    reset: "border-slate-200 bg-white text-slate-800 hover:bg-slate-50",
    note: "border-[#E6CE20]/45 bg-[#FFF8B7]/70 text-slate-800",
    insight: "border-[#E6CE20]/35 bg-[#FFF8B7]/45 text-slate-800",
    gridStroke: "rgba(15,23,42,0.10)",
    axisStroke: "rgba(15,23,42,0.48)",
    tooltip: {
      background: "rgba(255, 255, 255, 0.98)",
      border: "1px solid rgba(148, 163, 184, 0.45)",
      borderRadius: 12,
      color: "#0f172a",
      boxShadow: "0 20px 45px rgba(15,23,42,0.14)",
    },
    tooltipLabel: { color: "#8A7600", fontWeight: 700 },
    tooltipItem: { color: "#0f172a" },
  };
}

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

function ChartTooltip({ ui, valuePrefix = "", valueSuffix = "" }: { ui: DeepInsightsVisual; valuePrefix?: string; valueSuffix?: string }) {
  return (
    <Tooltip
      cursor={{ fill: "rgba(230,206,32,0.08)", stroke: "rgba(230,206,32,0.2)" }}
      contentStyle={ui.tooltip}
      labelStyle={ui.tooltipLabel}
      itemStyle={ui.tooltipItem}
      formatter={(value: unknown) => {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) return "—";
        return `${valuePrefix}${formatCompact(numeric)}${valueSuffix}`;
      }}
    />
  );
}

function Panel({
  ui,
  title,
  subtitle,
  icon: Icon,
  children,
  className,
}: {
  ui: DeepInsightsVisual;
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border p-4 backdrop-blur", ui.panel, className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="h-4 w-4 text-[#E6CE20]" />}
            <h2 className={cn("text-sm font-bold tracking-wide", ui.text)}>{title}</h2>
          </div>
          {subtitle && <p className={cn("text-xs leading-relaxed", ui.muted)}>{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function EmptyState({ ui, children }: { ui: DeepInsightsVisual; children: ReactNode }) {
  return (
    <div className={cn("flex min-h-[220px] items-center justify-center rounded-xl border border-dashed px-5 text-center text-sm", ui.empty)}>
      {children}
    </div>
  );
}

function KpiCard({
  ui,
  label,
  value,
  detail,
  tone = "neutral",
}: {
  ui: DeepInsightsVisual;
  label: string;
  value: string;
  detail?: string;
  tone?: "neutral" | "yellow" | "blue" | "green";
}) {
  const toneClass = ui.kpiTones[tone];

  return (
    <div className={cn("rounded-2xl p-4", ui.kpiBase, toneClass)}>
      <p className={cn("text-[10px] font-black uppercase tracking-[0.18em]", ui.label)}>{label}</p>
      <p className={cn("mt-2 font-mono text-2xl font-black leading-none tracking-tight", ui.text)}>{value}</p>
      {detail && <p className={cn("mt-2 text-xs", ui.quiet)}>{detail}</p>}
    </div>
  );
}

function DataRows({
  ui,
  rows,
  empty,
}: {
  ui: DeepInsightsVisual;
  rows: Array<{ left: string; sub?: string; right: string; accent?: string }>;
  empty: string;
}) {
  if (!rows.length) {
    return <div className={cn("rounded-xl border p-4 text-sm", ui.rowDivider, ui.quiet)}>{empty}</div>;
  }

  return (
    <div className={cn("overflow-hidden rounded-xl border", ui.table)}>
      {rows.map((row) => (
        <div key={`${row.left}-${row.sub}-${row.right}`} className="flex items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            <p className={cn("truncate text-sm font-bold", ui.text)}>{row.left}</p>
            {row.sub && <p className={cn("mt-0.5 truncate text-xs", ui.quiet)}>{row.sub}</p>}
          </div>
          <p className={cn("shrink-0 font-mono text-sm font-black", ui.text, row.accent)}>{row.right}</p>
        </div>
      ))}
    </div>
  );
}

function Filters({
  ui,
  filters,
  data,
  onChange,
  onReset,
}: {
  ui: DeepInsightsVisual;
  filters: DeepInsightsFilters;
  data: DeepInsightsData;
  onChange: (filters: DeepInsightsFilters) => void;
  onReset: () => void;
}) {
  const selectClass = cn("h-10 rounded-xl border px-3 text-sm font-semibold outline-none transition", ui.select);
  const filterActive = filters.timePreset !== "all" || filters.app !== "all" || filters.weekday !== "all";

  return (
    <Panel ui={ui} title="Explore your data" subtitle="Every module below respects these filters." icon={Filter} className={ui.filterPanel}>
      <div className="grid gap-3 md:grid-cols-[1.2fr_1fr_1fr_auto]">
        <label className={cn("grid gap-1.5 text-[10px] font-black uppercase tracking-[0.18em]", ui.label)}>
          Time
          <select
            className={selectClass}
            value={filters.timePreset}
            onChange={(event) => onChange({ ...filters, timePreset: event.target.value as DeepInsightsTimePreset })}
          >
            {TIME_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label className={cn("grid gap-1.5 text-[10px] font-black uppercase tracking-[0.18em]", ui.label)}>
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
        <label className={cn("grid gap-1.5 text-[10px] font-black uppercase tracking-[0.18em]", ui.label)}>
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
          className={cn("inline-flex h-10 items-center justify-center gap-2 self-end rounded-xl border px-4 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-45", ui.reset)}
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
  const [searchParams, setSearchParams] = useSearchParams();
  const { isDark } = useTheme();
  const ui = useMemo(() => getVisual(isDark), [isDark]);
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
  const activeView = searchParams.get("view") === "compare" ? "compare" : "overview";

  function setActiveView(view: "overview" | "compare") {
    const next = new URLSearchParams(searchParams);
    if (view === "overview") next.delete("view");
    else next.set("view", "compare");
    setSearchParams(next, { replace: true });
  }

  return (
    <div className={cn("min-h-full", ui.shell)}>
      <div className={cn("pointer-events-none fixed inset-0 -z-0", ui.aurora)} />
      <div className="relative z-10 mx-auto max-w-[1500px] space-y-5 px-4 py-5 sm:px-6 lg:px-8">
        <header className={cn("overflow-hidden rounded-3xl border p-5 lg:p-7", ui.hero)}>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <p className="text-[11px] font-black uppercase tracking-[0.34em] text-[#E6CE20]">Streex Control Room</p>
              <div>
                <h1 className={cn("text-4xl font-black tracking-tight sm:text-5xl", ui.text)}>Deep Insights</h1>
                <p className={cn("mt-2 max-w-2xl text-sm leading-relaxed", ui.muted)}>
                  Your career, visualized. Desktop-first analytics built from your real earnings, shifts, rides, miles, and snapshots.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-right sm:grid-cols-4 lg:min-w-[520px]">
              <KpiCard ui={ui} label="Period" value={data.rangeLabel} detail={`${data.totals.activeDays} earning days`} tone="yellow" />
              <KpiCard ui={ui} label="Earnings" value={formatCurrency(data.totals.earnings, sym)} detail="Filtered total" tone="blue" />
              <KpiCard ui={ui} label="Hours" value={formatHours(data.totals.hours)} detail={data.totals.hours ? "Valid shift time" : "No shift time"} />
              <KpiCard ui={ui} label="Avg / hr" value={data.totals.earningsPerHour ? `${formatCurrency(data.totals.earningsPerHour, sym)}/hr` : "—"} detail="Operational only" tone="green" />
            </div>
          </div>
        </header>

        <div className={cn("grid grid-cols-2 rounded-2xl border p-1", ui.filterPanel)} role="tablist" aria-label="Deep Insights view">
          <button
            type="button"
            role="tab"
            aria-selected={activeView === "overview"}
            onClick={() => setActiveView("overview")}
            className={cn(
              "h-10 rounded-xl text-sm font-bold transition",
              activeView === "overview"
                ? "bg-[#E6CE20] text-[#0B0B0B] shadow-sm"
                : cn(ui.muted, isDark ? "hover:bg-white/[0.05]" : "hover:bg-slate-100"),
            )}
          >
            Overview
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeView === "compare"}
            onClick={() => setActiveView("compare")}
            className={cn(
              "h-10 rounded-xl text-sm font-bold transition",
              activeView === "compare"
                ? "bg-[#E6CE20] text-[#0B0B0B] shadow-sm"
                : cn(ui.muted, isDark ? "hover:bg-white/[0.05]" : "hover:bg-slate-100"),
            )}
          >
            Compare
          </button>
        </div>

        {activeView === "compare" ? (
          <AdvancedComparisonBuilder weeks={weeks} currencySymbol={sym} />
        ) : (
          <>
        <Filters ui={ui} filters={filters} data={data} onChange={setFilters} onReset={() => setFilters({ timePreset: "all", app: "all", weekday: "all" })} />

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
          <KpiCard ui={ui} label="Avg / mile" value={data.totals.earningsPerMile ? `${formatCurrency(data.totals.earningsPerMile, sym)}/mi` : "—"} detail={data.totals.miles ? `${formatCompact(data.totals.miles)} miles` : "No mileage"} />
          <KpiCard ui={ui} label="Best day" value={data.totals.bestDay ? formatCurrency(data.totals.bestDay.earnings, sym) : "—"} detail={data.totals.bestDay ? `${data.totals.bestDay.dayName} · ${data.totals.bestDay.date}` : "No earning days"} tone="yellow" />
          <KpiCard ui={ui} label="Best week" value={data.totals.bestWeek ? formatCurrency(data.totals.bestWeek.earnings, sym) : "—"} detail={data.totals.bestWeek?.label ?? "No weeks"} />
          <KpiCard ui={ui} label="Shifts" value={formatCompact(data.totals.shifts)} detail="Recorded blocks" />
          <KpiCard ui={ui} label="Rides" value={formatCompact(data.totals.rides)} detail={data.totals.rides ? "Recorded rides" : "No ride data"} />
          <KpiCard ui={ui} label="Miles" value={formatCompact(data.totals.miles)} detail={data.totals.miles ? "Recorded miles" : "No mileage"} />
          <KpiCard ui={ui} label="Active days" value={formatCompact(data.totals.activeDays)} detail="Days with earnings" />
          <KpiCard ui={ui} label="Operational" value={formatCurrency(data.totals.operationalEarnings, sym)} detail="Bonus/reward excluded" tone="green" />
        </section>

        {filteredNote && (
          <div className={cn("rounded-2xl border px-4 py-3 text-sm", ui.note)}>
            {filteredNote}
          </div>
        )}

        <section className="grid gap-5 xl:grid-cols-[1.35fr_0.85fr]">
          <Panel ui={ui} title="Earnings Trend" subtitle="Daily earnings across the selected period." icon={Activity}>
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
                    <CartesianGrid stroke={ui.gridStroke} vertical={false} />
                    <XAxis dataKey="label" stroke={ui.axisStroke} tickLine={false} axisLine={false} minTickGap={26} />
                    <YAxis stroke={ui.axisStroke} tickLine={false} axisLine={false} tickFormatter={(value) => `$${formatCompact(Number(value))}`} />
                    <ChartTooltip ui={ui} valuePrefix={sym} />
                    <Area type="monotone" dataKey="earnings" stroke="#E6CE20" strokeWidth={3} fill="url(#deepTrend)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState ui={ui}>No records found for this period. Try expanding the date range.</EmptyState>
            )}
          </Panel>

          <Panel ui={ui} title="App Contribution" subtitle="Money mix by platform, including bonuses assigned to each app." icon={Layers3}>
            {data.appBreakdown.length ? (
              <div className="grid gap-4 md:grid-cols-[220px_1fr] xl:grid-cols-1">
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data.appBreakdown} dataKey="earnings" nameKey="app" innerRadius={58} outerRadius={88} paddingAngle={3}>
                        {data.appBreakdown.map((entry, index) => <Cell key={entry.app} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                      </Pie>
                      <ChartTooltip ui={ui} valuePrefix={sym} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <DataRows
                  ui={ui}
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
              <EmptyState ui={ui}>No app/platform earnings found for this period.</EmptyState>
            )}
          </Panel>
        </section>

        <section className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
          <Panel ui={ui} title="Weekly Comparison" subtitle="Filtered earnings grouped by tracked week." icon={BarChart3}>
            {data.weeks.length ? (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.weeks}>
                    <CartesianGrid stroke={ui.gridStroke} vertical={false} />
                    <XAxis dataKey="label" stroke={ui.axisStroke} tickLine={false} axisLine={false} minTickGap={18} />
                    <YAxis stroke={ui.axisStroke} tickLine={false} axisLine={false} tickFormatter={(value) => `$${formatCompact(Number(value))}`} />
                    <ChartTooltip ui={ui} valuePrefix={sym} />
                    <Bar dataKey="earnings" radius={[8, 8, 2, 2]} fill="#38BDF8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState ui={ui}>No weekly records found for this period.</EmptyState>
            )}
          </Panel>

          <Panel ui={ui} title="Weekday Earnings" subtitle="Average earning day by weekday in the selected view." icon={CalendarDays}>
            {data.weekdayEarnings.some((day) => day.earnings > 0) ? (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.weekdayEarnings}>
                    <CartesianGrid stroke={ui.gridStroke} vertical={false} />
                    <XAxis dataKey="dayName" stroke={ui.axisStroke} tickLine={false} axisLine={false} tickFormatter={(value) => String(value).slice(0, 3)} />
                    <YAxis stroke={ui.axisStroke} tickLine={false} axisLine={false} tickFormatter={(value) => `$${formatCompact(Number(value))}`} />
                    <ChartTooltip ui={ui} valuePrefix={sym} />
                    <Bar dataKey="average" radius={[8, 8, 2, 2]} fill="#E6CE20" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState ui={ui}>No earning days available for this weekday filter.</EmptyState>
            )}
          </Panel>

          <Panel ui={ui} title="Hours Worked" subtitle="Valid shift duration only. Missing shift time stays hidden." icon={Clock3}>
            {hoursWeeks.length ? (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hoursWeeks}>
                    <CartesianGrid stroke={ui.gridStroke} vertical={false} />
                    <XAxis dataKey="label" stroke={ui.axisStroke} tickLine={false} axisLine={false} minTickGap={18} />
                    <YAxis stroke={ui.axisStroke} tickLine={false} axisLine={false} tickFormatter={(value) => `${formatCompact(Number(value))}h`} />
                    <ChartTooltip ui={ui} valueSuffix="h" />
                    <Bar dataKey="hours" radius={[8, 8, 2, 2]} fill="#34D399" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState ui={ui}>No shift-duration data recorded for this period.</EmptyState>
            )}
          </Panel>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <Panel ui={ui} title="Earnings / Hour Trend" subtitle="Uses operational earnings only when valid shift duration exists." icon={Gauge}>
            {hourlyWeeks.length ? (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={hourlyWeeks}>
                    <CartesianGrid stroke={ui.gridStroke} vertical={false} />
                    <XAxis dataKey="label" stroke={ui.axisStroke} tickLine={false} axisLine={false} minTickGap={18} />
                    <YAxis stroke={ui.axisStroke} tickLine={false} axisLine={false} tickFormatter={(value) => `$${formatCompact(Number(value))}`} />
                    <ChartTooltip ui={ui} valuePrefix={sym} valueSuffix="/hr" />
                    <Line type="monotone" dataKey="earningsPerHour" stroke="#34D399" strokeWidth={3} dot={{ r: 3, fill: "#34D399" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState ui={ui}>No hourly efficiency can be calculated for this period.</EmptyState>
            )}
          </Panel>

          <Panel ui={ui} title="Earnings / Mile Trend" subtitle="Appears only where mileage exists." icon={MapPinned}>
            {mileageWeeks.length ? (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={mileageWeeks}>
                    <CartesianGrid stroke={ui.gridStroke} vertical={false} />
                    <XAxis dataKey="label" stroke={ui.axisStroke} tickLine={false} axisLine={false} minTickGap={18} />
                    <YAxis stroke={ui.axisStroke} tickLine={false} axisLine={false} tickFormatter={(value) => `$${Number(value).toFixed(1)}`} />
                    <ChartTooltip ui={ui} valuePrefix={sym} valueSuffix="/mi" />
                    <Line type="monotone" dataKey="earningsPerMile" stroke="#A78BFA" strokeWidth={3} dot={{ r: 3, fill: "#A78BFA" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState ui={ui}>No mileage data recorded for this period.</EmptyState>
            )}
          </Panel>
        </section>

        <section className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
          <Panel ui={ui} title="Data-Supported Signals" subtitle="Short conclusions only when the filtered data supports them." icon={CircleDollarSign}>
            {data.insights.length ? (
              <div className="space-y-3">
                {data.insights.map((insight) => (
                  <div key={insight} className={cn("rounded-xl border px-4 py-3 text-sm leading-relaxed", ui.insight)}>
                    {insight}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState ui={ui}>Insights will appear once this view has enough earnings, app, shift, or mileage data.</EmptyState>
            )}
          </Panel>

          <Panel ui={ui} title="Performance Tables" subtitle="Rankings are deterministic and filtered by the current controls." icon={Table2}>
            <div className="grid gap-4 lg:grid-cols-2">
              <DataRows
                ui={ui}
                empty="No earning days in this period."
                rows={data.topDays.slice(0, 5).map((day, index) => ({
                  left: `${index + 1}. ${day.dayName}`,
                  sub: day.date,
                  right: formatCurrency(day.earnings, sym),
                  accent: index === 0 ? "text-[#E6CE20]" : undefined,
                }))}
              />
              <DataRows
                ui={ui}
                empty="No low-day rankings for this period."
                rows={data.lowDays.slice(0, 5).map((day) => ({
                  left: day.dayName,
                  sub: day.date,
                  right: formatCurrency(day.earnings, sym),
                }))}
              />
              <DataRows
                ui={ui}
                empty="No weekly rankings for this period."
                rows={data.bestWeeks.slice(0, 5).map((week, index) => ({
                  left: `${index + 1}. ${week.label}`,
                  sub: `${formatHours(week.hours)} · ${week.shifts} shifts`,
                  right: formatCurrency(week.earnings, sym),
                  accent: index === 0 ? "text-[#E6CE20]" : undefined,
                }))}
              />
              <DataRows
                ui={ui}
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

        <Panel ui={ui} title="App Performance Breakdown" subtitle="Totals by platform in the selected filter." icon={Trophy}>
          <DataRows
            ui={ui}
            empty="No app performance data for this period."
            rows={data.appBreakdown.map((app, index) => ({
              left: app.app,
              sub: `${app.days} active days · ${Math.round(app.share)}% share`,
              right: formatCurrency(app.earnings, sym),
              accent: index === 0 ? "text-[#E6CE20]" : undefined,
            }))}
          />
        </Panel>
          </>
        )}
      </div>
    </div>
  );
}
