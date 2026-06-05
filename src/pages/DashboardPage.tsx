import { useOutletContext } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import StatCard from "@/components/StatCard";
import Milestones from "@/components/Milestones";
import AchievementsPreview from "@/components/AchievementsPreview";
import QuickEntryWidget from "@/components/QuickEntryWidget";
import ActiveMomentum from "@/components/ActiveMomentum";
import {
  getDayOfWeekRecord,
  getWeeklyRecordChase,
  getDailyRecordChase,
} from "@/components/ActiveMomentum";
import { getDashboardMood, getPersonalGrowthStats } from "@/lib/commentary";
import { useAchievements } from "@/hooks/useAchievements";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import {
  weekTotal,
  bestDay,
  bestApp,
  formatCurrency,
  getPreviousWeek,
  getRecordWeek,
  getActiveEnteredDays,
  getLoggedDays,
  samePointTotal,
  dayTotal,
  formatDate,
} from "@/lib/store";
import type { StoreContext } from "./types";
import { Activity, CalendarPlus, Clock, Download, Target, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import EndDayDialog from "@/components/EndDayDialog";
import MonthlyRecapBanner from "@/components/MonthlyRecapBanner";
import DriverIdentityCard from "@/components/DriverIdentityCard";
import { useDriverIdentity } from "@/hooks/useDriverIdentity";
import DailyCommandCenter from "@/components/DailyCommandCenter";
import { useDashboardExperience } from "@/hooks/useDashboardExperience";
import { classifyWeeklyGoalOutcome, createShift, getWeekShiftHours, hasActiveShift } from "@/lib/shiftIntelligence";
import { cn } from "@/lib/utils";
import DailyStartHub from "@/components/DailyStartHub";
import { useUserProfile } from "@/hooks/useUserProfile";
import ShiftIntelligencePanel from "@/components/ShiftIntelligencePanel";

type PulseState = "calm" | "steady" | "strong" | "record" | "streak";

function DashboardPulse({ enabled, state }: { enabled: boolean; state: PulseState }) {
  useEffect(() => {
    const root = document.documentElement;
    const pulseClasses = ["pulse-mode", "pulse-calm", "pulse-steady", "pulse-strong", "pulse-record", "pulse-streak"];
    root.classList.remove(...pulseClasses);
    if (enabled) {
      root.classList.add("pulse-mode", `pulse-${state}`);
    }
    return () => root.classList.remove(...pulseClasses);
  }, [enabled, state]);

  return null;
}

function FocusMetric({
  icon,
  label,
  value,
  sub,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "primary" | "success" | "warning";
}) {
  const toneClass =
    tone === "primary" ? "border-primary/25 bg-primary/5"
    : tone === "success" ? "border-success/25 bg-success/5"
    : tone === "warning" ? "border-warning/25 bg-warning/5"
    : "border-border bg-card";

  return (
    <div className={cn("rounded-xl border p-3 min-w-0", toneClass)}>
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <p className="mt-1 text-lg font-bold font-mono truncate">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground truncate">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const { user, openWeek, weeks, settings, earningsSnapshots, hasLocalData, importLocalData, updateWeek } = useOutletContext<StoreContext>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [importing, setImporting] = useState(false);
  const [endDayOpen, setEndDayOpen] = useState(false);
  const { achievements } = useAchievements(user, weeks);
  const { summary: driverIdentity, loading: identityLoading } = useDriverIdentity(user, weeks, openWeek);
  const sym = settings.currencySymbol;
  const { pulseMode } = useTheme();
  const { isFullFocus } = useDashboardExperience();
  const { profile } = useUserProfile(user?.id);
  const todayStr = formatDate(new Date());
  const dailyStartHubKey = `streex_daily_start_hub_dismissed_${todayStr}`;
  const [dailyStartHubDismissed, setDailyStartHubDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(dailyStartHubKey) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      setDailyStartHubDismissed(sessionStorage.getItem(dailyStartHubKey) === "1");
    } catch {
      setDailyStartHubDismissed(false);
    }
  }, [dailyStartHubKey]);

  function dismissDailyStartHub() {
    try {
      sessionStorage.setItem(dailyStartHubKey, "1");
    } catch {
      // Session-only dismissal.
    }
    setDailyStartHubDismissed(true);
  }

  async function handleImport() {
    setImporting(true);
    const count = await importLocalData();
    setImporting(false);
    toast({
      title: count ? `Imported ${count} week${count > 1 ? "s" : ""}!` : "No new weeks to import.",
    });
  }

  if (!openWeek) {
    const hasHistory = weeks.length > 0;
    const closedSorted = [...weeks]
      .filter((w) => w.status === "closed")
      .sort((a, b) => b.endDate.localeCompare(a.endDate));
    const lastClosed = closedSorted[0];
    const lastWt = lastClosed ? weekTotal(lastClosed) : 0;
    const heroTitle = hasHistory ? "Fresh chapter begins" : "Start your first week";
    const heroSub = hasHistory
      ? lastClosed
        ? `Last week: ${formatCurrency(lastWt, sym)} · ${lastClosed.startDate} → ${lastClosed.endDate}`
        : "Ready for another run."
      : "Begin tracking your gig earnings. Create a new week to get started.";
    const cta = hasHistory ? "Start Next Week" : "Start New Week";

    // Carry-over echoes from the previous chapter
    const echoes: { label: string; value: string }[] = [];
    if (lastClosed) {
      if (weekTotal(lastClosed) >= lastClosed.weeklyGoal) {
        echoes.push({ label: "Goal reached", value: "last week" });
      }
      const activeDaysLast = lastClosed.entries.filter((d) => dayTotal(d) > 0).length;
      if (activeDaysLast >= 4) {
        echoes.push({ label: "Active days", value: `${activeDaysLast} carried` });
      }
      // Best day of last week
      let best = { dayName: "", total: 0 };
      for (const d of lastClosed.entries) {
        const t = dayTotal(d);
        if (t > best.total) best = { dayName: d.dayName, total: t };
      }
      if (best.total > 0) {
        echoes.push({ label: `Best ${best.dayName}`, value: formatCurrency(best.total, sym) });
      }
      // Rank
      const sortedClosed = [...closedSorted].sort((a, b) => weekTotal(b) - weekTotal(a));
      const rank = sortedClosed.findIndex((w) => w.id === lastClosed.id) + 1;
      if (rank > 0 && closedSorted.length >= 3) {
        echoes.push({ label: "Last week rank", value: `#${rank}` });
      }
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4 text-center">
        <DashboardPulse enabled={pulseMode} state={hasHistory ? "steady" : "calm"} />
        <div className="w-full max-w-md">
          <MonthlyRecapBanner weeks={weeks} currencySymbol={sym} />
        </div>
        <div className="w-full max-w-2xl text-left">
          <DailyCommandCenter />
        </div>
        {hasHistory && (
          <div className="w-full max-w-2xl text-left">
            <DriverIdentityCard
              identity={driverIdentity}
              currencySymbol={sym}
              loading={identityLoading}
            />
          </div>
        )}
        {hasLocalData && (
          <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 max-w-md w-full space-y-2">
            <p className="text-sm font-medium">Local data found from V1</p>
            <p className="text-xs text-muted-foreground">Import your previously saved weeks into your cloud account.</p>
            <Button size="sm" onClick={handleImport} disabled={importing}>
              <Download className="h-4 w-4 mr-1" />
              {importing ? "Importing..." : "Import Local Data"}
            </Button>
          </div>
        )}
        {hasHistory && (
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary">
            New Week Unlocked
          </p>
        )}
        <h2 className="text-2xl font-bold">{heroTitle}</h2>
        <p className="text-muted-foreground max-w-md">{heroSub}</p>
        {echoes.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap justify-center max-w-md">
            {echoes.map((e, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider bg-accent/60 border border-border text-foreground"
              >
                <span className="opacity-60">{e.label}</span>
                <span className="font-mono">{e.value}</span>
              </span>
            ))}
            <span className="text-[10px] text-muted-foreground/70 italic w-full mt-1">
              Momentum continues
            </span>
          </div>
        )}
        <Button size="lg" onClick={() => navigate("/entry")}>
          <CalendarPlus className="h-5 w-5 mr-2" />
          {cta}
        </Button>
        {weeks.length > 0 && (
          <Milestones weeks={weeks} openWeek={null} currencySymbol={sym} />
        )}
      </div>
    );
  }

  const total = weekTotal(openWeek);
  const goal = openWeek.weeklyGoal;
  const pct = goal > 0 ? (total / goal) * 100 : 0;
  const remaining = Math.max(0, goal - total);
  const weeklyHoursGoal = openWeek.weeklyHoursGoal ?? 0;
  const weeklyHours = getWeekShiftHours(openWeek);
  const hoursPct = weeklyHoursGoal > 0 ? (weeklyHours / weeklyHoursGoal) * 100 : 0;
  const goalOutcome = classifyWeeklyGoalOutcome({
    earnings: total,
    earningsGoal: goal,
    hours: weeklyHours,
    hoursGoal: weeklyHoursGoal,
  });
  const bd = bestDay(openWeek);
  const ba = bestApp(openWeek);
  const prev = getPreviousWeek(weeks, openWeek);
  const record = getRecordWeek(weeks, openWeek);
  const activeDays = getActiveEnteredDays(openWeek);
  const loggedDays = getLoggedDays(openWeek);
  const showActiveDaysCard = loggedDays.length !== activeDays.length;
  const prevSP = prev ? samePointTotal(prev, loggedDays) : 0;
  const recSP = record ? samePointTotal(record, loggedDays) : 0;

  // Smart systems
  const now = new Date();
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
  const todayName = dayNames[now.getDay()] as string;
  const todayEntry = openWeek.entries.find((d) => d.date === todayStr) ?? null;
  const todayTotal = todayEntry ? dayTotal(todayEntry) : 0;
  const dayRec = getDayOfWeekRecord(weeks, todayName, todayStr);
  const weeklyChase = getWeeklyRecordChase(weeks, openWeek, sym);
  const dailyChase = getDailyRecordChase(todayTotal, dayRec.record, todayName, sym);

  // Unified mood engine — headline, pace chip, and momentum all coherent
  const mood = getDashboardMood(weeks, openWeek, todayEntry, dayRec, sym);
  const smartHeader = mood.headline;
  const pace = mood.paceChip;
  const growthStats = mood.tone === "prerun" || mood.tone === "closed"
    ? []
    : getPersonalGrowthStats(weeks, openWeek, todayTotal, todayName, dayRec.avg);
  const isDayClosed = mood.tone === "closed";

  const statusVariant = pct >= 120 ? "purple" as const : pct >= 100 ? "success" as const : pct >= 75 ? "primary" as const : pct >= 40 ? "warning" as const : "default" as const;
  const pulseState: PulseState =
    dailyChase || weeklyChase || (record && recSP > 0 && total / recSP >= 0.9)
      ? "record"
      : isDayClosed || (todayEntry && todayTotal === 0 && mood.tone === "prerun")
      ? "calm"
      : pct >= 100 || mood.momentumState === "high"
      ? "strong"
      : activeDays.length >= 3
      ? "streak"
      : "steady";

  const barColor =
    pct >= 120
      ? "bg-beast-purple"
      : pct >= 100
      ? "bg-success"
      : pct >= 75
      ? "bg-primary"
      : pct >= 40
      ? "bg-warning"
      : "bg-muted-foreground";

  const dayVsAvg = dayRec.avg > 0 ? todayTotal - dayRec.avg : null;
  const dayVsAvgPct = dayRec.avg > 0 ? (todayTotal / dayRec.avg) * 100 : null;
  const hasOpenShift = openWeek.entries.some(hasActiveShift);
  const shiftLabel = hasOpenShift ? "Active" : isDayClosed ? "Closed" : "Ready";
  const shiftSub = hasOpenShift ? "shift in progress" : isDayClosed ? "day finalized" : "tap Entry to start";
  const focusMomentumLabel = mood.momentumLabel === "Building Momentum" ? "Building" : mood.momentumLabel;
  const showStandardMomentumChip = mood.momentumLabel !== smartHeader;
  const todayHasShift = Boolean(todayEntry?.shifts?.length);
  const showDailyStartHub = Boolean(todayEntry && !todayEntry.dayClosed && !todayHasShift && !dailyStartHubDismissed);
  const currentWeekSnapshots = earningsSnapshots.filter((snapshot) => snapshot.weekId === openWeek.id);

  async function handleDailyStartShift() {
    if (!todayEntry || openWeek.entries.some(hasActiveShift) || todayHasShift) {
      dismissDailyStartHub();
      return;
    }
    const entries = openWeek.entries.map((day) => {
      if (day.date !== todayEntry.date) return day;
      return { ...day, shifts: [...(day.shifts ?? []), createShift(day.date)] };
    });
    const saved = await updateWeek({ ...openWeek, entries });
    if (saved) dismissDailyStartHub();
  }

  function handleDailyHubRoute(path: string) {
    dismissDailyStartHub();
    navigate(path);
  }

  if (isFullFocus) {
    return (
      <div className="p-3 md:p-5 max-w-3xl mx-auto space-y-3">
        <DashboardPulse enabled={pulseMode} state={pulseState} />
        {todayEntry && (
          <DailyStartHub
            open={showDailyStartHub}
            profile={profile}
            today={todayEntry}
            todayAverage={dayRec.avg}
            currencySymbol={sym}
            onStartShift={handleDailyStartShift}
            onDashboard={dismissDailyStartHub}
            onWeeklySetup={() => handleDailyHubRoute("/entry")}
            onProfile={() => handleDailyHubRoute("/settings")}
          />
        )}

        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary">Full Focus · Operational</p>
          <h1 className="text-lg sm:text-xl font-bold truncate">Today's Run</h1>
          <p className="text-xs text-muted-foreground">
            {openWeek.startDate} → {openWeek.endDate}
          </p>
        </div>

        <section className="rounded-2xl border border-primary/30 bg-card p-3.5 space-y-3 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Today Total</p>
              <p className="text-5xl sm:text-6xl font-bold font-mono text-primary tracking-normal leading-none mt-1">
                {formatCurrency(todayTotal, sym)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Week total {formatCurrency(total, sym)}
              </p>
            </div>
            {pace && (
              <span className={cn(
                "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
                pace.variant === "fire" ? "bg-warning/15 text-warning"
                : pace.variant === "goal" ? "bg-success/15 text-success"
                : pace.variant === "streak" ? "bg-beast-purple/15 text-beast-purple"
                : "bg-primary/15 text-primary",
              )}>
                {pace.text}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <FocusMetric
              icon={<Activity className="h-3.5 w-3.5" />}
              label="Day vs Avg"
              value={dayVsAvg === null ? "—" : `${dayVsAvg >= 0 ? "+" : ""}${formatCurrency(dayVsAvg, sym)}`}
              sub={dayVsAvgPct === null ? "more history needed" : `${dayVsAvgPct.toFixed(0)}% of normal ${todayName}`}
              tone={dayVsAvg !== null && dayVsAvg >= 0 ? "success" : dayVsAvg !== null ? "warning" : "default"}
            />
	            <FocusMetric
	              icon={<Target className="h-3.5 w-3.5" />}
	              label="Goal"
	              value={`${pct.toFixed(0)}%`}
	              sub={weeklyHoursGoal > 0 ? `${weeklyHours.toFixed(1)}h / ${weeklyHoursGoal}h` : `${formatCurrency(remaining, sym)} left`}
	              tone={pct >= 100 ? "success" : "primary"}
	            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <FocusMetric
              icon={<Clock className="h-3.5 w-3.5" />}
              label="Shift"
              value={shiftLabel}
              sub={shiftSub}
              tone={hasOpenShift ? "success" : "default"}
            />
            <FocusMetric
              icon={<Zap className="h-3.5 w-3.5" />}
              label="Momentum"
              value={focusMomentumLabel}
              sub={activeDays.length > 0 ? `${activeDays.length} active day${activeDays.length === 1 ? "" : "s"}` : "fresh start"}
              tone={mood.momentumState === "high" ? "success" : mood.momentumState === "medium" ? "primary" : "default"}
            />
          </div>

          <div className="space-y-1.5">
	            <div className="flex justify-between text-xs">
	              <span className="text-muted-foreground">Weekly earnings goal</span>
	              <span className="font-mono font-bold">{pct.toFixed(1)}%</span>
	            </div>
            <div className="h-2.5 bg-muted rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all duration-500", barColor)}
                style={{ width: `${Math.min(pct, 100)}%` }}
	              />
	            </div>
	            {weeklyHoursGoal > 0 && (
	              <>
	                <div className="flex justify-between text-xs pt-1">
	                  <span className="text-muted-foreground">Weekly hours goal</span>
	                  <span className="font-mono font-bold">{hoursPct.toFixed(1)}%</span>
	                </div>
	                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
	                  <div
	                    className={cn("h-full rounded-full transition-all duration-500", hoursPct >= 100 ? "bg-success" : "bg-primary")}
	                    style={{ width: `${Math.min(hoursPct, 100)}%` }}
	                  />
	                </div>
	                <p className="text-[11px] text-muted-foreground">
	                  <span className="font-semibold text-foreground">{goalOutcome.title}.</span> {goalOutcome.copy}
	                </p>
	              </>
	            )}
	          </div>
        </section>

        <QuickEntryWidget
          openWeek={openWeek}
          apps={settings.activeApps}
          currencySymbol={sym}
          onSave={(updated) => updateWeek(updated)}
          weeks={weeks}
          onEndDay={todayEntry && !isDayClosed ? () => setEndDayOpen(true) : undefined}
        />

        <ShiftIntelligencePanel
          weeks={[openWeek]}
          earningsSnapshots={currentWeekSnapshots}
          currencySymbol={sym}
          mode="advanced"
          heading="This Week Operations"
          description="Current week shift, mileage, and efficiency snapshot."
          snapshotTitle="This Week Operations Snapshot"
          snapshotOnly
          showModeBadge={false}
        />

        <DailyCommandCenter compact />

        {(() => {
          const insight = !isDayClosed ? (dailyChase ?? weeklyChase) : null;
          if (!insight) return null;
          return (
            <div className="rounded-xl border border-border bg-card/70 px-3 py-2.5 text-sm text-muted-foreground">
              {insight}
            </div>
          );
        })()}

        {todayEntry && dayRec.count > 1 && !isDayClosed && (
          <div className="bg-card rounded-xl border border-border p-3 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Best {todayName} Ever
              </p>
              <p className="text-sm font-bold font-mono text-gold">
                {formatCurrency(dayRec.record, sym)}
              </p>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gold transition-all duration-500"
                style={{ width: `${Math.min(dayRec.record > 0 ? (todayTotal / dayRec.record) * 100 : 0, 100)}%` }}
              />
            </div>
          </div>
        )}

        {todayEntry && !isDayClosed && (
          <EndDayDialog
            open={endDayOpen}
            onOpenChange={setEndDayOpen}
            openWeek={openWeek}
            weeks={weeks}
            todayEntry={todayEntry}
            currencySymbol={sym}
            onConfirm={() => {
              const entries = openWeek.entries.map((d) =>
                d.date === todayEntry.date ? { ...d, logged: true, dayClosed: true } : d,
              );
              updateWeek({ ...openWeek, entries });
              setEndDayOpen(false);
              toast({ title: "Day closed.", description: "The journey continues tomorrow." });
            }}
          />
        )}

        {hasLocalData && (
          <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Import local data</p>
              <p className="text-xs text-muted-foreground">Weeks from V1 are still in your browser.</p>
            </div>
            <Button size="sm" onClick={handleImport} disabled={importing}>
              <Download className="h-4 w-4 mr-1" />
              {importing ? "Importing..." : "Import"}
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <DashboardPulse enabled={pulseMode} state={pulseState} />
      {todayEntry && (
        <DailyStartHub
          open={showDailyStartHub}
          profile={profile}
          today={todayEntry}
          todayAverage={dayRec.avg}
          currencySymbol={sym}
          onStartShift={handleDailyStartShift}
          onDashboard={dismissDailyStartHub}
          onWeeklySetup={() => handleDailyHubRoute("/entry")}
          onProfile={() => handleDailyHubRoute("/settings")}
        />
      )}
      <MonthlyRecapBanner weeks={weeks} currencySymbol={sym} />
      {/* Smart Header */}
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1 mr-3">
          <h1 className="text-xl sm:text-2xl font-bold truncate">{smartHeader}</h1>
          <p className="text-sm text-muted-foreground">
            {openWeek.startDate} → {openWeek.endDate}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {pace && (
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${
              pace.variant === "fire" ? "bg-warning/15 text-warning"
              : pace.variant === "goal" ? "bg-success/15 text-success"
              : pace.variant === "streak" ? "bg-beast-purple/15 text-beast-purple"
              : "bg-primary/15 text-primary"
            }`}>
              {pace.text}
            </span>
          )}
        </div>
      </div>

      <DailyCommandCenter />

      {/* Smart Insight — single actionable contextual message */}
      {(() => {
        const insight = !isDayClosed ? (dailyChase ?? weeklyChase) : null;
        if (!insight) return null;
        const icon = dailyChase ? "🏆" : "🎯";
        const colorClass = dailyChase
          ? "bg-gold/10 border-gold/30 text-gold"
          : "bg-primary/10 border-primary/30 text-primary";
        return (
          <div className={`border rounded-xl px-4 py-2.5 text-sm font-medium animate-in fade-in duration-500 ${colorClass}`}>
            {icon} {insight}
          </div>
        );
      })()}

      {/* Momentum & Stats Chips */}
      <div className="flex items-center gap-2 flex-wrap">
        {showStandardMomentumChip && (
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
            mood.momentumState === "high" ? "bg-success/15 text-success"
            : mood.momentumState === "medium" ? "bg-primary/15 text-primary"
            : "bg-muted-foreground/15 text-muted-foreground"
          }`}>
            {mood.momentumLabel}
          </span>
        )}
        {growthStats.map((stat, i) => (
          <span key={i} className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
            stat.positive ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
          }`}>
            <span className="opacity-70">{stat.label}</span>
            <span className="font-mono">{stat.value}</span>
          </span>
        ))}
      </div>

      {/* Active Momentum */}
      <ActiveMomentum weeks={weeks} openWeek={openWeek} currencySymbol={sym} />

      <DriverIdentityCard
        identity={driverIdentity}
        currencySymbol={sym}
        loading={identityLoading}
      />

      {/* Daily Record & Quick Entry */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <QuickEntryWidget
          openWeek={openWeek}
          apps={settings.activeApps}
          currencySymbol={sym}
          onSave={(updated) => updateWeek(updated)}
          weeks={weeks}
          onEndDay={todayEntry && !isDayClosed ? () => setEndDayOpen(true) : undefined}
        />
        {todayEntry && dayRec.count > 1 && !isDayClosed && (
          <div className="bg-card rounded-xl border border-border p-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Best {todayName} Ever
            </p>
            <p className="text-xl font-bold font-mono text-gold">
              {formatCurrency(dayRec.record, sym)}
            </p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Today</span>
              <span className="font-mono font-bold">{formatCurrency(todayTotal, sym)}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gold transition-all duration-500"
                style={{ width: `${Math.min(dayRec.record > 0 ? (todayTotal / dayRec.record) * 100 : 0, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {dayRec.record > 0
                ? `${((todayTotal / dayRec.record) * 100).toFixed(0)}% reached${todayTotal < dayRec.record ? ` · ${formatCurrency(dayRec.record - todayTotal, sym)} away` : ""}`
                : ""}
            </p>
          </div>
        )}
      </div>

      <ShiftIntelligencePanel
        weeks={[openWeek]}
        earningsSnapshots={currentWeekSnapshots}
        currencySymbol={sym}
        mode="advanced"
        heading="This Week Operations"
        description="Current week shift, mileage, and efficiency snapshot."
        snapshotTitle="This Week Operations Snapshot"
        snapshotOnly
        showModeBadge={false}
      />

      {todayEntry && !isDayClosed && (
        <EndDayDialog
          open={endDayOpen}
          onOpenChange={setEndDayOpen}
          openWeek={openWeek}
          weeks={weeks}
          todayEntry={todayEntry}
          currencySymbol={sym}
          onConfirm={() => {
            const entries = openWeek.entries.map((d) =>
              d.date === todayEntry.date ? { ...d, logged: true, dayClosed: true } : d,
            );
            updateWeek({ ...openWeek, entries });
            setEndDayOpen(false);
            toast({ title: "Day closed.", description: "The journey continues tomorrow." });
          }}
        />
      )}

      {/* Progress bar */}
      <div className="bg-card rounded-xl border border-border p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Progress to Goal</span>
          <span className="font-mono font-bold">{pct.toFixed(1)}%</span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Week Total" value={formatCurrency(total, sym)} variant="primary" />
        <StatCard label="Weekly Goal" value={formatCurrency(goal, sym)} />
        <StatCard label="Remaining" value={formatCurrency(remaining, sym)} variant={remaining === 0 ? "success" : "default"} />
        <StatCard
          label="vs Previous"
          value={prev ? formatCurrency(total - prevSP, sym) : "—"}
          variant={total - prevSP > 0 ? "success" : total - prevSP < 0 ? "warning" : "default"}
          sub={prev ? `Same-point (${loggedDays.length} logged days)` : "No previous week"}
        />
        <StatCard
          label="vs Record"
          value={record ? formatCurrency(total - recSP, sym) : "—"}
          variant={total - recSP > 0 ? "gold" : total - recSP < 0 ? "warning" : "default"}
          sub={record ? `Same-point (${loggedDays.length} logged days)` : "No record yet"}
        />
        <StatCard label="Best Day" value={bd.total > 0 ? formatCurrency(bd.total, sym) : "—"} sub={bd.dayName} />
        <StatCard label="Best App" value={ba.total > 0 ? formatCurrency(ba.total, sym) : "—"} sub={ba.app} />
        <StatCard label="Days Logged" value={`${loggedDays.length}/7`} />
        {showActiveDaysCard && (
          <StatCard label="Active Days" value={`${activeDays.length}/7`} sub="Days with earnings" />
        )}
      </div>

      {hasLocalData && (
        <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Import local data</p>
            <p className="text-xs text-muted-foreground">Weeks from V1 are still in your browser.</p>
          </div>
          <Button size="sm" onClick={handleImport} disabled={importing}>
            <Download className="h-4 w-4 mr-1" />
            {importing ? "Importing..." : "Import"}
          </Button>
        </div>
      )}

      <Milestones weeks={weeks} openWeek={openWeek} currencySymbol={sym} />

      <AchievementsPreview achievements={achievements} />
    </div>
  );
}
