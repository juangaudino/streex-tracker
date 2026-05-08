import { useOutletContext } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import StatCard from "@/components/StatCard";
import Milestones from "@/components/Milestones";
import AchievementsPreview from "@/components/AchievementsPreview";
import QuickEntryWidget from "@/components/QuickEntryWidget";
import ActiveMomentum from "@/components/ActiveMomentum";
import {
  getDayOfWeekRecord,
  getSmartHeader,
  getWeeklyRecordChase,
  getDailyRecordChase,
  getPaceLabel,
} from "@/components/ActiveMomentum";
import { getMomentumState, getSmartCommentary, getPersonalGrowthStats } from "@/lib/commentary";
import { useAchievements } from "@/hooks/useAchievements";
import { useAuth } from "@/hooks/useAuth";
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
} from "@/lib/store";
import type { StoreContext } from "./types";
import { CalendarPlus, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function DashboardPage() {
  const { openWeek, weeks, settings, hasLocalData, importLocalData, updateWeek } = useOutletContext<StoreContext>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [importing, setImporting] = useState(false);
  const { user } = useAuth();
  const { achievements } = useAchievements(user, weeks);
  const sym = settings.currencySymbol;
  const { mode } = useTheme();

  async function handleImport() {
    setImporting(true);
    const count = await importLocalData();
    setImporting(false);
    toast({
      title: count ? `Imported ${count} week${count > 1 ? "s" : ""}!` : "No new weeks to import.",
    });
  }

  if (!openWeek) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4 text-center">
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
        <h2 className="text-2xl font-bold">Start your first week</h2>
        <p className="text-muted-foreground max-w-md">
          Begin tracking your gig earnings. Create a new week to get started.
        </p>
        <Button size="lg" onClick={() => navigate("/entry")}>
          <CalendarPlus className="h-5 w-5 mr-2" />
          Start New Week
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
  const bd = bestDay(openWeek);
  const ba = bestApp(openWeek);
  const prev = getPreviousWeek(weeks, openWeek);
  const record = getRecordWeek(weeks, openWeek);
  const activeDays = getActiveEnteredDays(openWeek);
  const loggedDays = getLoggedDays(openWeek);
  const prevSP = prev ? samePointTotal(prev, loggedDays) : 0;
  const recSP = record ? samePointTotal(record, loggedDays) : 0;

  // Smart systems
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
  const todayName = dayNames[now.getDay()] as string;
  const todayEntry = openWeek.entries.find((d) => d.date === todayStr) ?? null;
  const todayTotal = todayEntry ? dayTotal(todayEntry) : 0;
  const dayRec = getDayOfWeekRecord(weeks, todayName);
  const smartHeader = getSmartHeader(weeks, openWeek, todayEntry, dayRec);
  const weeklyChase = getWeeklyRecordChase(weeks, openWeek, sym);
  const dailyChase = getDailyRecordChase(todayTotal, dayRec.record, todayName, sym);
  const pace = getPaceLabel(todayTotal, dayRec.avg, pct);

  // Smart Commentary & Momentum
  const momentum = getMomentumState(weeks, openWeek, todayTotal, dayRec.avg, pct);
  const growthStats = getPersonalGrowthStats(weeks, openWeek, todayTotal, todayName, dayRec.avg);
  const commentary = getSmartCommentary(weeks, openWeek, todayEntry, todayTotal, dayRec, pct, sym, {
    headlineText: smartHeader,
    hasGrowthChips: growthStats.length > 0,
  });

  const statusVariant = pct >= 120 ? "purple" as const : pct >= 100 ? "success" as const : pct >= 75 ? "primary" as const : pct >= 40 ? "warning" as const : "default" as const;

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

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
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

      {/* Smart Insight — single most important contextual message */}
      {(() => {
        // Priority: daily chase > commentary > weekly chase (show only ONE)
        const insight = dailyChase ?? commentary ?? weeklyChase;
        if (!insight) return null;
        const icon = dailyChase ? "🏆" : commentary ? "💬" : "🎯";
        const colorClass = dailyChase
          ? "bg-gold/10 border-gold/30 text-gold"
          : weeklyChase && !commentary
          ? "bg-primary/10 border-primary/30 text-primary"
          : "bg-accent/50 border-border text-foreground";
        return (
          <div className={`border rounded-xl px-4 py-2.5 text-sm font-medium animate-in fade-in duration-500 ${colorClass}`}>
            {icon} {insight}
          </div>
        );
      })()}

      {/* Momentum & Stats Chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
          momentum.state === "high" ? "bg-success/15 text-success"
          : momentum.state === "medium" ? "bg-primary/15 text-primary"
          : "bg-muted-foreground/15 text-muted-foreground"
        }`}>
          {momentum.label}
        </span>
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

      {/* Daily Record & Quick Entry */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <QuickEntryWidget
          openWeek={openWeek}
          apps={settings.activeApps}
          currencySymbol={sym}
          onSave={(updated) => updateWeek(updated)}
          weeks={weeks}
        />
        {todayEntry && dayRec.count > 1 && (
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
        <StatCard label="Active Days" value={`${activeDays.length}/7`} sub="Earnings > $0" />
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