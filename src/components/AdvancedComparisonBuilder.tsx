import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CalendarRange, Plus, RefreshCw, Scale, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/contexts/ThemeContext";
import {
  buildComparisonData,
  buildDefaultComparisonBlocks,
  comparisonRangeForType,
  formatComparisonDate,
  type ComparisonBlock,
  type ComparisonBlockType,
  type ComparisonMetrics,
  type ComparisonResult,
} from "@/lib/comparisonBuilder";
import { formatCurrency } from "@/lib/store";
import type { WeekRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  weeks: WeekRecord[];
  currencySymbol: string;
}

interface MetricDefinition {
  id: string;
  label: string;
  read: (metrics: ComparisonMetrics) => number | null;
  format: (value: number, result: ComparisonResult) => string;
  highlight?: boolean;
  detail?: (result: ComparisonResult) => string | undefined;
}

const BLOCK_TYPES: Array<{ value: ComparisonBlockType; label: string }> = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
  { value: "custom", label: "Custom" },
];

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

function metricDefinitions(symbol: string): MetricDefinition[] {
  const money = (value: number) => formatCurrency(value, symbol);
  return [
    { id: "earnings", label: "Total earnings", read: (m) => m.earnings, format: money, highlight: true },
    { id: "hours", label: "Hours worked", read: (m) => m.hours, format: (v) => `${v.toFixed(1)}h` },
    { id: "earningsPerHour", label: "Earnings / hour", read: (m) => m.earningsPerHour, format: (v) => `${money(v)}/hr`, highlight: true },
    { id: "miles", label: "Miles", read: (m) => m.miles, format: (v) => v.toFixed(1) },
    { id: "earningsPerMile", label: "Earnings / mile", read: (m) => m.earningsPerMile, format: (v) => `${money(v)}/mi`, highlight: true },
    { id: "rides", label: "Rides", read: (m) => m.rides, format: (v) => String(Math.round(v)) },
    { id: "earningsPerRide", label: "Earnings / ride", read: (m) => m.earningsPerRide, format: money, highlight: true },
    { id: "activeDays", label: "Active days", read: (m) => m.activeDays, format: (v) => String(Math.round(v)) },
    { id: "calendarDays", label: "Calendar days", read: (m) => m.calendarDays, format: (v) => String(Math.round(v)) },
    { id: "averagePerActiveDay", label: "Average / active day", read: (m) => m.averagePerActiveDay, format: money, highlight: true },
    { id: "averagePerCalendarDay", label: "Average / calendar day", read: (m) => m.averagePerCalendarDay, format: money, highlight: true },
    {
      id: "bestDay",
      label: "Best day",
      read: (m) => m.bestDay?.earnings ?? null,
      format: money,
      highlight: true,
      detail: (result) => result.metrics.bestDay ? `${result.metrics.bestDay.dayName} · ${result.metrics.bestDay.date}` : undefined,
    },
    {
      id: "lowestActiveDay",
      label: "Lowest active day",
      read: (m) => m.lowestActiveDay?.earnings ?? null,
      format: money,
      detail: (result) => result.metrics.lowestActiveDay ? `${result.metrics.lowestActiveDay.dayName} · ${result.metrics.lowestActiveDay.date}` : undefined,
    },
    { id: "earningsGoalProgress", label: "Earnings goal", read: (m) => m.earningsGoalProgress, format: (v) => `${v.toFixed(1)}%`, highlight: true },
    { id: "hoursGoalProgress", label: "Hours goal", read: (m) => m.hoursGoalProgress, format: (v) => `${v.toFixed(1)}%`, highlight: true },
  ];
}

