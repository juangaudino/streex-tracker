import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { bestDay, dayTotal, formatCurrency, weekTotal } from "@/lib/store";
import type { WeekRecord, DayEntry } from "@/lib/types";
import { getDayOfWeekRecord } from "@/components/ActiveMomentum";
import { getNearAchievementHints, getWeeklyMomentumPreview } from "@/lib/career";
import { getDayMiles, getDayRideCount, getDayShiftHours } from "@/lib/shiftIntelligence";
import { operationalDayTotal } from "@/lib/rewardIncome";
import { exportNodeAsPng, shareNodeAsPng } from "@/lib/shareExport";
import { Trophy, Flame, TrendingUp, Sparkles, Target, Clock, Route, Share2, Download } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
  const reportRef = useRef<HTMLDivElement | null>(null);
  const [exporting, setExporting] = useState<"download" | "share" | null>(null);
  const todayT = dayTotal(todayEntry);
  const operationalToday = operationalDayTotal(todayEntry);
  const dayName = todayEntry.dayName;
  const dayRec = getDayOfWeekRecord(weeks, dayName, todayEntry.date);
  const recordBroken = dayRec.record > 0 && todayT > dayRec.record;
  const wt = weekTotal(openWeek);
  const goalPct = openWeek.weeklyGoal > 0 ? (wt / openWeek.weeklyGoal) * 100 : 0;
  const bestCurrentDay = bestDay(openWeek);
  const isBestDayOfWeek = todayT > 0 && bestCurrentDay.dayName === todayEntry.dayName && bestCurrentDay.total === todayT;
  const todayContribution = wt > 0 ? (todayT / wt) * 100 : null;
  const appsUsed = Object.entries(todayEntry.apps || {}).filter(([, value]) => (Number(value) || 0) > 0);
  const hours = getDayShiftHours(todayEntry);
  const miles = getDayMiles(todayEntry);
  const rides = getDayRideCount(todayEntry);
  const earningsPerHour = hours > 0 ? operationalToday / hours : null;
  const earningsPerMile = miles > 0 ? operationalToday / miles : null;
  const earningsPerRide = rides > 0 ? operationalToday / rides : null;
  const shifts = todayEntry.shifts ?? [];
  const completedShifts = shifts.filter((shift) => shift.endTime);

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
  const insights = useMemo(() => {
    const items: string[] = [];
    if (recordBroken) items.push(`New ${dayName} record. Your history just moved.`);
    else if (vsAvg !== null && vsAvg >= 25) items.push(`Strong ${dayName}. You finished well above your normal ${dayName}.`);
    else if (vsAvg !== null && vsAvg >= 0) items.push(`Solid ${dayName}. You stayed above your usual pace.`);
    else if (todayT > 0) items.push(`${dayName} is closed. The week still has room to build.`);
    if (todayContribution !== null && todayContribution >= 20) items.push(`Today carried ${todayContribution.toFixed(0)}% of this week's total.`);
    if (isBestDayOfWeek) items.push("This is currently your best day of the week.");
    if (hours > 0 && earningsPerHour !== null) items.push(`You worked ${hours.toFixed(1)}h at ${formatCurrency(earningsPerHour, sym)}/hr.`);
    if (nearAchievements[0]) items.push(`${nearAchievements[0].label} is still within reach.`);
    return items.slice(0, 4);
  }, [dayName, earningsPerHour, hours, isBestDayOfWeek, nearAchievements, recordBroken, sym, todayContribution, todayT, vsAvg]);

  async function handleDownloadReport() {
    if (!reportRef.current) return;
    try {
      setExporting("download");
      const blob = await exportNodeAsPng(reportRef.current, `streex-${todayEntry.date}-daily-report.png`);
      toast({ title: blob ? "Report image downloaded." : "Report export failed." });
    } catch {
      toast({ title: "Report export failed.", variant: "destructive" });
    } finally {
      setExporting(null);
    }
  }

  async function handleShareReport() {
    if (!reportRef.current) return;
    try {
      setExporting("share");
      const result = await shareNodeAsPng(reportRef.current, `streex-${todayEntry.date}-daily-report.png`, {
        title: "Streex Daily Report",
        text: `${dayName} closed at ${formatCurrency(todayT, sym)}.`,
      });
      toast({ title: result === "shared" ? "Report shared." : result === "downloaded" ? "Sharing unavailable. Report downloaded." : "Report share failed." });
    } catch {
      toast({ title: "Report share failed.", variant: "destructive" });
    } finally {
      setExporting(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[88vh] p-0 overflow-hidden border-gold/20">
        <div className="relative max-h-[88vh] overflow-y-auto bg-gradient-to-br from-card via-card to-background p-5 space-y-4">
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
            <p className="text-xs text-muted-foreground mt-1">{todayEntry.date}</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {appsUsed.length > 0 && (
              <Chip icon={<Sparkles className="h-3.5 w-3.5" />} label="Apps Used" value={`${appsUsed.length}`} accent="primary" />
            )}
            {hours > 0 && (
              <Chip icon={<Clock className="h-3.5 w-3.5" />} label="Hours" value={`${hours.toFixed(1)}h`} accent="primary" />
            )}
            {earningsPerHour !== null && (
              <Chip icon={<TrendingUp className="h-3.5 w-3.5" />} label="Per Hour" value={`${formatCurrency(earningsPerHour, sym)}/hr`} accent="success" />
            )}
            {miles > 0 && (
              <Chip icon={<Route className="h-3.5 w-3.5" />} label="Miles" value={`${miles.toFixed(1)}`} accent="primary" />
            )}
            {rides > 0 && (
              <Chip icon={<Target className="h-3.5 w-3.5" />} label="Rides" value={`${rides}`} accent="primary" />
            )}
            {earningsPerRide !== null && (
              <Chip icon={<Sparkles className="h-3.5 w-3.5" />} label="Per Ride" value={formatCurrency(earningsPerRide, sym)} accent="success" />
            )}
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
                value={`${todayT - dayRec.avg >= 0 ? "+" : ""}${formatCurrency(todayT - dayRec.avg, sym)}`}
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
            {todayContribution !== null && (
              <Chip icon={<Target className="h-3.5 w-3.5" />} label="Week Share" value={`${todayContribution.toFixed(0)}%`} accent="primary" />
            )}
          </div>

          {completedShifts.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> Shift Intelligence
              </p>
              <div className="rounded-xl border border-border bg-card/50 px-4 py-3 space-y-1.5">
                {completedShifts.slice(0, 2).map((shift) => (
                  <p key={shift.id} className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      {new Date(shift.startTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                      {" → "}
                      {new Date(shift.endTime!).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                    </span>
                    {" · "}
                    {shift.miles ? `${Number(shift.miles).toFixed(1)} mi` : "miles optional"}
                    {shift.rideCount ? ` · ${shift.rideCount} rides` : ""}
                  </p>
                ))}
                {completedShifts.length > 2 && (
                  <p className="text-xs text-muted-foreground">+{completedShifts.length - 2} more shift block{completedShifts.length - 2 === 1 ? "" : "s"}</p>
                )}
              </div>
            </div>
          )}

          {/* Commentary */}
          <div className="bg-accent/40 border border-border rounded-xl px-4 py-3 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Narrative Insight</p>
            {insights.length > 0 ? insights.map((item) => (
              <p key={item} className="text-sm font-medium leading-relaxed">{item}</p>
            )) : (
              <p className="text-sm font-medium leading-relaxed">{commentary}</p>
            )}
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

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={handleDownloadReport} disabled={exporting !== null}>
              <Download className="h-4 w-4 mr-1" />
              {exporting === "download" ? "Saving..." : "Download Image"}
            </Button>
            <Button variant="outline" onClick={handleShareReport} disabled={exporting !== null}>
              <Share2 className="h-4 w-4 mr-1" />
              {exporting === "share" ? "Sharing..." : "Share Report"}
            </Button>
          </div>

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
        <div className="fixed -left-[9999px] top-0">
          <DailyReportCard
            refEl={reportRef}
            dayName={dayName}
            date={todayEntry.date}
            total={formatCurrency(todayT, sym)}
            weekTotalText={formatCurrency(wt, sym)}
            hours={hours}
            miles={miles}
            rides={rides}
            earningsPerHour={earningsPerHour === null ? null : `${formatCurrency(earningsPerHour, sym)}/hr`}
            insights={insights}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DailyReportCard({
  refEl,
  dayName,
  date,
  total,
  weekTotalText,
  hours,
  miles,
  rides,
  earningsPerHour,
  insights,
}: {
  refEl: React.RefObject<HTMLDivElement>;
  dayName: string;
  date: string;
  total: string;
  weekTotalText: string;
  hours: number;
  miles: number;
  rides: number;
  earningsPerHour: string | null;
  insights: string[];
}) {
  return (
    <div ref={refEl} className="w-[420px] min-h-[720px] bg-white text-slate-950 p-8 font-sans">
      <div className="flex items-center justify-between">
        <div className="rounded-md border-2 border-slate-950 px-3 py-1 text-sm font-black tracking-wider">STREEX</div>
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-blue-600">Daily Report</p>
      </div>
      <div className="mt-10">
        <p className="text-sm font-semibold text-slate-500">{dayName} · {date}</p>
        <p className="mt-2 text-6xl font-black tracking-tight text-blue-600">{total}</p>
        <p className="mt-2 text-sm text-slate-500">Week total {weekTotalText}</p>
      </div>
      <div className="mt-8 grid grid-cols-2 gap-3">
        {hours > 0 && <ReportCardMetric label="Hours" value={`${hours.toFixed(1)}h`} />}
        {earningsPerHour && <ReportCardMetric label="Per Hour" value={earningsPerHour} />}
        {miles > 0 && <ReportCardMetric label="Miles" value={`${miles.toFixed(1)}`} />}
        {rides > 0 && <ReportCardMetric label="Rides" value={`${rides}`} />}
      </div>
      <div className="mt-8 space-y-3">
        {insights.slice(0, 3).map((insight) => (
          <p key={insight} className="rounded-2xl bg-slate-100 p-4 text-base font-semibold leading-snug">{insight}</p>
        ))}
      </div>
      <p className="mt-10 text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Built with Streex</p>
    </div>
  );
}

function ReportCardMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
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
