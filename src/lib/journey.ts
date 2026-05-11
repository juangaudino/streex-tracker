import type { WeekRecord, DayEntry } from "./types";
import type { AchievementState } from "./achievements";
import { weekTotal, dayTotal, appTotal, formatCurrency } from "./store";

export type JourneyTone = "milestone" | "record" | "streak" | "achievement" | "goal" | "comeback";

export interface JourneyEvent {
  id: string;
  date: string;
  title: string;
  subtitle?: string;
  value?: string;
  tone: JourneyTone;
  icon: string;
}

function allDays(weeks: WeekRecord[]): { d: DayEntry; weekStart: string; weekId: string }[] {
  return [...weeks]
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .flatMap((w) => w.entries.map((d) => ({ d, weekStart: w.startDate, weekId: w.id })));
}

export function buildJourneyEvents(
  weeks: WeekRecord[],
  achievements: AchievementState[] = [],
  sym = "$",
): JourneyEvent[] {
  const events: JourneyEvent[] = [];
  const sortedWeeks = [...weeks].sort((a, b) => a.startDate.localeCompare(b.startDate));

  if (sortedWeeks.length === 0) return events;

  // First week completed
  const firstClosed = sortedWeeks.find((w) => w.status === "closed");
  if (firstClosed) {
    events.push({
      id: `first-week-${firstClosed.id}`,
      date: firstClosed.endDate,
      title: "First Week Completed",
      subtitle: "Your career officially begins",
      value: formatCurrency(weekTotal(firstClosed), sym),
      tone: "milestone",
      icon: "🚀",
    });
  }

  // Weekly milestone thresholds (first time crossing $500/$1000/$1500/$2000)
  const weeklyThresholds = [500, 1000, 1500, 2000, 3000];
  for (const t of weeklyThresholds) {
    const w = sortedWeeks.find((w) => weekTotal(w) >= t);
    if (w) {
      events.push({
        id: `first-week-${t}`,
        date: w.endDate,
        title: `First ${sym}${t.toLocaleString()} Week`,
        subtitle: "A new earnings tier unlocked",
        value: formatCurrency(weekTotal(w), sym),
        tone: "milestone",
        icon: "💰",
      });
    }
  }

  // Best ever per weekday (first time the record was set, after at least 1 prior of that day)
  const dayBest = new Map<string, number>();
  for (const { d } of allDays(sortedWeeks)) {
    const t = dayTotal(d);
    if (t <= 0) continue;
    const prev = dayBest.get(d.dayName) || 0;
    if (t > prev) {
      dayBest.set(d.dayName, t);
      // Only emit a "Best X ever" if there were prior X days (else it's just first occurrence)
      const priorCount = sortedWeeks
        .flatMap((w) => w.entries)
        .filter((e) => e.dayName === d.dayName && e.date < d.date && dayTotal(e) > 0).length;
      if (priorCount >= 1) {
        events.push({
          id: `best-${d.dayName}-${d.date}`,
          date: d.date,
          title: `Best ${d.dayName} Ever`,
          value: formatCurrency(t, sym),
          tone: "record",
          icon: "🏆",
        });
      }
    }
  }

  // Daily milestones first crossings ($200/$300/$400/$500)
  const dailyThresholds = [200, 300, 400, 500];
  for (const t of dailyThresholds) {
    for (const { d } of allDays(sortedWeeks)) {
      if (dayTotal(d) >= t) {
        events.push({
          id: `first-day-${t}`,
          date: d.date,
          title: `First ${sym}${t} Day`,
          subtitle: `${d.dayName}`,
          value: formatCurrency(dayTotal(d), sym),
          tone: "milestone",
          icon: "⚡",
        });
        break;
      }
    }
  }

  // Weekly goal hits
  for (const w of sortedWeeks) {
    if (w.weeklyGoal > 0 && weekTotal(w) >= w.weeklyGoal) {
      events.push({
        id: `goal-${w.id}`,
        date: w.endDate,
        title: "Weekly Goal Crushed",
        subtitle: `${w.startDate} → ${w.endDate}`,
        value: `${Math.round((weekTotal(w) / w.weeklyGoal) * 100)}% of goal`,
        tone: "goal",
        icon: "🎯",
      });
    }
  }

  // Comeback weeks (+25% vs previous)
  for (let i = 1; i < sortedWeeks.length; i++) {
    const prev = weekTotal(sortedWeeks[i - 1]);
    const cur = weekTotal(sortedWeeks[i]);
    if (prev > 0 && cur >= prev * 1.25) {
      events.push({
        id: `comeback-${sortedWeeks[i].id}`,
        date: sortedWeeks[i].endDate,
        title: "Comeback Week",
        subtitle: `+${Math.round(((cur - prev) / prev) * 100)}% vs prior week`,
        value: formatCurrency(cur, sym),
        tone: "comeback",
        icon: "📈",
      });
    }
  }

  // Best App week (first time a particular app peaked)
  const appBest = new Map<string, number>();
  for (const w of sortedWeeks) {
    const apps = Object.keys(w.entries[0]?.apps || {});
    for (const a of apps) {
      const t = appTotal(w, a);
      if (t <= 0) continue;
      const prev = appBest.get(a) || 0;
      if (t > prev) {
        appBest.set(a, t);
        // Only emit if not the first appearance
        const priorWithApp = sortedWeeks
          .filter((pw) => pw.startDate < w.startDate && appTotal(pw, a) > 0).length;
        if (priorWithApp >= 1) {
          events.push({
            id: `best-app-${a}-${w.id}`,
            date: w.endDate,
            title: `Best ${a} Week`,
            value: formatCurrency(t, sym),
            tone: "record",
            icon: "📱",
          });
        }
      }
    }
  }

  // Streaks: detect the first day a 4-day streak was achieved
  const days = allDays(sortedWeeks);
  let cur = 0;
  let streakAnnounced = new Set<number>();
  for (let i = 0; i < days.length; i++) {
    const t = dayTotal(days[i].d);
    const isLogged = days[i].d.logged !== undefined ? days[i].d.logged : t > 0;
    if (!isLogged) continue;
    if (t > 0) {
      cur++;
      const targets = [4, 7, 14];
      for (const tg of targets) {
        if (cur === tg && !streakAnnounced.has(tg)) {
          streakAnnounced.add(tg);
          events.push({
            id: `streak-${tg}`,
            date: days[i].d.date,
            title: `${tg}-Day Streak Reached`,
            subtitle: "Consistency compounding",
            tone: "streak",
            icon: "🔥",
          });
        }
      }
    } else {
      cur = 0;
    }
  }

  // Career high — biggest week, only emit if there's a prior baseline
  if (sortedWeeks.length >= 2) {
    let bestSoFar = 0;
    for (const w of sortedWeeks) {
      const t = weekTotal(w);
      if (t > bestSoFar && bestSoFar > 0) {
        events.push({
          id: `career-high-${w.id}`,
          date: w.endDate,
          title: "New Career High",
          subtitle: "Biggest week to date",
          value: formatCurrency(t, sym),
          tone: "record",
          icon: "👑",
        });
      }
      if (t > bestSoFar) bestSoFar = t;
    }
  }

  // Achievements unlocked
  for (const a of achievements) {
    if (a.unlocked && a.unlockedAt) {
      events.push({
        id: `ach-${a.id}`,
        date: a.unlockedAt.slice(0, 10),
        title: `Unlocked: ${a.title}`,
        subtitle: a.description,
        tone: "achievement",
        icon: a.icon,
      });
    }
  }

  // Dedupe by id, sort newest first
  const seen = new Set<string>();
  const unique = events.filter((e) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });
  unique.sort((a, b) => b.date.localeCompare(a.date));
  return unique;
}