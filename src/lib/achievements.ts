import { WeekRecord } from "./types";
import { weekTotal, dayTotal } from "./store";

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  category: "earnings" | "consistency" | "highday" | "goals" | "special";
  icon: string;
  check: (weeks: WeekRecord[]) => { unlocked: boolean; progress: number; max: number };
}

export interface AchievementState extends AchievementDef {
  unlocked: boolean;
  unlockedAt: string | null;
  progress: number;
  max: number;
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

function getConsecutiveActiveDays(w: WeekRecord): number {
  let max = 0, cur = 0;
  for (const e of w.entries) {
    if (dayTotal(e) > 0) { cur++; max = Math.max(max, cur); }
    else cur = 0;
  }
  return max;
}

function getBestConsecutiveActiveDaysAllWeeks(weeks: WeekRecord[]): number {
  return Math.max(0, ...weeks.map(getConsecutiveActiveDays));
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

export const ACHIEVEMENTS: AchievementDef[] = [
  // Earnings
  { id: "earn_500", title: "First $500 Week", description: "Earn $500+ in a single week", category: "earnings", icon: "💵",
    check: (ws) => { const best = Math.max(0, ...ws.map(weekTotal)); return { unlocked: best >= 500, progress: Math.min(best, 500), max: 500 }; } },
  { id: "earn_1000", title: "First $1,000 Week", description: "Earn $1,000+ in a single week", category: "earnings", icon: "💰",
    check: (ws) => { const best = Math.max(0, ...ws.map(weekTotal)); return { unlocked: best >= 1000, progress: Math.min(best, 1000), max: 1000 }; } },
  { id: "earn_1500", title: "First $1,500 Week", description: "Earn $1,500+ in a single week", category: "earnings", icon: "🤑",
    check: (ws) => { const best = Math.max(0, ...ws.map(weekTotal)); return { unlocked: best >= 1500, progress: Math.min(best, 1500), max: 1500 }; } },
  { id: "earn_2000", title: "First $2,000 Week", description: "Earn $2,000+ in a single week", category: "earnings", icon: "👑",
    check: (ws) => { const best = Math.max(0, ...ws.map(weekTotal)); return { unlocked: best >= 2000, progress: Math.min(best, 2000), max: 2000 }; } },

  // Consistency
  { id: "active_3", title: "3-Day Streak", description: "3 active days in a row in one week", category: "consistency", icon: "🔥",
    check: (ws) => { const best = getBestConsecutiveActiveDaysAllWeeks(ws); return { unlocked: best >= 3, progress: Math.min(best, 3), max: 3 }; } },
  { id: "active_5", title: "5-Day Grind", description: "5 active days in a row in one week", category: "consistency", icon: "⚡",
    check: (ws) => { const best = getBestConsecutiveActiveDaysAllWeeks(ws); return { unlocked: best >= 5, progress: Math.min(best, 5), max: 5 }; } },
  { id: "active_7", title: "Full Week Warrior", description: "7 active days in a row — no days off", category: "consistency", icon: "🏆",
    check: (ws) => { const best = getBestConsecutiveActiveDaysAllWeeks(ws); return { unlocked: best >= 7, progress: Math.min(best, 7), max: 7 }; } },

  // High Performance Days
  { id: "day_100", title: "Century Day", description: "Earn $100+ in a single day", category: "highday", icon: "💯",
    check: (ws) => { const c = highDayCount(ws, 100); return { unlocked: c >= 1, progress: Math.min(c, 1), max: 1 }; } },
  { id: "day_150", title: "Power Day", description: "Earn $150+ in a single day", category: "highday", icon: "⚡",
    check: (ws) => { const c = highDayCount(ws, 150); return { unlocked: c >= 1, progress: Math.min(c, 1), max: 1 }; } },
  { id: "day_200", title: "Double Century", description: "Earn $200+ in a single day", category: "highday", icon: "🚀",
    check: (ws) => { const c = highDayCount(ws, 200); return { unlocked: c >= 1, progress: Math.min(c, 1), max: 1 }; } },
  { id: "day_300", title: "Triple Threat", description: "Earn $300+ in a single day", category: "highday", icon: "💎",
    check: (ws) => { const c = highDayCount(ws, 300); return { unlocked: c >= 1, progress: Math.min(c, 1), max: 1 }; } },

  // Goals
  { id: "goal_first", title: "First Goal Hit", description: "Hit your weekly goal for the first time", category: "goals", icon: "🎯",
    check: (ws) => { const c = goalHitWeeks(ws); return { unlocked: c >= 1, progress: Math.min(c, 1), max: 1 }; } },
  { id: "goal_3", title: "Triple Crown", description: "Hit your weekly goal 3 times", category: "goals", icon: "👑",
    check: (ws) => { const c = goalHitWeeks(ws); return { unlocked: c >= 3, progress: Math.min(c, 3), max: 3 }; } },
  { id: "goal_streak_5", title: "Goal Machine", description: "Hit your weekly goal 5 weeks in a row", category: "goals", icon: "🏅",
    check: (ws) => { const c = consecutiveGoalWeeks(ws); return { unlocked: c >= 5, progress: Math.min(c, 5), max: 5 }; } },

  // Special
  { id: "beast_mode", title: "Beast Mode", description: "Earn 120%+ of your weekly goal", category: "special", icon: "🔥",
    check: (ws) => { const has = ws.some(w => w.weeklyGoal > 0 && weekTotal(w) >= w.weeklyGoal * 1.2); const bestPct = Math.max(0, ...ws.filter(w => w.weeklyGoal > 0).map(w => (weekTotal(w) / w.weeklyGoal) * 100)); return { unlocked: has, progress: Math.min(Math.round(bestPct), 120), max: 120 }; } },
  { id: "sunday_save", title: "Sunday Save", description: "Reach your goal on Sunday (the last day)", category: "special", icon: "🌅",
    check: (ws) => {
      const has = ws.some(w => {
        if (w.weeklyGoal <= 0) return false;
        const totalBefore = w.entries.slice(0, 6).reduce((s, e) => s + dayTotal(e), 0);
        const totalAll = totalBefore + dayTotal(w.entries[6]);
        return totalBefore < w.weeklyGoal && totalAll >= w.weeklyGoal;
      });
      return { unlocked: has, progress: has ? 1 : 0, max: 1 };
    } },
  { id: "comeback", title: "Comeback Week", description: "Beat previous week by 25%+", category: "special", icon: "📈",
    check: (ws) => {
      const sorted = [...ws].sort((a, b) => a.startDate.localeCompare(b.startDate));
      const has = sorted.some((w, i) => {
        if (i === 0) return false;
        const prev = weekTotal(sorted[i - 1]);
        return prev > 0 && weekTotal(w) >= prev * 1.25;
      });
      return { unlocked: has, progress: has ? 1 : 0, max: 1 };
    } },
  { id: "hot_streak", title: "Hot Streak", description: "3 days earning $150+ in one week", category: "special", icon: "🔥",
    check: (ws) => {
      const best = Math.max(0, ...ws.map(w => w.entries.filter(e => dayTotal(e) >= 150).length));
      return { unlocked: best >= 3, progress: Math.min(best, 3), max: 3 };
    } },
  { id: "app_master", title: "App Master", description: "One app accounts for 60%+ of weekly total", category: "special", icon: "🎮",
    check: (ws) => {
      const has = ws.some(w => {
        const total = weekTotal(w);
        if (total <= 0) return false;
        const apps = Object.keys(w.entries[0]?.apps || {});
        return apps.some(a => {
          const at = w.entries.reduce((s, e) => s + (e.apps[a] || 0), 0);
          return at / total >= 0.6;
        });
      });
      return { unlocked: has, progress: has ? 1 : 0, max: 1 };
    } },
];