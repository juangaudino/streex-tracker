import { describe, expect, it } from "vitest";
import type { DayEntry, WeekRecord } from "@/lib/types";
import { buildActiveDayAverageComparison } from "@/lib/weeklyOperations";

function day(date: string, total: number): DayEntry {
  return { dayName: "Monday", date, apps: { Uber: total } };
}

function week(id: string, totals: number[]): WeekRecord {
  return {
    id,
    startDate: "2026-06-01",
    endDate: "2026-06-07",
    weeklyGoal: 1000,
    status: "closed",
    entries: totals.map((total, index) => day(`2026-06-0${index + 1}`, total)),
    createdAt: "2026-06-01T00:00:00Z",
    updatedAt: "2026-06-01T00:00:00Z",
  };
}

describe("weekly active-day average", () => {
  it("compares earning days while excluding zero days and the current week from history", () => {
    const current = week("current", [200, 100, 0]);
    const historical = week("history", [100, 50, 0]);
    const result = buildActiveDayAverageComparison([current], [current, historical]);

    expect(result.currentAverage).toBe(150);
    expect(result.historicalAverage).toBe(75);
    expect(result.percentDifference).toBe(100);
    expect(result.currentActiveDays).toBe(2);
    expect(result.historicalActiveDays).toBe(2);
  });

  it("returns safe empty values without active days", () => {
    expect(buildActiveDayAverageComparison([week("current", [0])], [])).toMatchObject({
      currentAverage: null,
      historicalAverage: null,
      percentDifference: null,
    });
  });
});
