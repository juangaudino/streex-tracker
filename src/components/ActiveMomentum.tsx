import { WeekRecord, DayEntry } from "@/lib/types";
import { weekTotal, dayTotal, formatCurrency, getLoggedDays } from "@/lib/store";
import { Flame, Zap, Target, TrendingUp, Award } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActiveMomentumProps {
  weeks: WeekRecord[];
  openWeek: WeekRecord | null;
  currencySymbol: string;
}

interface StreakItem {
  icon: React.ReactNode;
  label: string;
  value: string;
  variant: "fire" | "streak" | "goal" | "primary";
}

const variantClasses = {
  fire: "border-warning/30 text-warning",
  streak: "border-beast-purple/30 text-beast-purple",
  goal: "border-success/30 text-success",
  primary: "border-primary/30 text-primary",
};

function getAllDaysSorted(weeks: WeekRecord[]): DayEntry[] {
  return [...weeks]
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .flatMap((w) => w.entries);
}

function calcActiveStreak(weeks: WeekRecord[], threshold: number): number {
  const allDays = getAllDaysSorted(weeks);
  let streak = 0;
  for (let i = allDays.length - 1; i >= 0; i--) {
    const t = dayTotal(allDays[i]);
    const isLogged = allDays[i].logged !== undefined ? allDays[i].logged : t > 0;
    if (!isLogged) continue;
    if (t >= threshold) streak++;
    else break;
  }
  return streak;
}

function goalHitStreak(weeks: WeekRecord[]): number {
  const closed = [...weeks]
    .filter((w) => w.status === "closed")
    .sort((a, b) => b.startDate.localeCompare(a.startDate));
  let streak = 0;
  for (const w of closed) {
    if (weekTotal(w) >= w.weeklyGoal) streak++;
    else break;
  }
  return streak;
}

function activeDayStreak(weeks: WeekRecord[]): number {
  const allDays = getAllDaysSorted(weeks);
  let streak = 0;
  for (let i = allDays.length - 1; i >= 0; i--) {
    const t = dayTotal(allDays[i]);
    if (t > 0) streak++;
    else {
      const isLogged = allDays[i].logged !== undefined ? allDays[i].logged : false;
      if (isLogged) break;
      // skip unlogged days
      continue;
    }
  }
  return streak;
}

export function getDayOfWeekRecord(weeks: WeekRecord[], dayName: string, excludeDate?: string): { record: number; avg: number; count: number } {
  let best = 0;
  let sum = 0;
  let count = 0;
  for (const w of weeks) {
    for (const d of w.entries) {
      if (d.dayName === dayName && (!excludeDate || d.date !== excludeDate)) {
        const t = dayTotal(d);
        const isLogged = d.logged !== undefined ? d.logged : t > 0;
        if (isLogged) {
          if (t > best) best = t;
          sum += t;
          count++;
        }
      }
    }
  }
  return { record: best, avg: count > 0 ? sum / count : 0, count };
}

export function getSmartHeader(
  weeks: WeekRecord[],
  openWeek: WeekRecord | null,
  todayEntry: DayEntry | null,
  dayRecord: { record: number; avg: number },
): string {
  if (!openWeek || !todayEntry) return "Ready to Earn";
  
  const todayT = dayTotal(todayEntry);
  const wt = weekTotal(openWeek);
  const goal = openWeek.weeklyGoal;
  const loggedDays = getLoggedDays(openWeek);
  const pct = goal > 0 ? (wt / goal) * 100 : 0;
  const dayPct = dayRecord.record > 0 ? (todayT / dayRecord.record) * 100 : 0;

  // Extreme
  // POST-record states (today already broke it)
  if (todayT > dayRecord.record && dayRecord.record > 0 && todayT > 0) return `New ${todayEntry.dayName} Record 🏆`;
  // PRE-record imminent
  if (dayPct >= 95 && dayRecord.record > 0 && todayT > 0) return "Record Imminent 🔥";
  if (pct >= 120) return "History Incoming 🔥";
  if (pct >= 100 && loggedDays.length <= 5) return "Elite Pace";

  // High
  if (dayPct >= 80 && dayRecord.record > 0) return `Big ${todayEntry.dayName} Energy`;
  if (pct >= 90) return "Record Pace ⚡";
  if (pct >= 75) return "Locked In";

  // Medium
  if (todayT > dayRecord.avg && dayRecord.avg > 0) return `Strong ${todayEntry.dayName}`;
  if (pct >= 50) return "Nice Pace Today";
  if (pct >= 30) return "Building Momentum";

  // Low
  if (loggedDays.length >= 1 && todayT > 0) return "Steady Progress";
  return "Let's Get It 💪";
}

