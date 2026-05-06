import { WeekRecord } from "./types";
import { weekTotal, dayTotal, appTotal } from "./store";

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  category: "earnings" | "consistency" | "highday" | "goals" | "special";
  icon: string;
  rarity?: "common" | "rare" | "epic" | "legendary" | "mythic";
  repeatable?: boolean; // true = show "Achieved X times", false/undefined = one-time milestone
  check: (weeks: WeekRecord[]) => { unlocked: boolean; progress: number; max: number; count: number; firstDate?: string; firstRange?: string };
}

export interface AchievementState extends AchievementDef {
  unlocked: boolean;
  unlockedAt: string | null;
  progress: number;
  max: number;
  count: number;
  firstDate?: string;
  firstRange?: string;
}

export const CATEGORY_LABELS: Record<string, string> = {
  earnings: "Earnings Milestones",
  consistency: "Consistency",
  highday: "High Performance Days",
  goals: "Goal Achievements",
  special: "Special Achievements",
  growth: "Personal Growth",
};

// ── Growth helpers ──

function getImprovingWeeksStreak(weeks: WeekRecord[]): number {
  const sorted = [...weeks].sort((a, b) => a.startDate.localeCompare(b.startDate));
  let max = 0, cur = 0;
  for (let i = 1; i < sorted.length; i++) {
    if (weekTotal(sorted[i]) > weekTotal(sorted[i - 1])) { cur++; max = Math.max(max, cur); }
    else cur = 0;
  }
  return max;
}

function getWeeksAbovePersonalAvg(weeks: WeekRecord[]): number {
  if (weeks.length === 0) return 0;
  const avg = weeks.reduce((s, w) => s + weekTotal(w), 0) / weeks.length;
  return weeks.filter(w => weekTotal(w) > avg).length;
}

function getDaysAbovePersonalAvg(weeks: WeekRecord[]): number {
  const allDays = weeks.flatMap(w => w.entries.map(dayTotal));
  const activeDays = allDays.filter(d => d > 0);
  if (activeDays.length === 0) return 0;
  const avg = activeDays.reduce((s, v) => s + v, 0) / activeDays.length;
  return activeDays.filter(d => d > avg).length;
}

// ── Helpers ──

function weekHitGoal(w: WeekRecord) {
  return weekTotal(w) >= w.weeklyGoal && w.weeklyGoal > 0;
}

function getConsecutiveActiveDays(w: WeekRecord): { max: number; count: number } {
  let max = 0, cur = 0, streakCount = 0;
  for (const e of w.entries) {
    const isLogged = e.logged !== undefined ? e.logged : dayTotal(e) > 0;
    const isActive = dayTotal(e) > 0;
    if (isActive) { cur++; max = Math.max(max, cur); }
    else if (!isLogged) { if (cur >= 3) streakCount++; cur = 0; }
  }
  if (cur >= 3) streakCount++;
  return { max, count: streakCount };
}

function getBestConsecutiveActiveDaysAllWeeks(weeks: WeekRecord[]) {
  let best = 0, totalCount = 0;
  for (const w of weeks) { const r = getConsecutiveActiveDays(w); best = Math.max(best, r.max); totalCount += r.count; }
  return { best, totalCount };
}

function highDayCount(weeks: WeekRecord[], threshold: number): number {
  let count = 0;
  for (const w of weeks) for (const e of w.entries) if (dayTotal(e) >= threshold) count++;
  return count;
}

function firstHighDay(weeks: WeekRecord[], threshold: number): string | undefined {
  const sorted = [...weeks].sort((a, b) => a.startDate.localeCompare(b.startDate));
  for (const w of sorted) for (const e of w.entries) if (dayTotal(e) >= threshold) return e.date;
  return undefined;
}

function firstWeekAbove(weeks: WeekRecord[], threshold: number): string | undefined {
  const sorted = [...weeks].sort((a, b) => a.startDate.localeCompare(b.startDate));
  for (const w of sorted) if (weekTotal(w) >= threshold) return `${w.startDate} – ${w.endDate}`;
  return undefined;
}

function goalHitWeeks(weeks: WeekRecord[]): number { return weeks.filter(weekHitGoal).length; }

function consecutiveGoalWeeks(weeks: WeekRecord[]): number {
  const sorted = [...weeks].sort((a, b) => a.startDate.localeCompare(b.startDate));
  let max = 0, cur = 0;
  for (const w of sorted) { if (weekHitGoal(w)) { cur++; max = Math.max(max, cur); } else cur = 0; }
  return max;
}

