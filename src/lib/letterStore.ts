import type { WeekRecord } from "./types";
import { generateWeeklyLetter, type WeeklyLetter } from "./weeklyLetter";
import { weekTotal, formatCurrency } from "./store";

const KEY = "streex_letters_v1";

export type EmotionalTag =
  | "Strongest week"
  | "Record set"
  | "Goal met"
  | "Goal surpassed"
  | "Momentum recovered"
  | "Strong finish"
  | "Steady start"
  | "Consistency week"
  | "Recovery chapter"
  | "Reset week"
  | "Quiet chapter"
  | "Another chapter";

export interface StoredLetter {
  weekId: string;
  weekStart: string;
  weekEnd: string;
  weekTotal: number;
  weekTotalFormatted: string;
  emotionalTag: EmotionalTag;
  letter: WeeklyLetter;
  savedAt: string;
}

function deriveTag(title: string): EmotionalTag {
  const t = title.toLowerCase();
  if (t.includes("strongest week")) return "Strongest week";
  if (t.includes("record")) return "Record set";
  if (t.includes("ran ahead")) return "Goal surpassed";
  if (t.includes("goal met")) return "Goal met";
  if (t.includes("turned around")) return "Momentum recovered";
  if (t.includes("momentum returned")) return "Momentum recovered";
  if (t.includes("reset")) return "Reset week";
  if (t.includes("consistency")) return "Consistency week";
  if (t.includes("pause")) return "Quiet chapter";
  if (t.includes("quiet")) return "Quiet chapter";
  if (t.includes("recovery")) return "Recovery chapter";
  return "Another chapter";
}

function readAll(): Record<string, StoredLetter> {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeAll(map: Record<string, StoredLetter>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* quota — non-fatal */
  }
}

export function buildStoredLetter(
  week: WeekRecord,
  weeks: WeekRecord[],
  sym: string,
): StoredLetter {
  const letter = generateWeeklyLetter(week, weeks, sym);
  const wt = weekTotal(week);
  return {
    weekId: week.id,
    weekStart: week.startDate,
    weekEnd: week.endDate,
    weekTotal: wt,
    weekTotalFormatted: formatCurrency(wt, sym),
    emotionalTag: deriveTag(letter.title),
    letter,
    savedAt: new Date().toISOString(),
  };
}

/**
 * Ensure every closed week has a stored letter. Idempotent and cheap.
 * Backfills on first load so the Library is populated immediately.
 */
export function syncStoredLetters(weeks: WeekRecord[], sym: string): StoredLetter[] {
  const map = readAll();
  let dirty = false;
  for (const w of weeks) {
    if (w.status !== "closed") continue;
    if (!map[w.id]) {
      map[w.id] = buildStoredLetter(w, weeks, sym);
      dirty = true;
    }
  }
  if (dirty) writeAll(map);
  return Object.values(map).sort((a, b) => b.weekStart.localeCompare(a.weekStart));
}

export function getStoredLetters(): StoredLetter[] {
  return Object.values(readAll()).sort((a, b) => b.weekStart.localeCompare(a.weekStart));
}

export function getStoredLetter(weekId: string): StoredLetter | null {
  return readAll()[weekId] || null;
}