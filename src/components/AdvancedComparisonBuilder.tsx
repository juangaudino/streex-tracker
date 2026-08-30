import { useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, BarChart3, CalendarRange, Clock, Filter, Gauge, Layers, Plus, RefreshCw, Route, Scale, Trophy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/contexts/ThemeContext";
import {
  buildComparisonData,
  buildDefaultComparisonBlocks,
  buildOperationsLeaderboard,
  comparisonRangeForType,
  formatComparisonDate,
  type ComparisonBlock,
  type ComparisonBlockType,
  type ComparisonMetrics,
  type ComparisonResult,
  type OperationsRankingMetric,
  type OperationsRankingScope,
} from "@/lib/comparisonBuilder";
import { formatCurrency } from "@/lib/store";
import type { WeekRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  weeks: WeekRecord[];
  currencySymbol: string;
  viewTabs?: ReactNode;
}

interface MetricDefinition {
  id: string;
  label: string;
  read: (metrics: ComparisonMetrics) => number | null;
  format: (value: number, result: ComparisonResult) => string;
  axisFormat: (value: number) => string;
  highlight?: boolean;
  detail?: (result: ComparisonResult) => string | undefined;
}

type ComparisonLens = "performance" | "operations";

const BLOCK_TYPES: Array<{ value: ComparisonBlockType; label: string }> = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
  { value: "custom", label: "Custom" },
];

const BLOCK_ACCENTS = [
  { color: "#E6CE20", darker: "#A48B00" },
  { color: "#38BDF8", darker: "#0284C7" },
  { color: "#34D399", darker: "#059669" },
  { color: "#A78BFA", darker: "#6D28D9" },
];

function accentFor(index: number) {
  return BLOCK_ACCENTS[index % BLOCK_ACCENTS.length];
}

function isDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function readBlocks(raw: string | null): ComparisonBlock[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length < 2 || parsed.length > 4) return null;
    const validTypes = new Set(BLOCK_TYPES.map((type) => type.value));
    const blocks = parsed.filter((block): block is ComparisonBlock => {
      if (!block || typeof block !== "object") return false;
      const candidate = block as Partial<ComparisonBlock>;
      return typeof candidate.id === "string" && validTypes.has(candidate.type as ComparisonBlockType) && isDate(candidate.startDate) && isDate(candidate.endDate) && candidate.endDate >= candidate.startDate;
    });
    return blocks.length === parsed.length ? blocks : null;
  } catch {
    return null;
  }
}

function todayString(): string {
  return formatComparisonDate(new Date());
}

function rangeForSelection(type: ComparisonBlockType, anchor: string) {
  const range = comparisonRangeForType(type, anchor);
  const today = todayString();
  return range.startDate <= today && range.endDate > today ? { ...range, endDate: today } : range;
}

