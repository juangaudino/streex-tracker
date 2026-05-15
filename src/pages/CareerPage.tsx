import { useOutletContext, useNavigate } from "react-router-dom";
import { computeCareerStats, computePerformanceInsights } from "@/lib/career";
import { formatCurrency } from "@/lib/store";
import type { StoreContext } from "./types";
import {
  Trophy, Flame, Calendar, Activity, Target,
  Sparkles, Crown, Zap, Map, BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateWeeklyLetter } from "@/lib/weeklyLetter";
import WeeklyLetterCard from "@/components/WeeklyLetterCard";

export default function CareerPage() {
  const { weeks, settings } = useOutletContext<StoreContext>();
  const navigate = useNavigate();
  const sym = settings.currencySymbol;
  const stats = computeCareerStats(weeks);
  const mp = stats.monthlyProgression;
  const perf = computePerformanceInsights(weeks);

  const lastClosed = [...weeks]
    .filter((w) => w.status === "closed")
    .sort((a, b) => b.endDate.localeCompare(a.endDate))[0];
  const latestLetter = lastClosed ? generateWeeklyLetter(lastClosed, weeks, sym) : null;

  if (weeks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 px-4 text-center">
        <Crown className="h-10 w-10 text-gold opacity-60" />
        <h2 className="text-2xl font-bold">Your career starts here</h2>
        <p className="text-muted-foreground max-w-md text-sm">
          Log your first week to begin building your gig journey.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      {/* Identity hero */}
      <section className="relative overflow-hidden rounded-2xl border border-gold/20 bg-gradient-to-br from-card to-card/40 p-6 shadow-sm">
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-gold/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative space-y-4">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-gold">
            <Crown className="h-3.5 w-3.5" />
            Career Identity
          </div>
          <div>
            <p className="text-3xl sm:text-4xl font-bold tracking-tight">{stats.archetype}</p>
            <p className="text-sm text-muted-foreground mt-1">{stats.momentumStatus}</p>
          </div>
          <div className="pt-2 border-t border-border/50">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Lifetime Earnings</p>
            <p className="text-4xl sm:text-5xl font-bold font-mono text-gold mt-1">
              {formatCurrency(stats.lifetimeEarnings, sym)}
            </p>
          </div>
          {/* XP placeholder */}
          <div className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">
            <Sparkles className="h-3 w-3" />
            Career Rank · coming soon
          </div>
        </div>
      </section>

      {/* Journey CTA */}
      <button
        onClick={() => navigate("/journey")}
        className="w-full text-left bg-card border border-border rounded-xl p-4 flex items-center gap-3 hover:border-primary/40 transition-colors"
      >
        <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <Map className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">View Your Journey</p>
          <p className="text-[11px] text-muted-foreground">Every milestone, record, and chapter so far.</p>
        </div>
        <span className="text-primary text-lg">→</span>
      </button>

      {/* Latest Weekly Letter */}
      {latestLetter && (
        <section className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Latest Letter</h2>
          <WeeklyLetterCard letter={latestLetter} />
        </section>
      )}

      {/* Hero stats row */}
      <section className="grid grid-cols-2 gap-3">
        <HeroStat
          icon={<Trophy className="h-4 w-4" />}
          label="Best Day Ever"
          value={stats.bestDay.total > 0 ? formatCurrency(stats.bestDay.total, sym) : "—"}
          sub={stats.bestDay.dayName !== "—" ? `${stats.bestDay.dayName} · ${stats.bestDay.date}` : "No data yet"}
          accent="gold"
        />
        <HeroStat
          icon={<Calendar className="h-4 w-4" />}
          label="Best Week Ever"
          value={stats.bestWeek.total > 0 ? formatCurrency(stats.bestWeek.total, sym) : "—"}
          sub={stats.bestWeek.startDate ? `${stats.bestWeek.startDate} → ${stats.bestWeek.endDate}` : "—"}
          accent="primary"
        />
      </section>

      {/* Streaks */}
      <section className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Streaks</h2>
        <div className="grid grid-cols-2 gap-3">
          <StatBlock
            icon={<Flame className="h-4 w-4 text-warning" />}
            label="Current Streak"
            value={`${stats.currentStreak} day${stats.currentStreak === 1 ? "" : "s"}`}
          />
          <StatBlock
            icon={<Zap className="h-4 w-4 text-beast-purple" />}
            label="Longest Streak"
            value={`${stats.longestStreak} day${stats.longestStreak === 1 ? "" : "s"}`}
          />
        </div>
      </section>

      {/* Monthly progression — chase model */}
      <section className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Monthly Progression</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ProgressionCard
            title="This Month vs Last Month"
            pct={mp.pctOfLastMonth}
            currentValue={formatCurrency(mp.currentMonthTotal, sym)}
            targetLabel="Last month"
            targetValue={mp.lastMonthTotal > 0 ? formatCurrency(mp.lastMonthTotal, sym) : "—"}
            emptyMessage="Building your first comparison."
            accent="primary"
          />
          <ProgressionCard
            title="Best Month Chase"
            pct={mp.pctOfBestMonth}
            currentValue={formatCurrency(mp.currentMonthTotal, sym)}
            targetLabel={mp.isCurrentBest ? "New record this month" : "Best month ever"}
            targetValue={mp.bestMonthTotal > 0 ? formatCurrency(mp.bestMonthTotal, sym) : "—"}
            emptyMessage="Your legacy starts here."
            accent="gold"
            isRecord={mp.isCurrentBest}
          />
        </div>
      </section>

      {/* Performance */}
      <section className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Performance</h2>
        <div className="grid grid-cols-2 gap-3">
          <StatBlock
            icon={<Activity className="h-4 w-4 text-primary" />}
            label="Avg Daily"
            value={formatCurrency(stats.avgDaily, sym)}
          />
          <StatBlock
            icon={<Target className="h-4 w-4 text-success" />}
            label="Total Active Days"
            value={`${stats.totalActiveDays}`}
          />
          <StatBlock
            icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
            label="Entries Logged"
            value={`${stats.totalEntriesLogged}`}
          />
        </div>
      </section>

      {/* Identity insights */}
      <section className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Insights</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <StatBlock
            icon={<Crown className="h-4 w-4 text-gold" />}
            label="Best Weekday"
            value={stats.bestWeekday.dayName !== "—"
              ? `${stats.bestWeekday.dayName}`
              : "—"}
            sub={stats.bestWeekday.avg > 0 ? `${formatCurrency(stats.bestWeekday.avg, sym)} avg` : undefined}
          />
          <StatBlock
            icon={<Sparkles className="h-4 w-4 text-primary" />}
            label="Most Used App"
            value={stats.mostUsedApp.app}
            sub={stats.mostUsedApp.total > 0 ? formatCurrency(stats.mostUsedApp.total, sym) : undefined}
          />
        </div>
      </section>

      {/* Performance Insights */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Performance Insights</h2>
          <BarChart3 className="h-3.5 w-3.5 text-muted-foreground/60" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <StatBlock icon={<Calendar className="h-4 w-4 text-primary" />} label="Avg Weekly" value={formatCurrency(perf.avgWeeklyEarnings, sym)} />
          <StatBlock icon={<Activity className="h-4 w-4 text-primary" />} label="Avg/Active Day" value={formatCurrency(perf.avgPerActiveDay, sym)} />
          <StatBlock icon={<Target className="h-4 w-4 text-success" />} label="Avg Entries/Wk" value={`${perf.avgEntriesPerWeek.toFixed(1)}`} />
          <StatBlock icon={<Crown className="h-4 w-4 text-gold" />} label="Top Weekday" value={perf.highestEarningWeekday.dayName} sub={perf.highestEarningWeekday.avg > 0 ? `${formatCurrency(perf.highestEarningWeekday.avg, sym)} avg` : undefined} />
          <StatBlock icon={<Sparkles className="h-4 w-4 text-beast-purple" />} label="Most Consistent" value={perf.mostConsistentDay.dayName} />
          <StatBlock icon={<Flame className="h-4 w-4 text-warning" />} label="Best Day Type" value={perf.productiveDayType} sub={`Wknd ${formatCurrency(perf.weekendAvg, sym)} · Wkdy ${formatCurrency(perf.weekdayAvg, sym)}`} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
          {perf.weekdayAverages
            .filter((w) => w.count > 0)
            .map((w) => (
              <div key={w.dayName} className="bg-card rounded-lg border border-border p-2.5">
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{w.dayName.slice(0, 3)}</p>
                <p className="text-sm font-bold font-mono mt-0.5">{formatCurrency(w.avg, sym)}</p>
                <p className="text-[9px] text-muted-foreground/70">{w.count} day{w.count !== 1 ? "s" : ""}</p>
              </div>
            ))}
        </div>
      </section>
    </div>
  );
}

function HeroStat({ icon, label, value, sub, accent }: {
  icon: React.ReactNode; label: string; value: string; sub?: string;
  accent: "gold" | "primary";
}) {
  const accentClass = accent === "gold" ? "border-gold/30" : "border-primary/30";
  const valClass = accent === "gold" ? "text-gold" : "text-primary";
  return (
    <div className={`bg-card rounded-xl border ${accentClass} p-4 space-y-1`}>
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p className={`text-xl font-bold font-mono ${valClass}`}>{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground truncate">{sub}</p>}
    </div>
  );
}

function StatBlock({ icon, label, value, sub }: {
  icon: React.ReactNode; label: string; value: string; sub?: string;
}) {
  return (
    <div className="bg-card rounded-xl border border-border p-4 space-y-1">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-lg font-bold font-mono text-foreground">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function ProgressionCard({
  title, pct, currentValue, targetLabel, targetValue, emptyMessage, accent, isRecord,
}: {
  title: string;
  pct: number | null;
  currentValue: string;
  targetLabel: string;
  targetValue: string;
  emptyMessage: string;
  accent: "primary" | "gold";
  isRecord?: boolean;
}) {
  const accentBorder = accent === "gold" ? "border-gold/30" : "border-primary/30";
  const accentText = accent === "gold" ? "text-gold" : "text-primary";
  const accentBar = accent === "gold" ? "bg-gold" : "bg-primary";
  const displayPct = pct === null ? null : Math.min(Math.round(pct), 999);
  const barWidth = pct === null ? 0 : Math.min(pct, 100);

  return (
    <div className={`relative bg-card rounded-xl border ${accentBorder} p-4 space-y-3 overflow-hidden`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{title}</p>
        {isRecord && (
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-gold/15 text-gold border border-gold/30 uppercase tracking-wider">
            Record
          </span>
        )}
      </div>
      {pct === null ? (
        <p className={`text-sm font-medium ${accentText}`}>{emptyMessage}</p>
      ) : (
        <p className={`text-3xl font-bold font-mono ${accentText}`}>{displayPct}% reached</p>
      )}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${accentBar}`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Current: <span className="font-mono font-bold text-foreground">{currentValue}</span></span>
        <span>{targetLabel}: <span className="font-mono font-bold text-foreground">{targetValue}</span></span>
      </div>
    </div>
  );
}