function getLoggedDaysCount(w: WeekRecord): number {
  return w.entries.filter(d => d.logged !== undefined ? d.logged : dayTotal(d) > 0).length;
}

function weeksWithAppsUsed(weeks: WeekRecord[], minApps: number): number {
  let count = 0;
  for (const w of weeks) {
    const usedApps = Object.keys(w.entries[0]?.apps || {}).filter(a => w.entries.some(d => (d.apps[a] || 0) > 0)).length;
    if (usedApps >= minApps) count++;
  }
  return count;
}

// ── Weekly thresholds ──
const WEEKLY_THRESHOLDS = [
  { amount: 500, icon: "💵", rarity: "common" as const },
  { amount: 1000, icon: "💰", rarity: "rare" as const },
  { amount: 1500, icon: "🤑", rarity: "epic" as const },
  { amount: 2000, icon: "👑", rarity: "legendary" as const },
];

// ── Daily thresholds ──
const DAILY_THRESHOLDS = [
  { amount: 100, icon: "💯", rarity: "common" as const },
  { amount: 150, icon: "⚡", rarity: "common" as const },
  { amount: 200, icon: "🚀", rarity: "rare" as const },
  { amount: 250, icon: "🔥", rarity: "rare" as const },
  { amount: 300, icon: "💎", rarity: "epic" as const },
  { amount: 350, icon: "🌟", rarity: "epic" as const },
  { amount: 400, icon: "⭐", rarity: "legendary" as const },
  { amount: 450, icon: "🏆", rarity: "legendary" as const },
  { amount: 500, icon: "👑", rarity: "legendary" as const },
];

function buildWeeklyOneTime(t: typeof WEEKLY_THRESHOLDS[0]): AchievementDef {
  return {
    id: `first_week_${t.amount}`, title: `First $${t.amount.toLocaleString()} Week`,
    description: `Earn $${t.amount.toLocaleString()}+ in a single week`, category: "earnings",
    icon: t.icon, rarity: t.rarity, repeatable: false,
    check: (ws) => {
      const best = Math.max(0, ...ws.map(weekTotal));
      const fr = firstWeekAbove(ws, t.amount);
      return { unlocked: best >= t.amount, progress: Math.min(best, t.amount), max: t.amount, count: 0, firstRange: fr };
    },
  };
}

function buildWeeklyRepeatable(t: typeof WEEKLY_THRESHOLDS[0]): AchievementDef {
  return {
    id: `weeks_${t.amount}`, title: `$${t.amount.toLocaleString()}+ Weeks`,
    description: `Weeks earning $${t.amount.toLocaleString()}+`, category: "earnings",
    icon: t.icon, rarity: t.rarity, repeatable: true,
    check: (ws) => {
      const count = ws.filter(w => weekTotal(w) >= t.amount).length;
      const best = Math.max(0, ...ws.map(weekTotal));
      return { unlocked: count >= 1, progress: Math.min(best, t.amount), max: t.amount, count };
    },
  };
}

function buildDailyOneTime(t: typeof DAILY_THRESHOLDS[0]): AchievementDef {
  return {
    id: `first_day_${t.amount}`, title: `First $${t.amount} Day`,
    description: `Earn $${t.amount}+ in a single day`, category: "highday",
    icon: t.icon, rarity: t.rarity, repeatable: false,
    check: (ws) => {
      const c = highDayCount(ws, t.amount);
      const fd = firstHighDay(ws, t.amount);
      let bestDay = 0;
      for (const w of ws) for (const e of w.entries) bestDay = Math.max(bestDay, dayTotal(e));
      return { unlocked: c >= 1, progress: Math.min(bestDay, t.amount), max: t.amount, count: 0, firstDate: fd };
    },
  };
}

