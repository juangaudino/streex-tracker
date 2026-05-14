import { useMemo, useState, useEffect } from "react";
import { useOutletContext, useNavigate, useSearchParams } from "react-router-dom";
import type { StoreContext } from "./types";
import {
  getMonthSummary,
  getMonthHeadline,
  getMonthClose,
  listMonthsWithData,
  getPreviousMonth,
  type MonthSummary,
  type MonthAppBreakdown,
  type MonthDayCell,
} from "@/lib/monthly";
import { formatCurrency } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Calendar,
  Trophy,
  Flame,
  Sparkles,
  Crown,
  ArrowRight,
} from "lucide-react";

export default function MonthlyRecapPage() {
  const { weeks, settings } = useOutletContext<StoreContext>();
  const sym = settings.currencySymbol;
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const months = useMemo(() => listMonthsWithData(weeks), [weeks]);
  const fallback = months.length > 0
    ? months[months.length - 1]
    : (() => {
        const p = getPreviousMonth();
        return `${p.year}-${String(p.month + 1).padStart(2, "0")}`;
      })();
  const monthKey = params.get("m") || fallback;
  const [yy, mm] = monthKey.split("-").map(Number);

  const summary = useMemo(
    () => getMonthSummary(weeks, yy, mm - 1),
    [weeks, yy, mm],
  );

  const idx = months.indexOf(monthKey);
  const prevKey = idx > 0 ? months[idx - 1] : null;
  const nextKey = idx >= 0 && idx < months.length - 1 ? months[idx + 1] : null;

  function setMonth(k: string) {
    setParams({ m: k });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (months.length === 0 || summary.totalEarned <= 0 && summary.daysWorked === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center gap-3">
        <Sparkles className="h-10 w-10 text-primary opacity-60" />
        <h2 className="text-2xl font-bold">Your first recap is coming</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          Once you log a few days, your monthly story will appear here.
        </p>
        <Button onClick={() => navigate("/")} variant="outline" className="mt-2">
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8 space-y-12 sm:space-y-16">
      {/* Month switcher */}
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="sm"
          disabled={!prevKey}
          onClick={() => prevKey && setMonth(prevKey)}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Prev
        </Button>
        <p className="text-[11px] font-mono text-muted-foreground tracking-wider uppercase">
          {summary.monthLabel} · Recap
        </p>
        <Button
          variant="ghost"
          size="sm"
          disabled={!nextKey}
          onClick={() => nextKey && setMonth(nextKey)}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      <ScreenHeadline summary={summary} />
      <ScreenNumbers summary={summary} sym={sym} />
      {summary.strongestWeek && <ScreenStrongestWeek summary={summary} sym={sym} />}
      {summary.apps.length > 0 && <ScreenApps summary={summary} sym={sym} />}
      <ScreenHeatmap summary={summary} sym={sym} />
      <ScreenClose summary={summary} sym={sym} onContinue={() => navigate("/")} />
    </div>
  );
}

/* ───── Screen 1 ───── */
function ScreenHeadline({ summary }: { summary: MonthSummary }) {
  const headline = getMonthHeadline(summary);
  return (
    <section className="relative min-h-[55vh] sm:min-h-[60vh] flex flex-col items-center justify-center text-center overflow-hidden rounded-2xl bg-gradient-to-br from-card via-background to-card border border-border p-8">
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 bg-primary/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-48 h-48 bg-gold/10 rounded-full blur-3xl pointer-events-none" />
      <div className="relative space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-700">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary flex items-center justify-center gap-2">
          <Sparkles className="h-3 w-3" /> Monthly Recap
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight max-w-md mx-auto">
          {headline}
        </h1>
        <p className="text-sm text-muted-foreground font-mono tracking-wider">
          {summary.monthLabel}
        </p>
      </div>
      <p className="relative mt-10 text-xs text-muted-foreground/70 italic flex items-center gap-1">
        See your month <ArrowRight className="h-3 w-3" />
      </p>
    </section>
  );
}

/* ───── Screen 2 ───── */
function ScreenNumbers({ summary, sym }: { summary: MonthSummary; sym: string }) {
  const cards = [
    { icon: <DollarSign className="h-4 w-4" />, label: "Total Earned", value: formatCurrency(summary.totalEarned, sym), accent: "text-primary" },
    { icon: <Calendar className="h-4 w-4" />, label: "Days Worked", value: `${summary.daysWorked}`, accent: "text-foreground" },
    { icon: <Trophy className="h-4 w-4" />, label: "Best Day", value: summary.bestDay.total > 0 ? formatCurrency(summary.bestDay.total, sym) : "—", accent: "text-gold" },
    { icon: <Flame className="h-4 w-4" />, label: "Longest Streak", value: `${summary.longestStreak}d`, accent: "text-warning" },
  ];
  return (
    <section className="space-y-4">
      <SectionLabel>Month in numbers</SectionLabel>
      <div className="grid grid-cols-2 gap-3">
        {cards.map((c, i) => (
          <div
            key={c.label}
            className="bg-card border border-border rounded-2xl p-5 animate-in fade-in slide-in-from-bottom-2"
            style={{ animationDelay: `${i * 120}ms`, animationDuration: "500ms", animationFillMode: "both" }}
          >
            <div className="flex items-center gap-1.5 text-muted-foreground mb-2 text-[10px] font-bold uppercase tracking-wider">
              {c.icon}
              <span>{c.label}</span>
            </div>
            <p className={`text-2xl sm:text-3xl font-bold font-mono ${c.accent}`}>{c.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ───── Screen 3 ───── */
function ScreenStrongestWeek({ summary, sym }: { summary: MonthSummary; sym: string }) {
  const w = summary.strongestWeek!;
  const insights: string[] = [];
  if (w.bestApp.total > 0 && w.bestApp.total / w.total >= 0.4) {
    insights.push(`${w.bestApp.app} was your engine this week.`);
  }
  if (w.activeDays >= 5) insights.push(`${w.activeDays} active days in a row of work.`);
  if (w.isBestEver) insights.push("Your most consistent week of the month.");
  if (insights.length === 0) insights.push("A solid run that anchored your month.");

  return (
    <section className="space-y-4">
      <SectionLabel>Strongest week</SectionLabel>
      <div className="relative bg-gradient-to-br from-card to-background border border-gold/20 rounded-2xl p-6 overflow-hidden">
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-gold/10 rounded-full blur-3xl pointer-events-none" />
        {w.isBestEver && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-gold/15 text-gold mb-3">
            <Crown className="h-3 w-3" /> Your best week ever
          </span>
        )}
        <p className="text-[10px] font-mono text-muted-foreground tracking-wider uppercase">
          {w.weekLabel} · {w.startDate} → {w.endDate}
        </p>
        <p className="text-3xl sm:text-4xl font-bold font-mono text-gold mt-2">
          {formatCurrency(w.total, sym)}
        </p>
        <div className="mt-4 space-y-2">
          {insights.map((i, idx) => (
            <p key={idx} className="text-sm text-foreground/90 leading-relaxed">
              · {i}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───── Screen 4 ───── */
function ScreenApps({ summary, sym }: { summary: MonthSummary; sym: string }) {
  const apps = summary.apps.slice(0, 6);
  const max = Math.max(...apps.map((a) => a.total), 1);
  return (
    <section className="space-y-4">
      <SectionLabel>App breakdown</SectionLabel>
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        {apps.map((a, i) => (
          <AppBar key={a.app} app={a} max={max} sym={sym} delay={i * 80} />
        ))}
        {appNarrative(summary) && (
          <p className="text-xs text-muted-foreground italic pt-2 border-t border-border/50">
            {appNarrative(summary)}
          </p>
        )}
      </div>
    </section>
  );
}

function appNarrative(s: MonthSummary): string | null {
  const top = s.apps[0];
  if (!top) return null;
  if (top.pct > 50) return `${top.app} carried your month.`;
  const grew = s.apps.find((a) => a.growthPct !== null && a.growthPct >= 10);
  if (grew) return `${grew.app} is growing — up ${Math.round(grew.growthPct!)}% from last month.`;
  const led = s.apps.find((a) => a.topDays >= 3);
  if (led) return `${led.app} led ${led.topDays} of your strongest days.`;
  const light = s.apps.find((a) => a.pct < 5);
  if (light) return `${light.app} was light this month — maybe next.`;
  return null;
}

function AppBar({ app, max, sym, delay }: { app: MonthAppBreakdown; max: number; sym: string; delay: number }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW((app.total / max) * 100), delay + 50);
    return () => clearTimeout(t);
  }, [app.total, max, delay]);
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium truncate">{app.app}</span>
        <span className="font-mono text-xs text-muted-foreground">
          {app.pct.toFixed(0)}% · <span className="text-foreground">{formatCurrency(app.total, sym)}</span>
        </span>
      </div>
      <div className="h-2 bg-muted/60 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary/80 to-primary rounded-full transition-all"
          style={{ width: `${w}%`, transitionDuration: "700ms" }}
        />
      </div>
    </div>
  );
}

/* ───── Screen 5 ───── */
function ScreenHeatmap({ summary, sym }: { summary: MonthSummary; sym: string }) {
  const [tip, setTip] = useState<MonthDayCell | null>(null);
  const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];
  return (
    <section className="space-y-4">
      <SectionLabel>Month at a glance</SectionLabel>
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] text-muted-foreground/60 font-bold uppercase mb-2">
          {dayLabels.map((d, i) => (
            <div key={i}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {summary.heatmap.map((cell, i) => {
            const empty = !cell.date;
            const tone = cellTone(cell);
            const isLegendary = cell.tier === "legendary";
            return (
              <button
                key={i}
                disabled={empty}
                onClick={() => setTip(tip?.date === cell.date ? null : cell)}
                className={`relative aspect-square rounded-md ${tone} ${empty ? "opacity-0" : "hover:scale-110 transition-transform"} ${isLegendary ? "ring-2 ring-gold shadow-[0_0_18px_hsl(var(--gold)/0.55)] animate-pulse" : ""}`}
                aria-label={cell.date}
              >
                {isLegendary && !empty && (
                  <Sparkles className="absolute inset-0 m-auto h-2.5 w-2.5 text-gold-foreground/90" />
                )}
              </button>
            );
          })}
        </div>
        {tip && tip.date && (
          <div className="mt-3 bg-accent/40 border border-border rounded-lg px-3 py-2 text-xs flex items-center justify-between animate-in fade-in duration-200">
            <span className="font-mono text-muted-foreground">{tip.date}</span>
            <span className="font-bold font-mono">
              {tip.worked ? formatCurrency(tip.total, sym) : "Day off"}
            </span>
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-4 text-center">
          {summary.daysWorked} days worked · {summary.daysOff} days off
          {summary.legendaryDays > 0 ? ` · ${summary.legendaryDays} legendary day${summary.legendaryDays === 1 ? "" : "s"}` : ""}
        </p>
      </div>
    </section>
  );
}

function cellTone(c: MonthDayCell): string {
  if (!c.date) return "bg-transparent";
  switch (c.tier) {
    case "legendary": return "bg-gold";
    case "top": return "bg-gold/80";
    case "strong": return "bg-success";
    case "solid": return "bg-success/60";
    case "low": return "bg-success/30";
    case "off":
    default:
      return "bg-muted/60";
  }
}

/* ───── Screen 6 ───── */
function ScreenClose({ summary, sym, onContinue }: { summary: MonthSummary; sym: string; onContinue: () => void }) {
  const line = getMonthClose(summary);
  return (
    <section className="text-center py-10 sm:py-14 px-4 space-y-6">
      <div className="space-y-3 max-w-md mx-auto">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">
          {summary.monthName} · Closing
        </p>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight leading-snug">
          {line}
        </h2>
        {summary.totalEarned > 0 && (
          <p className="text-sm text-muted-foreground font-mono">
            {formatCurrency(summary.totalEarned, sym)} earned · {summary.daysWorked} days
          </p>
        )}
      </div>
      <Button size="lg" onClick={onContinue}>
        Start {summary.nextMonthName} strong
        <ArrowRight className="h-4 w-4 ml-2" />
      </Button>
    </section>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
      {children}
    </p>
  );
}