function compactNumber(value: number): string {
  return new Intl.NumberFormat("en-US", { notation: Math.abs(value) >= 10000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(value);
}

export default function AdvancedComparisonBuilder({ weeks, currencySymbol }: Props) {
  const { isDark } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialBlocks = readBlocks(searchParams.get("blocks")) ?? buildDefaultComparisonBlocks(weeks);
  const [blocks, setBlocks] = useState<ComparisonBlock[]>(() => initialBlocks.length >= 2 ? initialBlocks : [
    { id: "block-a", type: "day", label: "Block A", startDate: todayString(), endDate: todayString() },
    { id: "block-b", type: "day", label: "Block B", startDate: todayString(), endDate: todayString() },
  ]);
  const [appFilter, setAppFilter] = useState(() => searchParams.get("compareApp") || "all");
  const [chartMetric, setChartMetric] = useState("earnings");

  const data = useMemo(() => buildComparisonData({ blocks, weeks, appFilter, currencySymbol }), [appFilter, blocks, currencySymbol, weeks]);
  const metrics = useMemo(() => metricDefinitions(currencySymbol).filter((metric) => data.results.some((result) => metric.read(result.metrics) !== null)), [currencySymbol, data.results]);
  const selectedChartMetric = metrics.find((metric) => metric.id === chartMetric) ?? metrics[0];
  const chartData = selectedChartMetric ? data.results.map((result) => ({ label: result.displayLabel, value: selectedChartMetric.read(result.metrics) ?? 0 })) : [];

  const panel = isDark ? "border-white/10 bg-white/[0.045]" : "border-slate-200 bg-white/85";
  const muted = isDark ? "text-white/55" : "text-slate-500";
  const input = isDark ? "border-white/10 bg-black/40 text-white" : "border-slate-200 bg-white text-slate-950";
  const table = isDark ? "border-white/10 bg-black/20" : "border-slate-200 bg-white/80";
  const gridStroke = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.10)";
  const axisStroke = isDark ? "rgba(255,255,255,0.42)" : "rgba(15,23,42,0.48)";

  function persist(nextBlocks: ComparisonBlock[], nextApp = appFilter) {
    setBlocks(nextBlocks);
    setAppFilter(nextApp);
    const next = new URLSearchParams(searchParams);
    next.set("view", "compare");
    next.set("blocks", JSON.stringify(nextBlocks));
    if (nextApp === "all") next.delete("compareApp");
    else next.set("compareApp", nextApp);
    setSearchParams(next, { replace: true });
  }

  function updateBlock(id: string, patch: Partial<ComparisonBlock>) {
    persist(blocks.map((block) => block.id === id ? { ...block, ...patch } : block));
  }

  function changeBlockType(block: ComparisonBlock, type: ComparisonBlockType) {
    const range = rangeForSelection(type, block.startDate);
    updateBlock(block.id, { type, ...range });
  }

  function changeAnchor(block: ComparisonBlock, anchor: string) {
    updateBlock(block.id, block.type === "custom" ? { startDate: anchor, endDate: block.endDate < anchor ? anchor : block.endDate } : rangeForSelection(block.type, anchor));
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

  return (
    <div className="space-y-5">
      <section className={cn("rounded-2xl border p-4 md:p-5", panel)}>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#D6BE00]">Advanced Comparison</p>
            <h2 className="mt-1 text-xl font-bold">Compare the periods that matter</h2>
            <p className={cn("mt-1 max-w-2xl text-sm", muted)}>Two to four blocks, one consistent metric language. Missing operational data stays hidden.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={resetSamePoint} disabled={buildDefaultComparisonBlocks(weeks).length < 2}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Current vs previous
            </Button>
            <Button type="button" size="sm" onClick={addBlock} disabled={blocks.length >= 4}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Add block
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[14rem_1fr]">
          <label className="space-y-1.5">
            <span className={cn("text-[10px] font-bold uppercase tracking-wider", muted)}>Global app filter</span>
            <select
              value={appFilter}
              onChange={(event) => persist(blocks, event.target.value)}
              className={cn("h-10 w-full rounded-lg border px-3 text-sm outline-none", input)}
            >
              <option value="all">All apps</option>
              {data.appOptions.map((app) => <option key={app} value={app}>{app}</option>)}
            </select>
          </label>
          {data.appFilterActive && (
            <div className={cn("rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-xs leading-relaxed", isDark ? "text-amber-100" : "text-amber-900")}>
              App-only mode compares earnings. Hours, miles, rides, and efficiency are hidden because they cannot be attributed reliably to one platform.
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-3 xl:grid-cols-2">
        {blocks.map((block, index) => {
          const result = data.results[index];
          return (
            <article key={block.id} className={cn("rounded-2xl border p-4", panel)}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className={cn("text-[10px] font-bold uppercase tracking-[0.18em]", muted)}>Block {index + 1}</p>
                  <p className="mt-1 truncate text-base font-bold">{result?.displayLabel}</p>
                  <p className={cn("text-xs font-mono", muted)}>{result?.rangeLabel}</p>
                </div>
                {blocks.length > 2 && (
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => persist(blocks.filter((candidate) => candidate.id !== block.id))} aria-label={`Remove block ${index + 1}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <label className="space-y-1">
                  <span className={cn("text-[9px] font-bold uppercase tracking-wider", muted)}>Type</span>
                  <select value={block.type} onChange={(event) => changeBlockType(block, event.target.value as ComparisonBlockType)} className={cn("h-9 w-full rounded-lg border px-2 text-xs", input)}>
                    {BLOCK_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                  </select>
                </label>
                <label className="col-span-1 space-y-1 sm:col-span-2">
                  <span className={cn("text-[9px] font-bold uppercase tracking-wider", muted)}>Label</span>
                  <Input value={block.label ?? ""} maxLength={32} placeholder="Optional" onChange={(event) => updateBlock(block.id, { label: event.target.value })} className={cn("h-9 text-xs", input)} />
                </label>
                {block.type !== "custom" ? (
                  <label className="space-y-1">
                    <span className={cn("text-[9px] font-bold uppercase tracking-wider", muted)}>{block.type === "day" ? "Date" : "Anchor"}</span>
                    <Input type="date" max={todayString()} value={block.startDate} onChange={(event) => changeAnchor(block, event.target.value)} className={cn("h-9 text-xs", input)} />
                  </label>
                ) : (
                  <>
                    <label className="space-y-1">
                      <span className={cn("text-[9px] font-bold uppercase tracking-wider", muted)}>Start</span>
                      <Input type="date" max={todayString()} value={block.startDate} onChange={(event) => changeAnchor(block, event.target.value)} className={cn("h-9 text-xs", input)} />
                    </label>
                    <label className="space-y-1">
                      <span className={cn("text-[9px] font-bold uppercase tracking-wider", muted)}>End</span>
                      <Input type="date" min={block.startDate} max={todayString()} value={block.endDate} onChange={(event) => updateBlock(block.id, { endDate: event.target.value < block.startDate ? block.startDate : event.target.value })} className={cn("h-9 text-xs", input)} />
                    </label>
                  </>
                )}
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <Summary label="Earnings" value={formatCurrency(result?.metrics.earnings ?? 0, currencySymbol)} muted={muted} />
                <Summary label="Active days" value={`${result?.metrics.activeDays ?? 0}`} muted={muted} />
                <Summary label="Per active day" value={result?.metrics.averagePerActiveDay !== null ? formatCurrency(result?.metrics.averagePerActiveDay ?? 0, currencySymbol) : "—"} muted={muted} />
              </div>
            </article>
          );
        })}
      </section>

      <section className={cn("rounded-2xl border p-4 md:p-5", panel)}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-bold"><Scale className="h-4 w-4 text-[#D6BE00]" /> Metric comparison</p>
            <p className={cn("mt-1 text-xs", muted)}>Best values are highlighted only where higher clearly represents stronger performance.</p>
          </div>
          {selectedChartMetric && (
            <select value={selectedChartMetric.id} onChange={(event) => setChartMetric(event.target.value)} className={cn("h-9 rounded-lg border px-3 text-xs", input)}>
              {metrics.filter((metric) => metric.id !== "bestDay" && metric.id !== "lowestActiveDay").map((metric) => <option key={metric.id} value={metric.id}>{metric.label}</option>)}
            </select>
          )}
        </div>

        {selectedChartMetric && (
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={gridStroke} vertical={false} />
                <XAxis dataKey="label" stroke={axisStroke} tick={{ fontSize: 11 }} interval={0} />
                <YAxis stroke={axisStroke} tick={{ fontSize: 11 }} tickFormatter={compactNumber} width={48} />
                <Tooltip formatter={(value) => selectedChartMetric.format(Number(value), data.results[0])} contentStyle={{ background: isDark ? "rgba(5,6,5,.96)" : "rgba(255,255,255,.98)", border: `1px solid ${gridStroke}`, borderRadius: 10 }} />
                <Bar dataKey="value" fill="#E6CE20" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className={cn("mt-4 overflow-x-auto rounded-xl border", table)}>
          <table className="min-w-[680px] w-full text-sm">
            <thead>
              <tr className={isDark ? "bg-white/[0.04]" : "bg-slate-50"}>
                <th className={cn("sticky left-0 z-10 min-w-44 px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider", isDark ? "bg-[#111211]" : "bg-slate-50", muted)}>Metric</th>
                {data.results.map((result) => <th key={result.block.id} className="min-w-36 px-3 py-2 text-right text-xs font-semibold">{result.displayLabel}</th>)}
              </tr>
            </thead>
            <tbody>
              {metrics.map((metric) => {
                const best = bestByMetric.get(metric.id);
                return (
                  <tr key={metric.id} className={isDark ? "border-t border-white/10" : "border-t border-slate-200"}>
                    <th className={cn("sticky left-0 z-10 px-3 py-2 text-left text-xs font-medium", isDark ? "bg-[#0D0E0D]" : "bg-white")}>{metric.label}</th>
                    {data.results.map((result) => {
                      const value = metric.read(result.metrics);
                      const highlighted = best !== undefined && value === best;
                      return (
                        <td key={result.block.id} className={cn("px-3 py-2 text-right font-mono", highlighted && "bg-[#E6CE20]/12 text-[#B39D00] font-bold")}>
                          {value === null ? <span className={muted}>—</span> : metric.format(value, result)}
                          {value !== null && metric.detail?.(result) && <span className={cn("block text-[10px] font-sans font-normal", muted)}>{metric.detail(result)}</span>}
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

      <section className={cn("rounded-2xl border p-4", panel)}>
        <p className="flex items-center gap-2 text-sm font-bold"><CalendarRange className="h-4 w-4 text-[#D6BE00]" /> What changed</p>
        {data.insights.length > 0 ? (
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {data.insights.map((insight) => <p key={insight} className={cn("rounded-xl border px-3 py-2 text-sm leading-relaxed", isDark ? "border-white/10 bg-black/20 text-white/75" : "border-slate-200 bg-slate-50 text-slate-700")}>{insight}</p>)}
          </div>
        ) : <p className={cn("mt-2 text-sm", muted)}>Add at least two periods with data to generate comparison signals.</p>}
      </section>
    </div>
  );
}

function Summary({ label, value, muted }: { label: string; value: string; muted: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-border/70 bg-background/20 p-2.5">
      <p className={cn("truncate text-[9px] font-bold uppercase tracking-wider", muted)}>{label}</p>
      <p className="mt-1 truncate text-sm font-bold font-mono">{value}</p>
    </div>
  );
}
