import type { WeekRecord } from "./types";
import type { AchievementState } from "./achievements";
import type { ShareCardData } from "@/components/share/ShareCard";
import { weekTotal, dayTotal, formatCurrency } from "./store";
import { generateWeeklyLetter } from "./weeklyLetter";
import { syncStoredLetters } from "./letterStore";
import { listMonthsWithData, getMonthSummary } from "./monthly";

export type ShareCategory =
  | "weekly-highlights"
  | "monthly-highlights"
  | "milestones"
  | "career-moments"
  | "letter-cards";

export interface ShareCardItem {
  id: string;
  category: ShareCategory;
  /** ISO date used to sort newest first. */
  date: string;
  card: ShareCardData;
}

const CATEGORY_LABEL: Record<ShareCategory, string> = {
  "weekly-highlights": "Weekly Highlights",
  "monthly-highlights": "Monthly Highlights",
  "milestones": "Milestones",
  "career-moments": "Career Moments",
  "letter-cards": "Letter Cards",
};

export function categoryLabel(c: ShareCategory): string {
  return CATEGORY_LABEL[c];
}

/**
 * Build every exportable share card from real data.
 * Pure function — no side effects beyond syncStoredLetters (which is itself idempotent).
 * Degrades gracefully: missing signals simply produce no card, never a broken one.
 */
