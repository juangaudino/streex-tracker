import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CalendarRange, Layers, Plus, RefreshCw, Scale, Trash2 } from "lucide-react";
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
    { id: "block-a", type: "day", startDate: todayString(), endDate: todayString() },
    { id: "block-b", type: "day", startDate: todayString(), endDate: todayString() },
  ]);
  const [appFilter, setAppFilter] = useState(() => searchParams.get("compareApp") || "all");
  const [chartMetric, setChartMetric] = useState("earnings");

  const data = useMemo(() => buildComparisonData({ blocks, weeks, appFilter, currencySymbol }), [appFilter, blocks, currencySymbol, weeks]);
  const metrics = useMemo(() => metricDefinitions(currencySymbol).filter((metric) => data.results.some((result) => metric.read(result.metrics) !== null)), [currencySymbol, data.results]);
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
    ? "lg:grid-cols-4"
    : blocks.length === 3
      ? "lg:grid-cols-3"
      : "lg:grid-cols-2";

  return (
    <div className="space-y-5">
      {/* Compare controls — visually paired with the "Explore your data" panel above. */}
      <section className={cn("rounded-2xl border p-4 md:p-5 backdrop-blur", panel)}>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="grid gap-1.5">
            <span className={cn("text-[10px] font-black uppercase tracking-[0.18em]", label)}>Compare controls</span>
            <p className={cn("text-xs leading-relaxed", muted)}>
              Build 2–4 period blocks. Edits clear preset labels so titles always match the dates.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className={cn("grid gap-1.5 text-[10px] font-black uppercase tracking-[0.18em]", label)}>
              App filter
              <select
                value={appFilter}
                onChange={(event) => persist(blocks, event.target.value)}
                className={cn("h-10 min-w-[10rem] rounded-xl border px-3 text-sm font-semibold outline-none transition", input)}
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
      </section>

      {/* Block columns — horizontal on desktop, stacked on mobile. */}
      <section className={cn("grid gap-3 grid-cols-1", columnClass)}>
        {blocks.map((block, index) => {
          const result = data.results[index];
          const accent = accentFor(index);
          return (
            <article
              key={block.id}
              className={cn("relative overflow-hidden rounded-2xl border p-4 backdrop-blur", panel)}
              style={{ borderTopColor: accent.color, borderTopWidth: 3 }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: accent.color }}>
                    Block {index + 1}
                  </p>
                  <p className={cn("mt-1 truncate text-base font-bold", text)}>{result?.displayLabel}</p>
                  <p className={cn("text-[11px] font-mono", quiet)}>{result?.rangeLabel}</p>
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
                  <span className={cn("text-[9px] font-bold uppercase tracking-wider", label)}>End</span>
                  <Input
                    type="date"
                    min={block.startDate}
                    max={todayString()}
                    value={block.endDate}
                    readOnly={block.type !== "custom"}
                    disabled={block.type !== "custom"}
                    onChange={(event) => changeCustomEnd(block, event.target.value)}
                    className={cn("h-9 text-xs disabled:opacity-70", input)}
                  />
                </label>
                <label className="col-span-2 space-y-1">
                  <span className={cn("text-[9px] font-bold uppercase tracking-wider", label)}>Label override (optional)</span>
                  <Input
                    value={block.label ?? ""}
                    maxLength={32}
                    placeholder="Auto-generated from dates"
                    onChange={(event) => updateBlock(block.id, { label: event.target.value || undefined })}
                    className={cn("h-9 text-xs", input)}
                  />
                </label>
              </div>

              <div className={cn("mt-4 grid grid-cols-3 gap-2 rounded-xl border p-2", isDark ? "border-white/10 bg-black/20" : "border-slate-200 bg-slate-50/60")}>
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
              </div>

              <p className={cn("mt-3 text-[10px] font-mono", quiet)}>
                {formatHumanDate(block.startDate)} → {formatHumanDate(block.endDate)}
              </p>
            </article>
          );
        })}
      </section>

      {/* Chart panel */}
      <section className={cn("rounded-2xl border p-4 md:p-5 backdrop-blur", panel)}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-[#E6CE20]" />
            <div>
              <h3 className={cn("text-sm font-bold tracking-wide", text)}>Side-by-side chart</h3>
              <p className={cn("text-xs", muted)}>Each bar uses its block's identity color.</p>
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
                <YAxis stroke={axisStroke} tick={{ fontSize: 11 }} tickFormatter={compactNumber} width={48} tickLine={false} axisLine={false} />
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
                      style={{ color: accent.color }}
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

      {/* Narrative */}
      <section className={cn("rounded-2xl border p-4 md:p-5 backdrop-blur", panel)}>
        <div className="flex items-center gap-2">
          <CalendarRange className="h-4 w-4 text-[#E6CE20]" />
          <h3 className={cn("text-sm font-bold tracking-wide", text)}>What changed</h3>
        </div>
        {data.insights.length > 0 ? (
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {data.insights.map((insight) => (
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
