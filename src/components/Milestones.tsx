import { WeekRecord, DayEntry } from "@/lib/types";
import { weekTotal, dayTotal, appTotal, formatCurrency } from "@/lib/store";
import { Trophy, Flame, Zap, Target, TrendingUp, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface MilestonesProps {
  weeks: WeekRecord[];
  openWeek: WeekRecord | null;
  currencySymbol: string;
}

interface MilestoneCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  sub?: string;
  variant: "gold" | "fire" | "streak" | "goal" | "default";
}

const variantStyles = {
  gold: "border-gold/40 bg-gold/5",
  fire: "border-warning/40 bg-warning/5",
  streak: "border-beast-purple/40 bg-beast-purple/5",
  goal: "border-success/40 bg-success/5",
  default: "border-border bg-card",
};

const iconColors = {
  gold: "text-gold",
  fire: "text-warning",
  streak: "text-beast-purple",
  goal: "text-success",
  default: "text-muted-foreground",
};

function MilestoneCard({ icon, title, value, sub, variant }: MilestoneCardProps) {
  return (
    <div className={cn("rounded-xl border p-3 flex items-start gap-3", variantStyles[variant])}>
      <div className={cn("mt-0.5", iconColors[variant])}>{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
        <p className="text-sm font-bold font-mono truncate">{value}</p>
        {sub && <p className="text-xs text-muted-foreground truncate">{sub}</p>}
      </div>
    </div>
  );
}

function getAllDaysSorted(weeks: WeekRecord[]): { day: DayEntry; weekStart: string }[] {
  const sorted = [...weeks].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const days: { day: DayEntry; weekStart: string }[] = [];
  for (const w of sorted) {
    for (const d of w.entries) {
      days.push({ day: d, weekStart: w.startDate });
    }
  }
  return days;
}

function calcStreak(weeks: WeekRecord[], threshold: number): number {
  const allDays = getAllDaysSorted(weeks);
  let streak = 0;
  // Walk backwards from most recent active day
  for (let i = allDays.length - 1; i >= 0; i--) {
    const t = dayTotal(allDays[i].day);
    if (t === 0) continue; // skip $0 days
    if (t >= threshold) {
      streak++;
    } else {
      break; // streak broken
    }
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

export default function Milestones({ weeks, openWeek, currencySymbol }: MilestonesProps) {
  const sym = currencySymbol;
  const allWeeks = weeks;

  if (allWeeks.length === 0) {
    return null;
  }

  // 1. Best Week Ever
  const bestWeek = allWeeks.reduce((best, w) =>
    weekTotal(w) > weekTotal(best) ? w : best
  );
  const bestWeekTotal = weekTotal(bestWeek);

  // 2. Best Day Ever
  let bestDayEver = { total: 0, dayName: "", date: "" };
  for (const w of allWeeks) {
    for (const d of w.entries) {
      const t = dayTotal(d);
      if (t > bestDayEver.total) {
        bestDayEver = { total: t, dayName: d.dayName, date: d.date };
      }
    }
  }

  // 3. Best App Week
  let bestAppWeek = { app: "", total: 0, weekStart: "" };
  for (const w of allWeeks) {
    const apps = Object.keys(w.entries[0]?.apps || {});
    for (const a of apps) {
      const t = appTotal(w, a);
      if (t > bestAppWeek.total) {
        bestAppWeek = { app: a, total: t, weekStart: w.startDate };
      }
    }
  }

  // 4. Best App Day
  let bestAppDay = { app: "", total: 0, date: "" };
  for (const w of allWeeks) {
    for (const d of w.entries) {
      for (const [app, val] of Object.entries(d.apps)) {
        if ((val || 0) > bestAppDay.total) {
          bestAppDay = { app, total: val || 0, date: d.date };
        }
      }
    }
  }

  // 5-7. Streaks
  const streak100 = calcStreak(allWeeks, 100);
  const streak150 = calcStreak(allWeeks, 150);
  const streak200 = calcStreak(allWeeks, 200);

  // 8. Goal Hit Streak
  const goalStreak = goalHitStreak(allWeeks);

  // 9. Record Chase
  const currentTotal = openWeek ? weekTotal(openWeek) : 0;
  const recordTotal = bestWeekTotal;
  const recordChase = Math.max(0, recordTotal + 0.01 - currentTotal);
  const isCurrentRecord = openWeek?.id === bestWeek.id;

  // 10. Hot App of the Week
  let hotApp = { app: "—", total: 0 };
  if (openWeek) {
    const apps = Object.keys(openWeek.entries[0]?.apps || {});
    for (const a of apps) {
      const t = appTotal(openWeek, a);
      if (t > hotApp.total) hotApp = { app: a, total: t };
    }
  }

  const cards: MilestoneCardProps[] = [];

  if (bestWeekTotal > 0) {
    cards.push({
      icon: <Trophy className="h-4 w-4" />,
      title: "Best Week Ever",
      value: formatCurrency(bestWeekTotal, sym),
      sub: `${bestWeek.startDate} → ${bestWeek.endDate}`,
      variant: "gold",
    });
  }

  if (bestDayEver.total > 0) {
    cards.push({
      icon: <Star className="h-4 w-4" />,
      title: "Best Day Ever",
      value: formatCurrency(bestDayEver.total, sym),
      sub: `${bestDayEver.dayName}, ${bestDayEver.date}`,
      variant: "gold",
    });
  }

  if (bestAppWeek.total > 0) {
    cards.push({
      icon: <Trophy className="h-4 w-4" />,
      title: "Best App Week",
      value: `${bestAppWeek.app} — ${formatCurrency(bestAppWeek.total, sym)}`,
      sub: `Week of ${bestAppWeek.weekStart}`,
      variant: "gold",
    });
  }

  if (bestAppDay.total > 0) {
    cards.push({
      icon: <Star className="h-4 w-4" />,
      title: "Best App Day",
      value: `${bestAppDay.app} — ${formatCurrency(bestAppDay.total, sym)}`,
      sub: bestAppDay.date,
      variant: "gold",
    });
  }

  if (streak100 > 0) {
    cards.push({
      icon: <Zap className="h-4 w-4" />,
      title: "$100+ Streak",
      value: `${streak100} day${streak100 !== 1 ? "s" : ""}`,
      variant: "streak",
    });
  }

  if (streak150 > 0) {
    cards.push({
      icon: <Zap className="h-4 w-4" />,
      title: "$150+ Streak",
      value: `${streak150} day${streak150 !== 1 ? "s" : ""}`,
      variant: "streak",
    });
  }

  if (streak200 > 0) {
    cards.push({
      icon: <Zap className="h-4 w-4" />,
      title: "$200+ Streak",
      value: `${streak200} day${streak200 !== 1 ? "s" : ""}`,
      variant: "streak",
    });
  }

  if (goalStreak > 0) {
    cards.push({
      icon: <Target className="h-4 w-4" />,
      title: "Goal Hit Streak",
      value: `${goalStreak} week${goalStreak !== 1 ? "s" : ""}`,
      variant: "goal",
    });
  }

  if (openWeek && !isCurrentRecord && recordChase > 0) {
    cards.push({
      icon: <TrendingUp className="h-4 w-4" />,
      title: "Record Chase",
      value: `${formatCurrency(recordChase, sym)} to go`,
      sub: `Best week: ${formatCurrency(recordTotal, sym)}`,
      variant: "default",
    });
  }

  if (openWeek && isCurrentRecord && currentTotal > 0) {
    cards.push({
      icon: <Trophy className="h-4 w-4" />,
      title: "Record Chase",
      value: "You're on a record week! 🏆",
      variant: "gold",
    });
  }

  if (openWeek && hotApp.total > 0) {
    cards.push({
      icon: <Flame className="h-4 w-4" />,
      title: "Hot App of the Week",
      value: `${hotApp.app} — ${formatCurrency(hotApp.total, sym)}`,
      sub: "Carrying the week 🔥",
      variant: "fire",
    });
  }

  if (cards.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold">Milestones</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {cards.map((card, i) => (
          <MilestoneCard key={i} {...card} />
        ))}
      </div>
    </div>
  );
}