export function getWeeklyRecordChase(weeks: WeekRecord[], openWeek: WeekRecord | null, sym: string): string | null {
  if (!openWeek) return null;
  const closed = weeks.filter((w) => w.id !== openWeek.id);
  if (!closed.length) return null;
  const best = closed.reduce((b, w) => (weekTotal(w) > weekTotal(b) ? w : b));
  const bestT = weekTotal(best);
  const currentT = weekTotal(openWeek);
  if (bestT === 0) return null;
  const pct = (currentT / bestT) * 100;
  if (pct >= 100) return "You're on a record week! 🏆";
  if (pct >= 80) {
    const gap = bestT - currentT;
    return `Only ${formatCurrency(gap, sym)} away from all-time best week`;
  }
  return null;
}

export function getDailyRecordChase(todayTotal: number, record: number, dayName: string, sym: string): string | null {
  if (record === 0 || todayTotal === 0) return null;
  if (todayTotal >= record) return `New ${dayName} record! 🏆`;
  const pct = (todayTotal / record) * 100;
  if (pct >= 60) {
    const gap = record - todayTotal;
    return `Only ${formatCurrency(gap, sym)} away from your best ${dayName}`;
  }
  return null;
}

export function getPaceLabel(
  todayTotal: number,
  avg: number,
  weekPct: number,
): { text: string; variant: "fire" | "primary" | "goal" | "streak" } | null {
  if (avg === 0 && weekPct === 0) return null;
  if (todayTotal > avg * 1.2 && avg > 0) return { text: "Above Pace ⚡", variant: "fire" };
  if (todayTotal >= avg * 0.9 && avg > 0) return { text: "On Pace", variant: "primary" };
  if (weekPct >= 100) return { text: "Strong Weekly Pace", variant: "goal" };
  if (todayTotal > 0 && avg > 0) return { text: "Slightly Behind Pace", variant: "streak" };
  return null;
}

export default function ActiveMomentum({ weeks, openWeek, currencySymbol }: ActiveMomentumProps) {
  const sym = currencySymbol;
  const items: StreakItem[] = [];

  const activeStreak = activeDayStreak(weeks);
  if (activeStreak >= 2)
    items.push({
      icon: <Flame className="h-4 w-4" />,
      label: "Active Days",
      value: `${activeStreak} in a row`,
      variant: "fire",
    });

  const s100 = calcActiveStreak(weeks, 100);
  if (s100 >= 2)
    items.push({
      icon: <Zap className="h-4 w-4" />,
      label: "$100+ Streak",
      value: `${s100} days`,
      variant: "streak",
    });

  const s150 = calcActiveStreak(weeks, 150);
  if (s150 >= 2)
    items.push({
      icon: <Zap className="h-4 w-4" />,
      label: "$150+ Streak",
      value: `${s150} days`,
      variant: "primary",
    });

  const gs = goalHitStreak(weeks);
  if (gs >= 1)
    items.push({
      icon: <Target className="h-4 w-4" />,
      label: "Goal Streak",
      value: `${gs} week${gs > 1 ? "s" : ""}`,
      variant: "goal",
    });

  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Active Momentum</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {items.map((item, i) => (
          <div
            key={i}
            className={cn(
              "bg-card rounded-lg border p-3 flex items-center gap-2",
              variantClasses[item.variant]
            )}
          >
            {item.icon}
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider opacity-70">{item.label}</p>
              <p className="text-sm font-bold font-mono">{item.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}