export function buildShareCards(
  weeks: WeekRecord[],
  achievements: AchievementState[],
  sym: string,
): ShareCardItem[] {
  const items: ShareCardItem[] = [];
  if (!weeks || weeks.length === 0) return items;

  const sortedWeeks = [...weeks].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const closedWeeks = sortedWeeks.filter((w) => w.status === "closed");

  // ── Weekly Highlights ────────────────────────────────────────────
  for (const w of closedWeeks) {
    const wt = weekTotal(w);
    if (wt <= 0) continue;

    // Best day card for this week
    let best = { dayName: "—", total: 0, date: w.endDate };
    for (const d of w.entries) {
      const t = dayTotal(d);
      if (t > best.total) best = { dayName: d.dayName, total: t, date: d.date };
    }
    if (best.total > 0) {
      items.push({
        id: `wk-best-${w.id}`,
        category: "weekly-highlights",
        date: best.date,
        card: {
          kind: "best-day",
          title: `Strong ${best.dayName}`,
          subtitle: best.date,
          body: "Your anchor day this week. Every strong week has one.",
          footerLabel: "Earned",
          footer: formatCurrency(best.total, sym),
        },
      });
    }

    // Goal hit card
    if (w.weeklyGoal > 0 && wt >= w.weeklyGoal) {
      const pct = Math.round((wt / w.weeklyGoal) * 100);
      items.push({
        id: `wk-goal-${w.id}`,
        category: "weekly-highlights",
        date: w.endDate,
        card: {
          kind: "weekly-highlight",
          title: "Goal Hit Week",
          subtitle: `${w.startDate} → ${w.endDate}`,
          body: `You aimed for ${formatCurrency(w.weeklyGoal, sym)} and landed at ${pct}%.`,
          footerLabel: "Week Earned",
          footer: formatCurrency(wt, sym),
        },
      });
    }
  }

  // ── Milestones (posters) ─────────────────────────────────────────
  // First $1K week
  const firstK = closedWeeks.find((w) => weekTotal(w) >= 1000);
  if (firstK) {
    items.push({
      id: `ms-1k-${firstK.id}`,
      category: "milestones",
      date: firstK.endDate,
      card: {
        kind: "milestone-poster",
        title: "First $1K Week",
        subtitle: `${firstK.startDate} → ${firstK.endDate}`,
        body: "A new tier unlocked. The ceiling moved up.",
        footerLabel: "Week Earned",
        footer: formatCurrency(weekTotal(firstK), sym),
        legendary: true,
      },
    });
  }

  // Longest streak posters (7+ / 30+)
  const allDaysFlat = sortedWeeks.flatMap((w) => w.entries);
  let streakBest = 0;
  let streakEndDate = "";
  let cur = 0;
  let curEnd = "";
  for (const d of allDaysFlat) {
    const t = dayTotal(d);
    const isLogged = d.logged !== undefined ? d.logged : t > 0;
    if (!isLogged) continue;
    if (t > 0) {
      cur++;
      curEnd = d.date;
      if (cur > streakBest) {
        streakBest = cur;
        streakEndDate = curEnd;
      }
    } else cur = 0;
  }
  for (const target of [7, 30]) {
    if (streakBest >= target) {
      items.push({
        id: `ms-streak-${target}`,
        category: "milestones",
        date: streakEndDate,
        card: {
          kind: "milestone-poster",
          title: `${target}-Day Streak`,
          subtitle: "Consistency, compounded",
          body: "Showing up is its own kind of skill. You proved it.",
          footerLabel: "Days in a row",
          footer: String(target),
          legendary: target >= 30,
        },
      });
    }
  }

  // 30+ active days
  const totalActive = allDaysFlat.filter((d) => dayTotal(d) > 0).length;
  if (totalActive >= 30) {
    items.push({
      id: "ms-active-30",
      category: "milestones",
      date: closedWeeks[closedWeeks.length - 1]?.endDate || sortedWeeks[sortedWeeks.length - 1]?.endDate || "",
      card: {
        kind: "milestone-poster",
        title: "30 Active Days",
        subtitle: "A month of showing up",
        body: "Thirty days where the meter moved. That's a foundation.",
        footerLabel: "Active Days",
        footer: String(totalActive),
      },
    });
  }

  // Achievement-driven milestone posters (legendary-tier only)
  for (const a of achievements || []) {
    if (!a.unlocked || !a.unlockedAt) continue;
    const rarity = (a as any).rarity || (a as any).tier || "";
    if (rarity !== "legendary" && rarity !== "epic") continue;
    items.push({
      id: `ms-ach-${a.id}`,
      category: "milestones",
      date: a.unlockedAt.slice(0, 10),
      card: {
        kind: "milestone-poster",
        title: a.title,
        subtitle: "Achievement Unlocked",
        body: a.description,
        footerLabel: "Tier",
        footer: rarity === "legendary" ? "Legendary" : "Epic",
        legendary: rarity === "legendary",
      },
    });
  }

  // ── Career Moments ───────────────────────────────────────────────
  // All-time best day
  let lifeBest = { total: 0, date: "", dayName: "—" };
  for (const d of allDaysFlat) {
    const t = dayTotal(d);
    if (t > lifeBest.total) lifeBest = { total: t, date: d.date, dayName: d.dayName };
  }
  if (lifeBest.total > 0) {
    items.push({
      id: `cm-record-day`,
      category: "career-moments",
      date: lifeBest.date,
      card: {
        kind: "new-record",
        title: "Personal Record",
        subtitle: `${lifeBest.dayName} · ${lifeBest.date}`,
        body: "The best single day on your record. The line you raised yourself.",
        footerLabel: "Day Earned",
        footer: formatCurrency(lifeBest.total, sym),
        legendary: true,
      },
    });
  }

  // Strongest week ever
  let strongestWk: WeekRecord | null = null;
  let strongestT = 0;
  for (const w of sortedWeeks) {
    const t = weekTotal(w);
    if (t > strongestT) { strongestT = t; strongestWk = w; }
  }
  if (strongestWk && strongestT > 0) {
    items.push({
      id: `cm-strongest-week`,
      category: "career-moments",
      date: strongestWk.endDate,
      card: {
        kind: "strongest-week",
        title: "Strongest Week Yet",
        subtitle: `${strongestWk.startDate} → ${strongestWk.endDate}`,
        body: "The highest week you've put on the record. A ceiling worth remembering.",
        footerLabel: "Week Earned",
        footer: formatCurrency(strongestT, sym),
        legendary: true,
      },
    });
  }

  // ── Monthly Highlights & Flex ────────────────────────────────────
  for (const key of listMonthsWithData(weeks)) {
    const [yy, mm] = key.split("-").map(Number);
    const m = getMonthSummary(weeks, yy, mm - 1);
    if (m.totalEarned <= 0) continue;
    const lastDay = `${yy}-${String(mm).padStart(2, "0")}-${String(new Date(yy, mm, 0).getDate()).padStart(2, "0")}`;

    // Monthly flex card
    items.push({
      id: `mo-flex-${key}`,
      category: "monthly-highlights",
      date: lastDay,
      card: {
        kind: "monthly-flex",
        title: `${m.monthName} in review.`,
        subtitle: m.monthLabel,
        body: m.isBestMonthEver
          ? "Your strongest month yet. The chapter that moved the line."
          : "A month built day by day. Here's what it looked like.",
        stats: [
          { label: "Earned", value: formatCurrency(m.totalEarned, sym) },
          { label: "Worked", value: `${m.daysWorked}d` },
          { label: "Legendary", value: String(m.legendaryDays) },
        ],
        footerLabel: "Best Day",
        footer: m.bestDay.total > 0 ? formatCurrency(m.bestDay.total, sym) : "—",
        legendary: m.isBestMonthEver,
      },
    });

    // Strongest week within month (only if it differs from the lifetime card)
    if (m.strongestWeek && m.strongestWeek.total > 0) {
      items.push({
        id: `mo-week-${key}`,
        category: "monthly-highlights",
        date: m.strongestWeek.endDate,
        card: {
          kind: "monthly-milestone",
          title: `Top Week of ${m.monthName}`,
          subtitle: `${m.strongestWeek.startDate} → ${m.strongestWeek.endDate}`,
          body: `${m.strongestWeek.activeDays} active days, anchored by ${m.strongestWeek.bestApp.app}.`,
          footerLabel: "Week Earned",
          footer: formatCurrency(m.strongestWeek.total, sym),
          legendary: m.strongestWeek.isBestEver,
        },
      });
    }
  }

  // ── Letter Cards (excerpts) ──────────────────────────────────────
  const stored = syncStoredLetters(weeks, sym);
  for (const s of stored) {
    const letter = s.letter || generateWeeklyLetter(
      weeks.find((w) => w.id === s.weekId)!,
      weeks,
      sym,
    );
    const excerpt = pickExcerpt(letter.paragraphs);
    if (!excerpt) continue;
    items.push({
      id: `lt-${s.weekId}`,
      category: "letter-cards",
      date: s.weekEnd,
      card: {
        kind: "letter-excerpt",
        title: `“${excerpt}”`,
        subtitle: `${s.emotionalTag} · ${s.weekStart} → ${s.weekEnd}`,
        body: "Read the full letter in Streex.",
        footerLabel: "Week Earned",
        footer: s.weekTotal > 0 ? s.weekTotalFormatted : undefined,
      },
    });
  }

  // Dedupe + sort newest first
  const seen = new Set<string>();
  return items
    .filter((i) => (seen.has(i.id) ? false : (seen.add(i.id), true)))
    .sort((a, b) => b.date.localeCompare(a.date));
}

function pickExcerpt(paragraphs: string[]): string | null {
  if (!paragraphs || paragraphs.length === 0) return null;
  // Prefer the shortest non-trivial sentence — quote-worthy.
  const sentences = paragraphs
    .flatMap((p) => p.split(/(?<=[.!?])\s+/))
    .map((s) => s.trim())
    .filter((s) => s.length >= 30 && s.length <= 140);
  if (sentences.length === 0) {
    const p = paragraphs[0];
    return p.length > 140 ? p.slice(0, 137).trimEnd() + "…" : p;
  }
  return sentences[0];
}

export function groupByCategory(items: ShareCardItem[]): Record<ShareCategory, ShareCardItem[]> {
  const out: Record<ShareCategory, ShareCardItem[]> = {
    "weekly-highlights": [],
    "monthly-highlights": [],
    "milestones": [],
    "career-moments": [],
    "letter-cards": [],
  };
  for (const it of items) out[it.category].push(it);
  return out;
}