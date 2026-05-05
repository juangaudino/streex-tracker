import { WeekRecord } from "./types";
import { weekTotal, dayTotal, appTotal } from "./store";

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  category: "earnings" | "consistency" | "highday" | "goals" | "special";
  icon: string;
  check: (weeks: WeekRecord[]) => { unlocked: boolean; progress: number; max: number; count: number };
}

export interface AchievementState extends AchievementDef {
  unlocked: boolean;
  unlockedAt: string | null;
  progress: number;
  max: number;
  count: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  earnings: "Earnings Milestones",
  consistency: "Consistency",
  highday: "High Performance Days",
  goals: "Goal Achievements",
  special: "Special Achievements",
};

export { CATEGORY_LABELS };

function weekHitGoal(w: WeekRecord) {
  return weekTotal(w) >= w.weeklyGoal && w.weeklyGoal > 0;
}

function getConsecutiveActiveDays(w: WeekRecord): { max: number; count: number } {
  // Active days = earnings > 0. Logged $0 days are skipped (don't break or count).
  let max = 0, cur = 0;
  let streakCount = 0;
  for (const e of w.entries) {
    const isLogged = e.logged !== undefined ? e.logged : dayTotal(e) > 0;
    const isActive = dayTotal(e) > 0;
    if (isActive) {
      cur++;
      max = Math.max(max, cur);
    } else if (!isLogged) {
      // Unlogged day breaks streak
      if (cur >= 3) streakCount++;
      cur = 0;
    }
    // Logged $0 day: don't break, don't count
  }
  if (cur >= 3) streakCount++;
  return { max, count: streakCount };
}

function getBestConsecutiveActiveDaysAllWeeks(weeks: WeekRecord[]): { best: number; totalCount: number } {
  let best = 0, totalCount = 0;
  for (const w of weeks) {
    const r = getConsecutiveActiveDays(w);
    best = Math.max(best, r.max);
    totalCount += r.count;
  }
  return { best, totalCount };
}

function highDayCount(weeks: WeekRecord[], threshold: number): number {
  let count = 0;
  for (const w of weeks) for (const e of w.entries) if (dayTotal(e) >= threshold) count++;
  return count;
}

function goalHitWeeks(weeks: WeekRecord[]): number {
  return weeks.filter(weekHitGoal).length;
}

function consecutiveGoalWeeks(weeks: WeekRecord[]): number {
  const sorted = [...weeks].sort((a, b) => a.startDate.localeCompare(b.startDate));
  let max = 0, cur = 0;
  for (const w of sorted) {
    if (weekHitGoal(w)) { cur++; max = Math.max(max, cur); }
    else cur = 0;
  }
  return max;
}

function getLoggedDaysCount(w: WeekRecord): number {
  return w.entries.filter(d => d.logged !== undefined ? d.logged : dayTotal(d) > 0).length;
}

function getActiveDaysCount(w: WeekRecord): number {
  return w.entries.filter(d => dayTotal(d) > 0).length;
}

function weeksWithAppsInDay(weeks: WeekRecord[], minApps: number): number {
  let count = 0;
  for (const w of weeks) {
    for (const d of w.entries) {
      const usedApps = Object.values(d.apps).filter(v => (v || 0) > 0).length;
      if (usedApps >= minApps) { count++; break; }
    }
  }
  return count;
}

