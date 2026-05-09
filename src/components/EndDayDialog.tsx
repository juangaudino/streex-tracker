import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { dayTotal, formatCurrency, weekTotal } from "@/lib/store";
import type { WeekRecord, DayEntry } from "@/lib/types";
import { getDayOfWeekRecord } from "@/components/ActiveMomentum";
import { getNearAchievementHints, getWeeklyMomentumPreview } from "@/lib/career";
import { Trophy, Flame, TrendingUp, Sparkles, Target } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  openWeek: WeekRecord;
  weeks: WeekRecord[];
  todayEntry: DayEntry;
  currencySymbol: string;
  onConfirm: () => void;
}

export default function EndDayDialog({
  open, onOpenChange, openWeek, weeks, todayEntry, currencySymbol: sym, onConfirm,
}: Props) {
  const todayT = dayTotal(todayEntry);
  const dayName = todayEntry.dayName;
  const dayRec = getDayOfWeekRecord(weeks, dayName, todayEntry.date);
  const recordBroken = dayRec.record > 0 && todayT > dayRec.record;
  const wt = weekTotal(openWeek);
  const goalPct = openWeek.weeklyGoal > 0 ? (wt / openWeek.weeklyGoal) * 100 : 0;

  const vsAvg = dayRec.avg > 0 ? ((todayT - dayRec.avg) / dayRec.avg) * 100 : null;

  const commentary = (() => {
    if (recordBroken) return `History updated — new ${dayName} record.`;
    if (vsAvg !== null && vsAvg >= 25) return `Strong ${dayName} energy. Above your average.`;
    if (vsAvg !== null && vsAvg >= 0) return "Consistency building. Current you is outperforming past you.";
    if (todayT > 0) return `${dayName} closed. Tomorrow is another rep.`;
    return "Day closed. Reset and return stronger.";
  })();

  const weeklyPreview = getWeeklyMomentumPreview(weeks, openWeek.id, sym);
  const nearAchievements = getNearAchievementHints(weeks, todayT, sym);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-gold/20">
        <div className="relative bg-gradient-to-br from-card via-card to-background p-6 space-y-5">
          <div className="absolute -top-16 -right-16 w-40 h-40 bg-gold/10 rounded-full blur-3xl pointer-events-none" />
          <DialogHeader className="relative">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-gold">Day Complete</p>
            <DialogTitle className="text-2xl font-bold tracking-tight">
              {dayName} closed.
            </DialogTitle>
          </DialogHeader>

          {/* Hero earned */}
          <div className="relative bg-card/60 border border-border rounded-xl p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Today Earned</p>
            <p className="text-3xl font-bold font-mono text-gold mt-1">
              {formatCurrency(todayT, sym)}
            </p>
          </div>

          {/* Stat chips */}
          <div className="grid grid-cols-2 gap-2">
            {recordBroken && (
              <Chip icon={<Trophy className="h-3.5 w-3.5" />} label="Record" value={`${dayName}`} accent="gold" />
            )}
            {vsAvg !== null && (
              <Chip
                icon={<TrendingUp className="h-3.5 w-3.5" />}
                label={`vs avg ${dayName}`}
                value={`${vsAvg > 0 ? "+" : ""}${vsAvg.toFixed(0)}%`}
                accent={vsAvg >= 0 ? "success" : "warning"}
              />
            )}
            <Chip
              icon={<Target className="h-3.5 w-3.5" />}
              label="Week Pace"
              value={`${goalPct.toFixed(0)}%`}
              accent={goalPct >= 100 ? "success" : "primary"}
            />
            <Chip icon={<Flame className="h-3.5 w-3.5" />} label="Week Total" value={formatCurrency(wt, sym)} accent="primary" />
          </div>

          {/* Commentary */}
          <div className="bg-accent/40 border border-border rounded-xl px-4 py-3">
            <p className="text-sm font-medium leading-relaxed">💬 {commentary}</p>
          </div>

          {/* Weekly preview */}
          {weeklyPreview && (
            <div className="bg-primary/10 border border-primary/30 rounded-xl px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1">Weekly Momentum</p>
              <p className="text-sm font-medium leading-relaxed text-primary">{weeklyPreview}</p>
            </div>
          )}

          {/* Near achievements */}
          {nearAchievements.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Within Reach
              </p>
              <div className="space-y-1.5">
                {nearAchievements.map((a, i) => (
                  <div key={i} className="flex items-center justify-between bg-card/50 border border-border rounded-lg px-3 py-2">
                    <span className="text-sm font-medium">{a.label}</span>
                    <span className="text-xs font-mono text-muted-foreground">{a.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Keep Going
            </Button>
            <Button className="flex-1" onClick={onConfirm}>
              Close Day
            </Button>
          </div>
          <p className="text-[10px] text-center text-muted-foreground/60">
            The journey continues tomorrow.
          </p>
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
      <p className="text-sm font-bold font-mono mt-0.5">{value}</p>
    </div>
  );
}