function formatHumanDate(value: string): string {
  if (!isDate(value)) return value;
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function isDefaultPresetLabel(block: ComparisonBlock): boolean {
  return (block.id === "current-week" && block.label === "Current week")
    || (block.id === "previous-same-point" && block.label === "Previous week · same point");
}

function metricDefinitions(symbol: string): MetricDefinition[] {
  const money = (value: number) => formatCurrency(value, symbol);
  const compactMoney = (value: number) => `${symbol}${compactNumber(value)}`;
  return [
    { id: "earnings", label: "Total earnings", read: (m) => m.earnings, format: money, axisFormat: compactMoney, highlight: true },
    { id: "hours", label: "Hours worked", read: (m) => m.hours, format: (v) => `${v.toFixed(1)}h`, axisFormat: (v) => `${compactNumber(v)}h` },
    { id: "earningsPerHour", label: "Earnings / hour", read: (m) => m.earningsPerHour, format: (v) => `${money(v)}/hr`, axisFormat: compactMoney, highlight: true },
    { id: "miles", label: "Miles", read: (m) => m.miles, format: (v) => v.toFixed(1), axisFormat: (v) => `${compactNumber(v)}mi` },
    { id: "earningsPerMile", label: "Earnings / mile", read: (m) => m.earningsPerMile, format: (v) => `${money(v)}/mi`, axisFormat: compactMoney, highlight: true },
    { id: "rides", label: "Rides", read: (m) => m.rides, format: (v) => String(Math.round(v)), axisFormat: compactNumber },
    { id: "earningsPerRide", label: "Earnings / ride", read: (m) => m.earningsPerRide, format: money, axisFormat: compactMoney, highlight: true },
    { id: "activeDays", label: "Active days", read: (m) => m.activeDays, format: (v) => String(Math.round(v)), axisFormat: compactNumber },
    { id: "calendarDays", label: "Calendar days", read: (m) => m.calendarDays, format: (v) => String(Math.round(v)), axisFormat: compactNumber },
    { id: "averagePerActiveDay", label: "Average / active day", read: (m) => m.averagePerActiveDay, format: money, axisFormat: compactMoney, highlight: true },
    { id: "averagePerCalendarDay", label: "Average / calendar day", read: (m) => m.averagePerCalendarDay, format: money, axisFormat: compactMoney, highlight: true },
    {
      id: "bestDay",
      label: "Best day",
      read: (m) => m.bestDay?.earnings ?? null,
      format: money,
      axisFormat: compactMoney,
      highlight: true,
      detail: (result) => result.metrics.bestDay ? `${result.metrics.bestDay.dayName} · ${result.metrics.bestDay.date}` : undefined,
    },
    {
      id: "lowestActiveDay",
      label: "Lowest active day",
      read: (m) => m.lowestActiveDay?.earnings ?? null,
      format: money,
      axisFormat: compactMoney,
      detail: (result) => result.metrics.lowestActiveDay ? `${result.metrics.lowestActiveDay.dayName} · ${result.metrics.lowestActiveDay.date}` : undefined,
    },
    { id: "earningsGoalProgress", label: "Earnings goal", read: (m) => m.earningsGoalProgress, format: (v) => `${v.toFixed(1)}%`, axisFormat: (v) => `${compactNumber(v)}%`, highlight: true },
    { id: "hoursGoalProgress", label: "Hours goal", read: (m) => m.hoursGoalProgress, format: (v) => `${v.toFixed(1)}%`, axisFormat: (v) => `${compactNumber(v)}%`, highlight: true },
  ];
}

function operationsMetricDefinitions(symbol: string): MetricDefinition[] {
  const money = (value: number) => formatCurrency(value, symbol);
  const compactMoney = (value: number) => `${symbol}${compactNumber(value)}`;
  return [
    { id: "operationalHours", label: "Duration", read: (m: ComparisonMetrics) => m.operationalHours, format: (v: number) => `${v.toFixed(1)}h`, axisFormat: (v: number) => `${compactNumber(v)}h` },
    { id: "operationalEarningsPerHour", label: "Earnings / hour", read: (m: ComparisonMetrics) => m.operationalEarningsPerHour, format: (v: number) => `${money(v)}/hr`, axisFormat: compactMoney, highlight: true },
    { id: "operationalMiles", label: "Miles", read: (m: ComparisonMetrics) => m.operationalMiles, format: (v: number) => v.toFixed(1), axisFormat: (v: number) => `${compactNumber(v)}mi` },
    { id: "operationalEarningsPerMile", label: "Earnings / mile", read: (m: ComparisonMetrics) => m.operationalEarningsPerMile, format: (v: number) => `${money(v)}/mi`, axisFormat: compactMoney, highlight: true },
    { id: "operationalRides", label: "Rides", read: (m: ComparisonMetrics) => m.operationalRides, format: (v: number) => String(Math.round(v)), axisFormat: compactNumber },
    { id: "operationalEarningsPerRide", label: "Earnings / ride", read: (m: ComparisonMetrics) => m.operationalEarningsPerRide, format: money, axisFormat: compactMoney, highlight: true },
    { id: "completedShifts", label: "Completed shifts", read: (m: ComparisonMetrics) => m.completedShifts, format: (v: number) => String(Math.round(v)), axisFormat: compactNumber },
    { id: "averageShiftHours", label: "Average shift", read: (m: ComparisonMetrics) => m.averageShiftHours, format: (v: number) => `${v.toFixed(1)}h`, axisFormat: (v: number) => `${compactNumber(v)}h` },
    { id: "totalShifts", label: "Blocks", read: (m: ComparisonMetrics) => m.totalShifts, format: (v: number) => String(Math.round(v)), axisFormat: compactNumber },
    { id: "multiShiftDays", label: "Split days", read: (m: ComparisonMetrics) => m.multiShiftDays, format: (v: number) => String(Math.round(v)), axisFormat: compactNumber },
    { id: "operationalMilesPerHour", label: "Miles / hour", read: (m: ComparisonMetrics) => m.operationalMilesPerHour, format: (v: number) => v.toFixed(1), axisFormat: compactNumber, highlight: true },
    { id: "averagePerActiveDay", label: "Average / active day", read: (m: ComparisonMetrics) => m.averagePerActiveDay, format: money, axisFormat: compactMoney, highlight: true },
    { id: "earnings", label: "Reported earnings", read: (m: ComparisonMetrics) => m.earnings, format: money, axisFormat: compactMoney },
  ];
}

const RANKING_METRICS: Array<{ value: OperationsRankingMetric; label: string }> = [
  { value: "earningsPerHour", label: "Earnings / hour" },
  { value: "earningsPerMile", label: "Earnings / mile" },
  { value: "earningsPerRide", label: "Earnings / ride" },
  { value: "averagePerActiveDay", label: "Average / active day" },
  { value: "milesPerHour", label: "Miles / hour" },
  { value: "earnings", label: "Reported earnings" },
];

function compactNumber(value: number): string {
  return new Intl.NumberFormat("en-US", { notation: Math.abs(value) >= 10000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(value);
}

function OperationMetric({ icon, label, value, sub, primary = false }: {
  icon: ReactNode;
  label: string;
  value: string;
  sub: string;
  primary?: boolean;
}) {
  return (
    <div className={cn("min-w-0 rounded-xl border p-3", primary ? "border-primary/25 bg-primary/5" : "border-border bg-card/75")}>
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {icon}<span className="truncate">{label}</span>
      </div>
      <p className="mt-1 truncate font-mono text-lg font-bold">{value}</p>
      <p className="truncate text-[11px] text-muted-foreground">{sub}</p>
    </div>
  );
}

function nullable(value: number | null | undefined, format: (value: number) => string): string {
  return typeof value === "number" && Number.isFinite(value) ? format(value) : "—";
}

function OperationsSnapshotCards({ results, currencySymbol }: { results: ComparisonResult[]; currencySymbol: string }) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-bold tracking-wide">Operations Snapshot comparison</h3>
        <p className="mt-1 text-xs text-muted-foreground">The same work, mileage, and efficiency view used by your weekly Operations Snapshot.</p>
      </div>
      <div className={cn("grid gap-3", results.length >= 3 ? "xl:grid-cols-3" : "xl:grid-cols-2")}>
        {results.map((result, index) => {
          const m = result.metrics;
          const accent = accentFor(index);
          const isLive = (m.activeShifts ?? 0) > 0;
          return (
            <article key={result.block.id} className="overflow-hidden rounded-2xl border border-primary/20 bg-primary/[0.045] p-4" style={{ borderTopColor: accent.color, borderTopWidth: 3 }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: accent.darker }}>Operations snapshot</p>
                  <h4 className="mt-1 truncate text-base font-bold">{result.displayLabel}</h4>
                </div>
                <span className={cn("shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider", isLive ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" : "bg-muted text-muted-foreground")}>
                  {isLive ? `${m.activeShifts} live` : "Closed"}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <OperationMetric primary icon={<Clock className="h-3.5 w-3.5" />} label="Duration" value={nullable(m.operationalHours, (v) => `${v.toFixed(1)}h`)} sub={`${m.completedShifts ?? 0} completed`} />
                <OperationMetric primary icon={<Activity className="h-3.5 w-3.5" />} label="Earnings/Hr" value={nullable(m.operationalEarningsPerHour, (v) => formatCurrency(v, currencySymbol))} sub="operational efficiency" />
                <OperationMetric primary icon={<Route className="h-3.5 w-3.5" />} label="Miles" value={nullable(m.operationalMiles, (v) => v.toFixed(1))} sub={`${m.operationalWorkDays ?? 0} work day${m.operationalWorkDays === 1 ? "" : "s"}`} />
                <OperationMetric primary icon={<Gauge className="h-3.5 w-3.5" />} label="Earnings/Mi" value={nullable(m.operationalEarningsPerMile, (v) => formatCurrency(v, currencySymbol))} sub={nullable(m.operationalMilesPerHour, (v) => `${v.toFixed(1)} mi/hr`)} />
                <OperationMetric icon={<BarChart3 className="h-3.5 w-3.5" />} label="Rides" value={nullable(m.operationalRides, (v) => String(Math.round(v)))} sub={nullable(m.operationalEarningsPerRide, (v) => `${formatCurrency(v, currencySymbol)}/ride`)} />
                <OperationMetric icon={<Clock className="h-3.5 w-3.5" />} label="Avg Shift" value={nullable(m.averageShiftHours, (v) => `${v.toFixed(1)}h`)} sub="completed only" />
                <OperationMetric icon={<BarChart3 className="h-3.5 w-3.5" />} label="Blocks" value={nullable(m.totalShifts, (v) => String(Math.round(v)))} sub={`${m.multiShiftDays ?? 0} split day${m.multiShiftDays === 1 ? "" : "s"}`} />
                <OperationMetric icon={<Activity className="h-3.5 w-3.5" />} label="Avg / Active Day" value={nullable(m.averagePerActiveDay, (v) => formatCurrency(v, currencySymbol))} sub="reported earnings" />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function buildOperationsInsights(results: ComparisonResult[], currencySymbol: string): string[] {
  if (results.length < 2) return [];
  const withHourlyRate = results.filter((result) => (result.metrics.operationalEarningsPerHour ?? 0) > 0);
  const hourlyLeader = [...withHourlyRate].sort((a, b) => (b.metrics.operationalEarningsPerHour ?? 0) - (a.metrics.operationalEarningsPerHour ?? 0))[0];
  const mileageLeader = [...results].filter((result) => (result.metrics.operationalEarningsPerMile ?? 0) > 0)
    .sort((a, b) => (b.metrics.operationalEarningsPerMile ?? 0) - (a.metrics.operationalEarningsPerMile ?? 0))[0];
  const mostStructured = [...results].filter((result) => (result.metrics.totalShifts ?? 0) > 0)
    .sort((a, b) => (b.metrics.totalShifts ?? 0) - (a.metrics.totalShifts ?? 0))[0];
  return [
    hourlyLeader && `${hourlyLeader.displayLabel} has the strongest measured hourly efficiency at ${formatCurrency(hourlyLeader.metrics.operationalEarningsPerHour ?? 0, currencySymbol)}/hr.`,
    mileageLeader && `${mileageLeader.displayLabel} has the strongest measured mileage efficiency at ${formatCurrency(mileageLeader.metrics.operationalEarningsPerMile ?? 0, currencySymbol)}/mi.`,
    mostStructured && `${mostStructured.displayLabel} contains the most recorded work blocks (${mostStructured.metrics.totalShifts}).`,
  ].filter((insight): insight is string => Boolean(insight));
}

export default function AdvancedComparisonBuilder({ weeks, currencySymbol, viewTabs }: Props) {
  const { isDark } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialBlocks = readBlocks(searchParams.get("blocks")) ?? buildDefaultComparisonBlocks(weeks);
  const [blocks, setBlocks] = useState<ComparisonBlock[]>(() => initialBlocks.length >= 2 ? initialBlocks : [
    { id: "block-a", type: "day", startDate: todayString(), endDate: todayString() },
    { id: "block-b", type: "day", startDate: todayString(), endDate: todayString() },
  ]);
  const [appFilter, setAppFilter] = useState(() => searchParams.get("compareApp") || "all");
  const [lens, setLens] = useState<ComparisonLens>(() => searchParams.get("compareLens") === "operations" ? "operations" : "performance");
  const [chartMetric, setChartMetric] = useState("earnings");
  const [rankingScope, setRankingScope] = useState<OperationsRankingScope>(() => {
    const stored = searchParams.get("operationsRankScope");
    return stored === "day" || stored === "month" ? stored : "week";
  });
  const [rankingMetric, setRankingMetric] = useState<OperationsRankingMetric>(() => {
    const stored = searchParams.get("operationsRankMetric");
    return RANKING_METRICS.some((item) => item.value === stored) ? stored as OperationsRankingMetric : "earningsPerHour";
  });

  const data = useMemo(() => buildComparisonData({ blocks, weeks, appFilter, currencySymbol, includeOperations: lens === "operations" }), [appFilter, blocks, currencySymbol, lens, weeks]);
  const metrics = useMemo(() => (lens === "operations" ? operationsMetricDefinitions(currencySymbol) : metricDefinitions(currencySymbol))
    .filter((metric) => data.results.some((result) => metric.read(result.metrics) !== null)), [currencySymbol, data.results, lens]);
  const leaderboard = useMemo(() => lens === "operations"
    ? buildOperationsLeaderboard({ weeks, scope: rankingScope, metric: rankingMetric })
    : [], [lens, rankingMetric, rankingScope, weeks]);
  const insights = useMemo(() => lens === "operations" ? buildOperationsInsights(data.results, currencySymbol) : data.insights, [currencySymbol, data.insights, data.results, lens]);
  const selectedChartMetric = metrics.find((metric) => metric.id === chartMetric) ?? metrics[0];
  const chartData = selectedChartMetric ? data.results.map((result, index) => ({
    label: result.displayLabel,
    value: selectedChartMetric.read(result.metrics) ?? 0,
    fill: accentFor(index).color,
  })) : [];

  // Panel styling matched to DeepInsightsPage Panel component.
  const panel = isDark
    ? "border-white/10 bg-white/[0.045] shadow-[0_18px_60px_rgba(0,0,0,0.28)]"
    : "border-slate-200/90 bg-white/82 shadow-[0_16px_50px_rgba(15,23,42,0.08)]";
  const muted = isDark ? "text-white/58" : "text-slate-600";
  const quiet = isDark ? "text-white/45" : "text-slate-500";
  const label = isDark ? "text-white/45" : "text-slate-500";
  const text = isDark ? "text-white" : "text-slate-950";
  const input = isDark
    ? "border-white/10 bg-black/45 text-white focus:border-[#E6CE20]/55"
    : "border-slate-200 bg-white text-slate-950 focus:border-[#D8BD00]";
  const tableShell = isDark ? "border-white/10 bg-black/20" : "border-slate-200 bg-white/78";
  const tableHeadBg = isDark ? "bg-white/[0.04]" : "bg-slate-50";
  const tableStickyHead = isDark ? "bg-[#111211]" : "bg-slate-50";
  const tableStickyCell = isDark ? "bg-[#0D0E0D]" : "bg-white";
  const rowBorder = isDark ? "border-t border-white/10" : "border-t border-slate-200";
  const gridStroke = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.10)";
  const axisStroke = isDark ? "rgba(255,255,255,0.42)" : "rgba(15,23,42,0.48)";

  function persist(nextBlocks: ComparisonBlock[], nextApp = appFilter, nextLens = lens, nextRankingScope = rankingScope, nextRankingMetric = rankingMetric) {
    setBlocks(nextBlocks);
    setAppFilter(nextApp);
    const next = new URLSearchParams(searchParams);
    next.set("view", "compare");
    next.set("blocks", JSON.stringify(nextBlocks));
    if (nextApp === "all") next.delete("compareApp");
    else next.set("compareApp", nextApp);
    if (nextLens === "operations") next.set("compareLens", "operations");
    else next.delete("compareLens");
    if (nextRankingScope === "week") next.delete("operationsRankScope");
    else next.set("operationsRankScope", nextRankingScope);
    if (nextRankingMetric === "earningsPerHour") next.delete("operationsRankMetric");
    else next.set("operationsRankMetric", nextRankingMetric);
    setSearchParams(next, { replace: true });
  }

  function changeLens(nextLens: ComparisonLens) {
    const nextApp = nextLens === "operations" ? "all" : appFilter;
    setLens(nextLens);
    if (nextLens === "operations") setAppFilter("all");
    persist(blocks, nextApp, nextLens);
  }

  function changeRankingScope(nextScope: OperationsRankingScope) {
    setRankingScope(nextScope);
    persist(blocks, appFilter, lens, nextScope, rankingMetric);
  }

  function changeRankingMetric(nextMetric: OperationsRankingMetric) {
    setRankingMetric(nextMetric);
    persist(blocks, appFilter, lens, rankingScope, nextMetric);
  }

  function updateBlock(id: string, patch: Partial<ComparisonBlock>) {
    persist(blocks.map((block) => block.id === id ? { ...block, ...patch } : block));
  }

  function changeBlockType(block: ComparisonBlock, type: ComparisonBlockType) {
    const range = rangeForSelection(type, block.startDate);
    // Clear stored label so generated label reflects the new period.
    updateBlock(block.id, { type, label: undefined, ...range });
  }

  function changeAnchor(block: ComparisonBlock, anchor: string) {
    if (block.type === "custom") {
      updateBlock(block.id, {
        startDate: anchor,
        endDate: block.endDate < anchor ? anchor : block.endDate,
        label: undefined,
      });
    } else {
      updateBlock(block.id, { ...rangeForSelection(block.type, anchor), label: undefined });
    }
  }

  function changeCustomEnd(block: ComparisonBlock, end: string) {
    updateBlock(block.id, {
      endDate: end < block.startDate ? block.startDate : end,
      label: undefined,
    });
  }

  function addBlock() {
    if (blocks.length >= 4) return;
    const anchor = todayString();
    const range = rangeForSelection("week", anchor);
    persist([...blocks, { id: `block-${Date.now()}`, type: "week", startDate: range.startDate, endDate: range.endDate }]);
  }

  function resetSamePoint() {
    const defaults = buildDefaultComparisonBlocks(weeks);
    if (defaults.length >= 2) persist(defaults, "all");
  }

  const bestByMetric = new Map<string, number>();
  for (const metric of metrics) {
    if (!metric.highlight) continue;
    const values = data.results.map((result) => metric.read(result.metrics)).filter((value): value is number => value !== null);
    if (values.length > 1) bestByMetric.set(metric.id, Math.max(...values));
  }

  const columnClass = blocks.length >= 4
    ? "lg:min-w-[1180px] lg:grid-cols-4"
    : blocks.length === 3
      ? "lg:min-w-[860px] lg:grid-cols-3"
      : "lg:grid-cols-2";

  return (
    <div className="space-y-5">
      {/* One exploration control surface for Compare mode. */}
      <section className={cn("rounded-2xl border p-4 md:p-5 backdrop-blur", panel)}>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-[#E6CE20]" />
                <h2 className={cn("text-sm font-bold tracking-wide", text)}>Explore your data</h2>
              </div>
              <p className={cn("mt-1 text-xs leading-relaxed", muted)}>
                Compare two to four selected periods through earnings or operations.
              </p>
            </div>
            <div className={cn("inline-flex w-fit rounded-xl border p-1", isDark ? "border-white/10 bg-black/20" : "border-slate-200 bg-slate-50")}>
              <button type="button" aria-pressed={lens === "performance"} onClick={() => changeLens("performance")} className={cn("rounded-lg px-3 py-1.5 text-xs font-bold transition", lens === "performance" ? "bg-primary text-primary-foreground" : muted)}>Performance</button>
              <button type="button" aria-pressed={lens === "operations"} onClick={() => changeLens("operations")} className={cn("rounded-lg px-3 py-1.5 text-xs font-bold transition", lens === "operations" ? "bg-primary text-primary-foreground" : muted)}>Operations Snapshot</button>
            </div>
            {viewTabs}
          </div>
          <div className="flex flex-wrap items-end gap-3 md:pt-0.5">
            <label className={cn("grid gap-1.5 text-[10px] font-black uppercase tracking-[0.18em]", label)}>
              App filter
              <select
                value={appFilter}
                onChange={(event) => persist(blocks, event.target.value)}
                disabled={lens === "operations"}
                className={cn("h-10 min-w-[10rem] rounded-xl border px-3 text-sm font-semibold outline-none transition disabled:cursor-not-allowed disabled:opacity-60", input)}
              >
                <option value="all">All apps</option>
                {data.appOptions.map((app) => <option key={app} value={app}>{app}</option>)}
              </select>
            </label>
            <Button type="button" variant="outline" size="sm" onClick={resetSamePoint} disabled={buildDefaultComparisonBlocks(weeks).length < 2} className="h-10">
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Current vs previous
            </Button>
            <Button type="button" size="sm" onClick={addBlock} disabled={blocks.length >= 4} className="h-10">
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Add block
            </Button>
          </div>
        </div>
        {data.appFilterActive && (
          <div className={cn(
            "mt-3 rounded-xl border border-[#E6CE20]/30 px-3 py-2 text-xs leading-relaxed",
            isDark ? "bg-[#E6CE20]/8 text-[#F8E875]" : "bg-[#FFF8B7]/60 text-slate-800",
          )}>
            App-only mode compares earnings. Hours, miles, rides, and efficiency stay hidden because they cannot be attributed reliably to one platform.
          </div>
        )}
        {lens === "operations" && (
          <div className={cn("mt-3 rounded-xl border px-3 py-2 text-xs leading-relaxed", isDark ? "border-sky-400/25 bg-sky-400/10 text-sky-100" : "border-sky-300 bg-sky-50 text-slate-700")}>
            Operations Snapshot uses all apps. Streex does not assign hours, miles, rides, or efficiency to a single app unless that evidence exists reliably.
          </div>
        )}
      </section>

      {/* Block columns — horizontal on desktop, stacked on mobile. */}
      <section className="overflow-x-auto pb-1">
        <div className={cn("grid grid-cols-1 gap-3", columnClass)}>
        {blocks.map((block, index) => {
          const result = data.results[index];
          const accent = accentFor(index);
          return (
            <article
              key={block.id}
              className={cn("relative min-w-0 overflow-hidden rounded-2xl border p-4 backdrop-blur", panel)}
              style={{ borderTopColor: accent.color, borderTopWidth: 3 }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: isDark ? accent.color : accent.darker }}>
                    Block {index + 1}
                  </p>
                  <p className={cn("mt-1 truncate text-base font-bold", text)}>{result?.displayLabel}</p>
                </div>
                {blocks.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground"
                    onClick={() => persist(blocks.filter((candidate) => candidate.id !== block.id))}
                    aria-label={`Remove block ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <label className="col-span-2 space-y-1">
                  <span className={cn("text-[9px] font-bold uppercase tracking-wider", label)}>Type</span>
                  <select
                    value={block.type}
                    onChange={(event) => changeBlockType(block, event.target.value as ComparisonBlockType)}
                    className={cn("h-9 w-full rounded-lg border px-2 text-xs outline-none", input)}
                  >
                    {BLOCK_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className={cn("text-[9px] font-bold uppercase tracking-wider", label)}>Start</span>
                  <Input
                    type="date"
                    max={todayString()}
                    value={block.startDate}
                    onChange={(event) => changeAnchor(block, event.target.value)}
                    className={cn("h-9 text-xs", input)}
                  />
                </label>
                <label className="space-y-1">
                  <span className={cn("text-[9px] font-bold uppercase tracking-wider", label)}>
                    End{block.type !== "custom" ? " · Auto" : ""}
                  </span>
                  <Input
                    type="date"
                    min={block.startDate}
                    max={todayString()}
                    value={block.endDate}
                    readOnly={block.type !== "custom"}
                    aria-readonly={block.type !== "custom"}
                    onChange={(event) => changeCustomEnd(block, event.target.value)}
                    className={cn("h-9 min-w-0 w-full text-xs", block.type !== "custom" && "cursor-default opacity-75", input)}
                  />
                </label>
                <label className="col-span-2 space-y-1">
                  <span className={cn("text-[9px] font-bold uppercase tracking-wider", label)}>Name (optional)</span>
                  <Input
                    value={isDefaultPresetLabel(block) ? "" : block.label ?? ""}
                    maxLength={32}
                    placeholder="Auto-generated from dates"
                    onChange={(event) => updateBlock(block.id, { label: event.target.value || undefined })}
                    className={cn("h-9 text-xs", input)}
                  />
                </label>
              </div>

              <div className={cn("mt-4 grid grid-cols-3 gap-2 rounded-xl border p-2", isDark ? "border-white/10 bg-black/20" : "border-slate-200 bg-slate-50/60")}>
                {lens === "operations" ? <>
                  <Summary label="Duration" value={nullable(result?.metrics.operationalHours, (v) => `${v.toFixed(1)}h`)} muted={label} text={text} />
                  <Summary label="Earnings/hr" value={nullable(result?.metrics.operationalEarningsPerHour, (v) => formatCurrency(v, currencySymbol))} muted={label} text={text} />
                  <Summary label="Blocks" value={nullable(result?.metrics.totalShifts, (v) => String(Math.round(v)))} muted={label} text={text} />
                </> : <>
                  <Summary label="Earnings" value={formatCurrency(result?.metrics.earnings ?? 0, currencySymbol)} muted={label} text={text} />
                  <Summary label="Active days" value={`${result?.metrics.activeDays ?? 0}`} muted={label} text={text} />
                  <Summary
                    label="Per active day"
                    value={result?.metrics.averagePerActiveDay !== null && result?.metrics.averagePerActiveDay !== undefined
                      ? formatCurrency(result.metrics.averagePerActiveDay, currencySymbol)
                      : "—"}
                    muted={label}
                    text={text}
                  />
                </>}
              </div>

              <p className={cn("mt-3 text-[10px] font-mono", quiet)}>
                {formatHumanDate(block.startDate)} → {formatHumanDate(block.endDate)}
              </p>
            </article>
          );
        })}
        </div>
      </section>

      {lens === "operations" && <OperationsSnapshotCards results={data.results} currencySymbol={currencySymbol} />}

      {/* Chart panel */}
      <section className={cn("rounded-2xl border p-4 md:p-5 backdrop-blur", panel)}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-[#E6CE20]" />
            <div>
              <h3 className={cn("text-sm font-bold tracking-wide", text)}>Side-by-side chart</h3>
              <p className={cn("text-xs", muted)}>Selected metric across each period.</p>
            </div>
          </div>
          {selectedChartMetric && (
            <select
              value={selectedChartMetric.id}
              onChange={(event) => setChartMetric(event.target.value)}
              className={cn("h-9 rounded-lg border px-3 text-xs outline-none", input)}
            >
              {metrics.filter((metric) => metric.id !== "bestDay" && metric.id !== "lowestActiveDay").map((metric) => (
                <option key={metric.id} value={metric.id}>{metric.label}</option>
              ))}
            </select>
          )}
        </div>

        {selectedChartMetric && (
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={gridStroke} vertical={false} />
                <XAxis dataKey="label" stroke={axisStroke} tick={{ fontSize: 11 }} interval={0} tickLine={false} axisLine={false} />
                <YAxis stroke={axisStroke} tick={{ fontSize: 11 }} tickFormatter={selectedChartMetric.axisFormat} width={58} tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(value) => selectedChartMetric.format(Number(value), data.results[0])}
                  contentStyle={{
                    background: isDark ? "rgba(5,6,5,0.96)" : "rgba(255,255,255,0.98)",
                    border: `1px solid ${gridStroke}`,
                    borderRadius: 10,
                  }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Metric matrix */}
      <section className={cn("rounded-2xl border p-4 md:p-5 backdrop-blur", panel)}>
        <div className="flex items-center gap-2">
          <Scale className="h-4 w-4 text-[#E6CE20]" />
          <div>
            <h3 className={cn("text-sm font-bold tracking-wide", text)}>Metric matrix</h3>
            <p className={cn("text-xs", muted)}>Best values are highlighted only where higher clearly represents stronger performance.</p>
          </div>
        </div>

        <div className={cn("mt-4 overflow-x-auto rounded-xl border", tableShell)}>
          <table className="min-w-[680px] w-full text-sm">
            <thead>
              <tr className={tableHeadBg}>
                <th className={cn("sticky left-0 z-10 min-w-44 px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider", tableStickyHead, muted)}>Metric</th>
                {data.results.map((result, index) => {
                  const accent = accentFor(index);
                  return (
                    <th
                      key={result.block.id}
                      className="min-w-36 px-3 py-2 text-right text-xs font-semibold"
                      style={{ color: isDark ? accent.color : accent.darker }}
                    >
                      {result.displayLabel}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {metrics.map((metric) => {
                const best = bestByMetric.get(metric.id);
                return (
                  <tr key={metric.id} className={rowBorder}>
                    <th className={cn("sticky left-0 z-10 px-3 py-2 text-left text-xs font-medium", tableStickyCell, text)}>
                      {metric.label}
                    </th>
                    {data.results.map((result, index) => {
                      const value = metric.read(result.metrics);
                      const highlighted = best !== undefined && value === best;
                      const accent = accentFor(index);
                      return (
                        <td
                          key={result.block.id}
                          className={cn("px-3 py-2 text-right font-mono", highlighted && "font-bold")}
                          style={highlighted ? {
                            background: `${accent.color}1F`,
                            color: isDark ? accent.color : accent.darker,
                          } : undefined}
                        >
                          {value === null ? <span className={muted}>—</span> : metric.format(value, result)}
                          {value !== null && metric.detail?.(result) && (
                            <span className={cn("block text-[10px] font-sans font-normal", muted)}>{metric.detail(result)}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {lens === "operations" && (
        <section className={cn("rounded-2xl border p-4 md:p-5 backdrop-blur", panel)}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-[#E6CE20]" />
              <div>
                <h3 className={cn("text-sm font-bold tracking-wide", text)}>Operations leaderboard</h3>
                <p className={cn("text-xs", muted)}>Completed historical periods only. A building period never receives a full-period rank.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <select value={rankingScope} onChange={(event) => changeRankingScope(event.target.value as OperationsRankingScope)} className={cn("h-9 rounded-lg border px-3 text-xs outline-none", input)}>
                <option value="day">Days</option>
                <option value="week">Weeks</option>
                <option value="month">Months</option>
              </select>
              <select value={rankingMetric} onChange={(event) => changeRankingMetric(event.target.value as OperationsRankingMetric)} className={cn("h-9 rounded-lg border px-3 text-xs outline-none", input)}>
                {RANKING_METRICS.map((metric) => <option key={metric.value} value={metric.value}>{metric.label}</option>)}
              </select>
            </div>
          </div>
          {leaderboard.length ? (
            <ol className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {leaderboard.map((entry) => {
                const metric = RANKING_METRICS.find((item) => item.value === rankingMetric)?.label ?? "Metric";
                const unit = rankingMetric === "earningsPerHour" ? "/hr" : rankingMetric === "earningsPerMile" ? "/mi" : rankingMetric === "earningsPerRide" ? "/ride" : rankingMetric === "milesPerHour" ? " mi/hr" : "";
                const value = rankingMetric === "milesPerHour"
                  ? entry.value.toFixed(1)
                  : rankingMetric === "earnings" || rankingMetric === "averagePerActiveDay" || rankingMetric === "earningsPerHour" || rankingMetric === "earningsPerMile" || rankingMetric === "earningsPerRide"
                    ? formatCurrency(entry.value, currencySymbol)
                    : String(entry.value);
                return (
                  <li key={entry.result.block.id} className={cn("flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5", isDark ? "border-white/10 bg-black/20" : "border-slate-200 bg-slate-50/65")}>
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="font-mono text-lg font-bold text-[#D8BD00]">#{entry.rank}</span>
                      <div className="min-w-0">
                        <p className={cn("truncate text-sm font-semibold", text)}>{entry.result.displayLabel}</p>
                        <p className={cn("text-[10px] uppercase tracking-wider", quiet)}>{metric}</p>
                      </div>
                    </div>
                    <span className={cn("shrink-0 font-mono text-sm font-bold", text)}>{value}{unit}</span>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className={cn("mt-3 rounded-xl border p-3 text-sm", isDark ? "border-white/10 bg-black/20" : "border-slate-200 bg-slate-50/65", muted)}>No completed {rankingScope}s have enough recorded operational data for this metric yet.</p>
          )}
        </section>
      )}

      {/* Narrative */}
      <section className={cn("rounded-2xl border p-4 md:p-5 backdrop-blur", panel)}>
        <div className="flex items-center gap-2">
          <CalendarRange className="h-4 w-4 text-[#E6CE20]" />
          <h3 className={cn("text-sm font-bold tracking-wide", text)}>What changed</h3>
        </div>
        {insights.length > 0 ? (
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {insights.map((insight) => (
              <p
                key={insight}
                className={cn(
                  "rounded-xl border px-3 py-2 text-sm leading-relaxed",
                  isDark ? "border-[#E6CE20]/18 bg-[#E6CE20]/8 text-white/78" : "border-[#E6CE20]/35 bg-[#FFF8B7]/45 text-slate-800",
                )}
              >
                {insight}
              </p>
            ))}
          </div>
        ) : (
          <p className={cn("mt-2 text-sm", muted)}>Add at least two periods with data to generate comparison signals.</p>
        )}
      </section>
    </div>
  );
}

function Summary({ label, value, muted, text }: { label: string; value: string; muted: string; text: string }) {
  return (
    <div className="min-w-0">
      <p className={cn("truncate text-[9px] font-bold uppercase tracking-wider", muted)}>{label}</p>
      <p className={cn("mt-1 truncate text-sm font-bold font-mono", text)}>{value}</p>
    </div>
  );
}
