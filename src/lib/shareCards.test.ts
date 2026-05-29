import { describe, expect, it } from "vitest";
import { buildShareCards } from "./shareCards";
import type { DayEntry, WeekRecord } from "./types";
import { DAY_NAMES } from "./types";

function week(id: string, startDate: string, totals: number[]): WeekRecord {
  const start = new Date(`${startDate}T00:00:00`);
  const entries: DayEntry[] = totals.map((total, index) => {
    const d = new Date(start);
    d.setDate(start.getDate() + index);
    return {
      dayName: DAY_NAMES[index],
      date: d.toISOString().slice(0, 10),
      logged: total > 0,
      dayClosed: total > 0,
      apps: { Uber: total },
    };
  });
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return {
    id,
    startDate,
    endDate: end.toISOString().slice(0, 10),
    weeklyGoal: 1000,
    status: "closed",
    entries,
    createdAt: `${startDate}T00:00:00.000Z`,
    updatedAt: `${startDate}T00:00:00.000Z`,
  };
}

describe("buildShareCards milestones", () => {
  it("only creates milestone cards from real tracked history", () => {
    const weeks = Array.from({ length: 15 }, (_, index) => {
      const start = new Date("2026-01-05T00:00:00");
      start.setDate(start.getDate() + index * 7);
      return week(`w${index}`, start.toISOString().slice(0, 10), [200, 200, 200, 200, 200, 200, 200]);
    });

    const cards = buildShareCards(weeks, [], "USD");
    const titles = cards.map((item) => item.card.title);

    expect(titles).toContain("First 1K Week");
    expect(titles).toContain("100 Days Tracked");
    expect(titles.some((title) => title.includes("Unlocked"))).toBe(true);
  });

  it("does not invent large milestones for sparse data", () => {
    const cards = buildShareCards([week("w1", "2026-05-04", [50, 0, 0, 0, 0, 0, 0])], [], "USD");
    const titles = cards.map((item) => item.card.title);

    expect(titles).not.toContain("First 1K Week");
    expect(titles).not.toContain("100 Days Tracked");
  });
});
