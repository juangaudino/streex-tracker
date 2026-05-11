import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { weekTotal, dayTotal, formatCurrency } from "@/lib/store";
import type { WeekRecord } from "@/lib/types";
import { getBestDayOfWeek, getWeekRanking, getWeekRecordGap, getWeekdayHistoricalRank } from "@/lib/career";
import { Trophy, Target, Flame, Sparkles, TrendingUp, Calendar } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  week: WeekRecord;
  weeks: WeekRecord[];
  currencySymbol: string;
  onConfirm: () => void;
  onStartNext?: () => void;
}

export default function WeekClosingDialog({
  open, onOpenChange, week, weeks, currencySymbol: sym, onConfirm, onStartNext,
}: Props) {
  const wt = weekTotal(week);
  const goal = week.weeklyGoal;
  const goalPct = goal > 0 ? (wt / goal) * 100 : 0;
  const best = getBestDayOfWeek(week);
  const bestRank = best.total > 0
    ? getWeekdayHistoricalRank(weeks, best.dayName, best.date, best.total)
    : null;
  const ranking = getWeekRanking(weeks.filter((w) => w.status === "closed" || w.id === week.id), week.id);
  const recordGap = getWeekRecordGap(weeks, week.id);

  const activeDays = week.entries.filter((d) => dayTotal(d) > 0).length;

  const headline = (() => {
    if (recordGap === 0) return "Strongest week yet.";
    if (goalPct >= 120) return "Beast week locked in.";
    if (goalPct >= 100) return "Goal crushed — chapter complete.";
    if (ranking.rank > 0 && ranking.rank <= 3 && ranking.total >= 3) return `Top ${ranking.rank} week ever.`;
    return "Another chapter complete.";
  })();

  const insights: string[] = [];
  if (recordGap !== null && recordGap > 0 && recordGap < wt * 0.15) {
    insights.push(`Only ${formatCurrency(recordGap, sym)} away from your all-time week record.`);
  }
  if (bestRank && bestRank.rank === 1 && bestRank.total >= 2) {
    insights.push(`Strongest ${best.dayName} ever.`);
  } else if (bestRank && bestRank.rank <= 3 && bestRank.total >= 4) {
    insights.push(`Top ${bestRank.rank} ${best.dayName} on record.`);
  }
  if (activeDays >= 5) insights.push(`${activeDays} active days — momentum carried.`);
  if (goalPct >= 100 && goalPct < 120) insights.push("Target smashed — surplus stacked.");
  if (goalPct >= 120) insights.push("Above 120% of goal — outlier energy.");

  const closingLines = [
    "This week moved the story forward.",
    "Momentum carried.",
    "The grind continues tomorrow.",
    "Another rep added to the career.",
  ];
  const closingLine = closingLines[Math.floor(wt) % closingLines.length];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-gold/20">
        <div className="relative bg-gradient-to-br from-card via-card to-background p-6 space-y-5 max-h-[85vh] overflow-y-auto">
          <div className="absolute -top-16 -right-16 w-40 h-40 bg-gold/10 rounded-full blur-3xl pointer-events-none" />
          <DialogHeader className="relative">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-gold">Week Complete</p>
            <DialogTitle className="text-2xl font-bold tracking-tight">{headline}</DialogTitle>
            <p className="text-xs text-muted-foreground font-mono">
              {week.startDate} → {week.endDate}
            </p>
          </DialogHeader>

          {/* Hero earned */}
          <div className="relative bg-card/60 border border-border rounded-xl p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Week Earned</p>
            <p className="text-3xl font-bold font-mono text-gold mt-1">{formatCurrency(wt, sym)}</p>
            {goal > 0 && (
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>Goal {formatCurrency(goal, sym)}</span>
                  <span className="font-mono font-bold text-foreground">{goalPct.toFixed(0)}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-gold rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(goalPct, 100)}%` }} />
                </div>
              </div>
            )}
          </div>

          {/* Stat chips */}
          <div className="grid grid-cols-2 gap-2">
            {best.total > 0 && (
              <Chip icon={<Trophy className="h-3.5 w-3.5" />} label="Best Day" value={`${best.dayName.slice(0,3)} · ${formatCurrency(best.total, sym)}`} accent="gold" />
            )}
            <Chip icon={<Target className="h-3.5 w-3.5" />} label="Goal" value={`${goalPct.toFixed(0)}%`} accent={goalPct >= 100 ? "success" : "primary"} />
            <Chip icon={<Flame className="h-3.5 w-3.5" />} label="Active Days" value={`${activeDays}/7`} accent="warning" />
            {ranking.rank > 0 && ranking.total > 1 && (
              <Chip icon={<Calendar className="h-3.5 w-3.5" />} label="Week Rank" value={`#${ranking.rank} of ${ranking.total}`} accent="primary" />
            )}
          </div>

          {/* Insights */}
          {insights.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Insights
              </p>
              <div className="space-y-1.5">
                {insights.map((i, idx) => (
                  <div key={idx} className="bg-card/50 border border-border rounded-lg px-3 py-2 text-sm font-medium leading-relaxed flex gap-2">
                    <TrendingUp className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                    <span>{i}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Closing line */}
          <div className="bg-accent/40 border border-border rounded-xl px-4 py-3">
            <p className="text-sm font-medium leading-relaxed">💬 {closingLine}</p>
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Not Yet
            </Button>
            <Button className="flex-1" onClick={onConfirm}>
              Close Week
            </Button>
          </div>
          {onStartNext && (
            <p className="text-[10px] text-center text-muted-foreground/60">
              A new week unlocks right after.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Chip({ icon, label, value, accent }: {
  icon: React.ReactNode; label: string; value: string;
  accent: "gold" | "success" | "warning" | "primary";
}) {
  const cls = accent === "gold" ? "border-gold/30 text-gold"
    : accent === "success" ? "border-success/30 text-success"
    : accent === "warning" ? "border-warning/30 text-warning"
    : "border-primary/30 text-primary";
  return (
    <div className={`bg-card/60 border ${cls} rounded-lg px-3 py-2`}>
      <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider opacity-80">
        {icon}<span>{label}</span>
      </div>
      <p className="text-sm font-bold font-mono mt-0.5 truncate">{value}</p>
    </div>
  );
}