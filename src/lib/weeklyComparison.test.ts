import { describe, expect, it } from "vitest";
import type { WeekRecord } from "./types";
import { buildWeeklyComparisonPoints } from "./weeklyComparison";

function week(id: string, totals: number[]): WeekRecord {
  return {
    id,
    startDate: "2026-06-29",
    endDate: "2026-07-05",
    weeklyGoal: 1_000,
    status: "closed",
    createdAt: "2026-06-29T00:00:00.000Z",
    updatedAt: "2026-06-29T00:00:00.000Z",
    entries: totals.map((total, index) => ({
      dayName: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][index],
      date: `2026-07-0${index + 1}`,
      apps: { Uber: total },
    })),
  };
}

describe("buildWeeklyComparisonPoints", () => {
  it("calculates daily and running differences at the same comparison point", () => {
    const points = buildWeeklyComparisonPoints(
      week("current", [80, 80, 0, 0, 0, 0, 0]),
      week("previous", [100, 100, 500, 0, 0, 0, 0]),
      [0, 1],
    );

    expect(points.map((point) => ({
      dailyDiff: point.dailyDiff,
      cumulativeDiff: point.cumulativeDiff,
    }))).toEqual([
      { dailyDiff: -20, cumulativeDiff: -20 },
      { dailyDiff: -20, cumulativeDiff: -40 },
    ]);
  });

  it("sorts selected days and excludes future days", () => {
    const points = buildWeeklyComparisonPoints(
      week("current", [50, 0, 75, 0, 0, 0, 0]),
      week("record", [40, 500, 90, 500, 0, 0, 0]),
      [2, 0],
    );

    expect(points.map((point) => point.dayIndex)).toEqual([0, 2]);
    expect(points.at(-1)?.currentCumulative).toBe(125);
    expect(points.at(-1)?.referenceCumulative).toBe(130);
  });
});