function weeksWithAppsUsed(weeks: WeekRecord[], minApps: number): number {
  let count = 0;
  for (const w of weeks) {
    const usedApps = Object.keys(w.entries[0]?.apps || {}).filter(a =>
      w.entries.some(d => (d.apps[a] || 0) > 0)
    ).length;
    if (usedApps >= minApps) count++;
  }
  return count;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // Earnings
  { id: "earn_500", title: "First $500 Week", description: "Earn $500+ in a single week", category: "earnings", icon: "💵",
    check: (ws) => { const best = Math.max(0, ...ws.map(weekTotal)); const count = ws.filter(w => weekTotal(w) >= 500).length; return { unlocked: best >= 500, progress: Math.min(best, 500), max: 500, count }; } },
  { id: "earn_1000", title: "First $1,000 Week", description: "Earn $1,000+ in a single week", category: "earnings", icon: "💰",
    check: (ws) => { const best = Math.max(0, ...ws.map(weekTotal)); const count = ws.filter(w => weekTotal(w) >= 1000).length; return { unlocked: best >= 1000, progress: Math.min(best, 1000), max: 1000, count }; } },
  { id: "earn_1500", title: "First $1,500 Week", description: "Earn $1,500+ in a single week", category: "earnings", icon: "🤑",
    check: (ws) => { const best = Math.max(0, ...ws.map(weekTotal)); const count = ws.filter(w => weekTotal(w) >= 1500).length; return { unlocked: best >= 1500, progress: Math.min(best, 1500), max: 1500, count }; } },
  { id: "earn_2000", title: "First $2,000 Week", description: "Earn $2,000+ in a single week", category: "earnings", icon: "👑",
    check: (ws) => { const best = Math.max(0, ...ws.map(weekTotal)); const count = ws.filter(w => weekTotal(w) >= 2000).length; return { unlocked: best >= 2000, progress: Math.min(best, 2000), max: 2000, count }; } },

  // Consistency
  { id: "active_3", title: "3-Day Streak", description: "3 active days in a row in one week", category: "consistency", icon: "🔥",
    check: (ws) => { const r = getBestConsecutiveActiveDaysAllWeeks(ws); return { unlocked: r.best >= 3, progress: Math.min(r.best, 3), max: 3, count: r.totalCount }; } },
  { id: "active_5", title: "5-Day Grind", description: "5 active days in a row in one week", category: "consistency", icon: "⚡",
    check: (ws) => { const r = getBestConsecutiveActiveDaysAllWeeks(ws); return { unlocked: r.best >= 5, progress: Math.min(r.best, 5), max: 5, count: ws.filter(w => getConsecutiveActiveDays(w).max >= 5).length }; } },
  { id: "active_7", title: "Full Week Warrior", description: "7 active days in a row — no days off", category: "consistency", icon: "🏆",
    check: (ws) => { const r = getBestConsecutiveActiveDaysAllWeeks(ws); return { unlocked: r.best >= 7, progress: Math.min(r.best, 7), max: 7, count: ws.filter(w => getConsecutiveActiveDays(w).max >= 7).length }; } },

  // High Performance Days
  { id: "day_100", title: "Century Day", description: "Earn $100+ in a single day", category: "highday", icon: "💯",
    check: (ws) => { const c = highDayCount(ws, 100); return { unlocked: c >= 1, progress: Math.min(c, 1), max: 1, count: c }; } },
  { id: "day_150", title: "Power Day", description: "Earn $150+ in a single day", category: "highday", icon: "⚡",
    check: (ws) => { const c = highDayCount(ws, 150); return { unlocked: c >= 1, progress: Math.min(c, 1), max: 1, count: c }; } },
  { id: "day_200", title: "Double Century", description: "Earn $200+ in a single day", category: "highday", icon: "🚀",
    check: (ws) => { const c = highDayCount(ws, 200); return { unlocked: c >= 1, progress: Math.min(c, 1), max: 1, count: c }; } },
  { id: "day_300", title: "Triple Threat", description: "Earn $300+ in a single day", category: "highday", icon: "💎",
    check: (ws) => { const c = highDayCount(ws, 300); return { unlocked: c >= 1, progress: Math.min(c, 1), max: 1, count: c }; } },

  // Goals
  { id: "goal_first", title: "First Goal Hit", description: "Hit your weekly goal for the first time", category: "goals", icon: "🎯",
    check: (ws) => { const c = goalHitWeeks(ws); return { unlocked: c >= 1, progress: Math.min(c, 1), max: 1, count: c }; } },
  { id: "goal_3", title: "Triple Crown", description: "Hit your weekly goal 3 times", category: "goals", icon: "👑",
    check: (ws) => { const c = goalHitWeeks(ws); return { unlocked: c >= 3, progress: Math.min(c, 3), max: 3, count: c }; } },
  { id: "goal_streak_5", title: "Goal Machine", description: "Hit your weekly goal 5 weeks in a row", category: "goals", icon: "🏅",
    check: (ws) => { const c = consecutiveGoalWeeks(ws); return { unlocked: c >= 5, progress: Math.min(c, 5), max: 5, count: c >= 5 ? 1 : 0 }; } },

  // Special
  { id: "beast_mode", title: "Beast Mode", description: "Earn 120%+ of your weekly goal", category: "special", icon: "🔥",
    check: (ws) => { const count = ws.filter(w => w.weeklyGoal > 0 && weekTotal(w) >= w.weeklyGoal * 1.2).length; const bestPct = Math.max(0, ...ws.filter(w => w.weeklyGoal > 0).map(w => (weekTotal(w) / w.weeklyGoal) * 100)); return { unlocked: count > 0, progress: Math.min(Math.round(bestPct), 120), max: 120, count }; } },
  { id: "sunday_save", title: "Sunday Save", description: "Reach your goal on Sunday (the last day)", category: "special", icon: "🌅",
    check: (ws) => {
      let count = 0;
      for (const w of ws) {
        if (w.weeklyGoal <= 0) return false;
        const totalBefore = w.entries.slice(0, 6).reduce((s, e) => s + dayTotal(e), 0);
        const totalAll = totalBefore + dayTotal(w.entries[6]);
        if (totalBefore < w.weeklyGoal && totalAll >= w.weeklyGoal) count++;
      }
      return { unlocked: count > 0, progress: count > 0 ? 1 : 0, max: 1, count };
    } },
  { id: "comeback", title: "Comeback Week", description: "Beat previous week by 25%+", category: "special", icon: "📈",
    check: (ws) => {
      const sorted = [...ws].sort((a, b) => a.startDate.localeCompare(b.startDate));
      let count = 0;
      for (let i = 1; i < sorted.length; i++) {
        const w = sorted[i];
        const prev = weekTotal(sorted[i - 1]);
        if (prev > 0 && weekTotal(w) >= prev * 1.25) count++;
      }
      return { unlocked: count > 0, progress: count > 0 ? 1 : 0, max: 1, count };
    } },
  { id: "hot_streak", title: "Hot Streak", description: "3 days earning $150+ in one week", category: "special", icon: "🔥",
    check: (ws) => {
      const best = Math.max(0, ...ws.map(w => w.entries.filter(e => dayTotal(e) >= 150).length));
      const count = ws.filter(w => w.entries.filter(e => dayTotal(e) >= 150).length >= 3).length;
      return { unlocked: best >= 3, progress: Math.min(best, 3), max: 3, count };
    } },
  { id: "app_master", title: "App Master", description: "One app accounts for 60%+ of weekly total", category: "special", icon: "🎮",
    check: (ws) => {
      let count = 0;
      for (const w of ws) {
        const total = weekTotal(w);
        if (total <= 0) continue;
        const apps = Object.keys(w.entries[0]?.apps || {});
        if (apps.some(a => {
          const at = w.entries.reduce((s, e) => s + (e.apps[a] || 0), 0);
          return at / total >= 0.6;
        })) count++;
      }
      return { unlocked: count > 0, progress: count > 0 ? 1 : 0, max: 1, count };
    } },

  // New intelligent achievements
  { id: "app_collector", title: "App Collector", description: "Use 3+ apps in one day", category: "special", icon: "📱",
    check: (ws) => {
      let count = 0;
      for (const w of ws) for (const d of w.entries) {
        if (Object.values(d.apps).filter(v => (v || 0) > 0).length >= 3) { count++; }
      }
      return { unlocked: count > 0, progress: count > 0 ? 1 : 0, max: 1, count };
    } },
  { id: "multi_app_strat", title: "Multi-App Strategist", description: "Use 5+ apps in a week", category: "special", icon: "🧠",
    check: (ws) => {
      const count = weeksWithAppsUsed(ws, 5);
      return { unlocked: count > 0, progress: Math.min(weeksWithAppsUsed(ws, 5), 1), max: 1, count };
    } },
  { id: "one_app_carry", title: "One App Carry", description: "One app generates 80%+ of weekly total", category: "special", icon: "💪",
    check: (ws) => {
      let count = 0;
      for (const w of ws) {
        const total = weekTotal(w);
        if (total <= 0) continue;
        const apps = Object.keys(w.entries[0]?.apps || {});
        if (apps.some(a => w.entries.reduce((s, e) => s + (e.apps[a] || 0), 0) / total >= 0.8)) count++;
      }
      return { unlocked: count > 0, progress: count > 0 ? 1 : 0, max: 1, count };
    } },
  { id: "balanced_week", title: "Balanced Week", description: "3+ apps contribute at least 20% each", category: "special", icon: "⚖️",
    check: (ws) => {
      let count = 0;
      for (const w of ws) {
        const total = weekTotal(w);
        if (total <= 0) continue;
        const apps = Object.keys(w.entries[0]?.apps || {});
        const qualifying = apps.filter(a => w.entries.reduce((s, e) => s + (e.apps[a] || 0), 0) / total >= 0.2).length;
        if (qualifying >= 3) count++;
      }
      return { unlocked: count > 0, progress: count > 0 ? 1 : 0, max: 1, count };
    } },
  { id: "comeback_king", title: "Comeback King", description: "Finish above previous week after starting below it", category: "special", icon: "🦁",
    check: (ws) => {
      const sorted = [...ws].sort((a, b) => a.startDate.localeCompare(b.startDate));
      let count = 0;
      for (let i = 1; i < sorted.length; i++) {
        const cur = sorted[i], prev = sorted[i - 1];
        // "starting below" = mid-week total of first 3 days less than prev's first 3
        const curMid = cur.entries.slice(0, 3).reduce((s, e) => s + dayTotal(e), 0);
        const prevMid = prev.entries.slice(0, 3).reduce((s, e) => s + dayTotal(e), 0);
        if (curMid < prevMid && weekTotal(cur) > weekTotal(prev)) count++;
      }
      return { unlocked: count > 0, progress: count > 0 ? 1 : 0, max: 1, count };
    } },
  { id: "chill_week", title: "Chill Week", description: "7 logged days including at least 1 zero-income day", category: "consistency", icon: "🧘",
    check: (ws) => {
      let count = 0;
      for (const w of ws) {
        const logged = getLoggedDaysCount(w);
        const zeroIncome = w.entries.filter(d => {
          const isLogged = d.logged !== undefined ? d.logged : dayTotal(d) > 0;
          return isLogged && dayTotal(d) === 0;
        }).length;
        if (logged === 7 && zeroIncome >= 1) count++;
      }
      return { unlocked: count > 0, progress: count > 0 ? 1 : 0, max: 1, count };
    } },
  { id: "full_week_logged", title: "Full Week Logged", description: "7 days logged in a week", category: "consistency", icon: "📋",
    check: (ws) => {
      let count = 0;
      for (const w of ws) {
        if (getLoggedDaysCount(w) === 7) count++;
      }
      return { unlocked: count > 0, progress: Math.min(Math.max(0, ...ws.map(getLoggedDaysCount)), 7), max: 7, count };
    } },
];