function buildDailyRepeatable(t: typeof DAILY_THRESHOLDS[0]): AchievementDef {
  return {
    id: `days_${t.amount}`, title: `$${t.amount}+ Days`,
    description: `Days earning $${t.amount}+`, category: "highday",
    icon: t.icon, rarity: t.rarity, repeatable: true,
    check: (ws) => {
      const c = highDayCount(ws, t.amount);
      let bestDay = 0;
      for (const w of ws) for (const e of w.entries) bestDay = Math.max(bestDay, dayTotal(e));
      return { unlocked: c >= 1, progress: Math.min(bestDay, t.amount), max: t.amount, count: c };
    },
  };
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // ── Weekly Earnings: One-Time then Repeatable ──
  ...WEEKLY_THRESHOLDS.map(buildWeeklyOneTime),
  ...WEEKLY_THRESHOLDS.map(buildWeeklyRepeatable),

  // ── Daily Earnings: One-Time then Repeatable ──
  ...DAILY_THRESHOLDS.map(buildDailyOneTime),
  ...DAILY_THRESHOLDS.map(buildDailyRepeatable),

  // ── Consistency ──
  { id: "active_3", title: "3-Day Streak", description: "3 active days in a row in one week", category: "consistency", icon: "🔥", rarity: "common", repeatable: true,
    check: (ws) => { const r = getBestConsecutiveActiveDaysAllWeeks(ws); return { unlocked: r.best >= 3, progress: Math.min(r.best, 3), max: 3, count: r.totalCount }; } },
  { id: "active_5", title: "5-Day Grind", description: "5 active days in a row in one week", category: "consistency", icon: "⚡", rarity: "rare", repeatable: true,
    check: (ws) => { const r = getBestConsecutiveActiveDaysAllWeeks(ws); return { unlocked: r.best >= 5, progress: Math.min(r.best, 5), max: 5, count: ws.filter(w => getConsecutiveActiveDays(w).max >= 5).length }; } },
  { id: "active_7", title: "Full Week Warrior", description: "7 active days in a row — no days off", category: "consistency", icon: "🏆", rarity: "legendary", repeatable: true,
    check: (ws) => { const r = getBestConsecutiveActiveDaysAllWeeks(ws); return { unlocked: r.best >= 7, progress: Math.min(r.best, 7), max: 7, count: ws.filter(w => getConsecutiveActiveDays(w).max >= 7).length }; } },
  { id: "full_week_logged", title: "Full Week Logged", description: "7 days logged in a week", category: "consistency", icon: "📋", rarity: "common", repeatable: true,
    check: (ws) => { let count = 0; for (const w of ws) { if (getLoggedDaysCount(w) === 7) count++; } return { unlocked: count > 0, progress: Math.min(Math.max(0, ...ws.map(getLoggedDaysCount)), 7), max: 7, count }; } },
  { id: "chill_week", title: "Chill Week", description: "7 logged days including at least 1 zero-income day", category: "consistency", icon: "🧘", rarity: "rare", repeatable: true,
    check: (ws) => { let count = 0; for (const w of ws) { const logged = getLoggedDaysCount(w); const z = w.entries.filter(d => { const l = d.logged !== undefined ? d.logged : dayTotal(d) > 0; return l && dayTotal(d) === 0; }).length; if (logged === 7 && z >= 1) count++; } return { unlocked: count > 0, progress: count > 0 ? 1 : 0, max: 1, count }; } },

  // ── Goals ──
  { id: "goal_first", title: "First Goal Hit", description: "Hit your weekly goal for the first time", category: "goals", icon: "🎯", rarity: "common",
    check: (ws) => { const c = goalHitWeeks(ws); const sorted = [...ws].sort((a, b) => a.startDate.localeCompare(b.startDate)); const first = sorted.find(weekHitGoal); return { unlocked: c >= 1, progress: Math.min(c, 1), max: 1, count: 0, firstRange: first ? `${first.startDate} – ${first.endDate}` : undefined }; } },
  { id: "goal_3", title: "Triple Crown", description: "Hit your weekly goal 3 times", category: "goals", icon: "👑", rarity: "rare", repeatable: true,
    check: (ws) => { const c = goalHitWeeks(ws); return { unlocked: c >= 3, progress: Math.min(c, 3), max: 3, count: c }; } },
  { id: "goal_streak_5", title: "Goal Machine", description: "Hit your weekly goal 5 weeks in a row", category: "goals", icon: "🏅", rarity: "legendary",
    check: (ws) => { const c = consecutiveGoalWeeks(ws); return { unlocked: c >= 5, progress: Math.min(c, 5), max: 5, count: 0 }; } },

  // ── Special ──
  { id: "beast_mode", title: "Beast Mode", description: "Earn 120%+ of your weekly goal", category: "special", icon: "🔥", rarity: "epic", repeatable: true,
    check: (ws) => { const count = ws.filter(w => w.weeklyGoal > 0 && weekTotal(w) >= w.weeklyGoal * 1.2).length; const bestPct = Math.max(0, ...ws.filter(w => w.weeklyGoal > 0).map(w => (weekTotal(w) / w.weeklyGoal) * 100)); return { unlocked: count > 0, progress: Math.min(Math.round(bestPct), 120), max: 120, count }; } },
  { id: "sunday_save", title: "Sunday Save", description: "Reach your goal on Sunday (the last day)", category: "special", icon: "🌅", rarity: "epic", repeatable: true,
    check: (ws) => { let count = 0; for (const w of ws) { if (w.weeklyGoal <= 0) continue; const before = w.entries.slice(0, 6).reduce((s, e) => s + dayTotal(e), 0); const all = before + dayTotal(w.entries[6]); if (before < w.weeklyGoal && all >= w.weeklyGoal) count++; } return { unlocked: count > 0, progress: count > 0 ? 1 : 0, max: 1, count }; } },
  { id: "comeback", title: "Comeback Week", description: "Beat previous week by 25%+", category: "special", icon: "📈", rarity: "rare", repeatable: true,
    check: (ws) => { const sorted = [...ws].sort((a, b) => a.startDate.localeCompare(b.startDate)); let count = 0; for (let i = 1; i < sorted.length; i++) { const prev = weekTotal(sorted[i - 1]); if (prev > 0 && weekTotal(sorted[i]) >= prev * 1.25) count++; } return { unlocked: count > 0, progress: count > 0 ? 1 : 0, max: 1, count }; } },
  { id: "hot_streak", title: "Hot Streak", description: "3 days earning $150+ in one week", category: "special", icon: "🔥", rarity: "epic", repeatable: true,
    check: (ws) => { const best = Math.max(0, ...ws.map(w => w.entries.filter(e => dayTotal(e) >= 150).length)); const count = ws.filter(w => w.entries.filter(e => dayTotal(e) >= 150).length >= 3).length; return { unlocked: best >= 3, progress: Math.min(best, 3), max: 3, count }; } },
  { id: "app_master", title: "App Master", description: "One app accounts for 60%+ of weekly total", category: "special", icon: "🎮", rarity: "common", repeatable: true,
    check: (ws) => { let count = 0; for (const w of ws) { const total = weekTotal(w); if (total <= 0) continue; const apps = Object.keys(w.entries[0]?.apps || {}); if (apps.some(a => w.entries.reduce((s, e) => s + (e.apps[a] || 0), 0) / total >= 0.6)) count++; } return { unlocked: count > 0, progress: count > 0 ? 1 : 0, max: 1, count }; } },
  { id: "app_collector", title: "App Collector", description: "Use 3+ apps in one day", category: "special", icon: "📱", rarity: "common", repeatable: true,
    check: (ws) => { let count = 0; for (const w of ws) for (const d of w.entries) { if (Object.values(d.apps).filter(v => (v || 0) > 0).length >= 3) count++; } return { unlocked: count > 0, progress: count > 0 ? 1 : 0, max: 1, count }; } },
  { id: "multi_app_strat", title: "Multi-App Strategist", description: "Use 5+ apps in a week", category: "special", icon: "🧠", rarity: "rare", repeatable: true,
    check: (ws) => { const count = weeksWithAppsUsed(ws, 5); return { unlocked: count > 0, progress: Math.min(count, 1), max: 1, count }; } },
  { id: "one_app_carry", title: "One App Carry", description: "One app generates 80%+ of weekly total", category: "special", icon: "💪", rarity: "rare", repeatable: true,
    check: (ws) => { let count = 0; for (const w of ws) { const total = weekTotal(w); if (total <= 0) continue; const apps = Object.keys(w.entries[0]?.apps || {}); if (apps.some(a => w.entries.reduce((s, e) => s + (e.apps[a] || 0), 0) / total >= 0.8)) count++; } return { unlocked: count > 0, progress: count > 0 ? 1 : 0, max: 1, count }; } },
  { id: "balanced_week", title: "Balanced Week", description: "3+ apps contribute at least 20% each", category: "special", icon: "⚖️", rarity: "epic", repeatable: true,
    check: (ws) => { let count = 0; for (const w of ws) { const total = weekTotal(w); if (total <= 0) continue; const apps = Object.keys(w.entries[0]?.apps || {}); const q = apps.filter(a => w.entries.reduce((s, e) => s + (e.apps[a] || 0), 0) / total >= 0.2).length; if (q >= 3) count++; } return { unlocked: count > 0, progress: count > 0 ? 1 : 0, max: 1, count }; } },
  { id: "comeback_king", title: "Comeback King", description: "Finish above previous week after starting below it", category: "special", icon: "🦁", rarity: "legendary",
    check: (ws) => { const sorted = [...ws].sort((a, b) => a.startDate.localeCompare(b.startDate)); let count = 0; for (let i = 1; i < sorted.length; i++) { const cur = sorted[i], prev = sorted[i - 1]; const curMid = cur.entries.slice(0, 3).reduce((s, e) => s + dayTotal(e), 0); const prevMid = prev.entries.slice(0, 3).reduce((s, e) => s + dayTotal(e), 0); if (curMid < prevMid && weekTotal(cur) > weekTotal(prev)) count++; } return { unlocked: count > 0, progress: count > 0 ? 1 : 0, max: 1, count }; } },

  // ── Personal Growth ──
  { id: "growth_improving_3", title: "Rising Tide", description: "3 improving weeks in a row", category: "special", icon: "📈", rarity: "rare",
    check: (ws) => { const streak = getImprovingWeeksStreak(ws); return { unlocked: streak >= 3, progress: Math.min(streak, 3), max: 3, count: 0 }; } },
  { id: "growth_improving_5", title: "Unstoppable Rise", description: "5 improving weeks in a row", category: "special", icon: "🚀", rarity: "epic",
    check: (ws) => { const streak = getImprovingWeeksStreak(ws); return { unlocked: streak >= 5, progress: Math.min(streak, 5), max: 5, count: 0 }; } },
  { id: "growth_above_avg_5", title: "Above Average", description: "5 days above your personal daily average", category: "special", icon: "⬆️", rarity: "common", repeatable: true,
    check: (ws) => { const c = getDaysAbovePersonalAvg(ws); return { unlocked: c >= 5, progress: Math.min(c, 5), max: 5, count: c }; } },
  { id: "growth_beat_prev_25", title: "Growth Spurt", description: "+25% vs previous week (repeatable)", category: "special", icon: "💪", rarity: "rare", repeatable: true,
    check: (ws) => { const sorted = [...ws].sort((a, b) => a.startDate.localeCompare(b.startDate)); let count = 0; for (let i = 1; i < sorted.length; i++) { const prev = weekTotal(sorted[i - 1]); if (prev > 0 && weekTotal(sorted[i]) >= prev * 1.25) count++; } return { unlocked: count > 0, progress: count > 0 ? 1 : 0, max: 1, count }; } },
  { id: "growth_consistency_king", title: "Consistency King", description: "Most consistent week (lowest daily variance)", category: "special", icon: "🎯", rarity: "epic",
    check: (ws) => {
      if (ws.length < 2) return { unlocked: false, progress: 0, max: 2, count: 0 };
      return { unlocked: true, progress: 1, max: 1, count: 0 };
    } },
  { id: "growth_weeks_above_avg", title: "Above the Line", description: "5 weeks above your personal average", category: "special", icon: "📊", rarity: "epic", repeatable: true,
    check: (ws) => { const c = getWeeksAbovePersonalAvg(ws); return { unlocked: c >= 5, progress: Math.min(c, 5), max: 5, count: c }; } },

  // ── Mythic Achievements ──
  { id: "mythic_perfect_month", title: "Perfect Month", description: "Hit goal 4 weeks in a row", category: "goals", icon: "👑", rarity: "mythic",
    check: (ws) => { const c = consecutiveGoalWeeks(ws); return { unlocked: c >= 4, progress: Math.min(c, 4), max: 4, count: 0 }; } },
  { id: "mythic_double_goal", title: "Double Down", description: "Earn 200%+ of your weekly goal", category: "special", icon: "⚡", rarity: "mythic", repeatable: true,
    check: (ws) => { const count = ws.filter(w => w.weeklyGoal > 0 && weekTotal(w) >= w.weeklyGoal * 2).length; const bestPct = Math.max(0, ...ws.filter(w => w.weeklyGoal > 0).map(w => (weekTotal(w) / w.weeklyGoal) * 100)); return { unlocked: count > 0, progress: Math.min(Math.round(bestPct), 200), max: 200, count }; } },
  { id: "mythic_grind_master", title: "Grind Master", description: "10+ weeks tracked total", category: "consistency", icon: "🏛️", rarity: "mythic",
    check: (ws) => { return { unlocked: ws.length >= 10, progress: Math.min(ws.length, 10), max: 10, count: 0 }; } },
];