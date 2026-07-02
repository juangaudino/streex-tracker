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

    expect(points.filter((point) => point.isTracked).map((point) => ({
      dailyDiff: point.dailyDiff,
      cumulativeDiff: point.cumulativeDiff,
    }))).toEqual([
      { dailyDiff: -20, cumulativeDiff: -20 },
      { dailyDiff: -20, cumulativeDiff: -40 },
    ]);
  });

  it("keeps future reference days without treating them as current zeroes", () => {
    const points = buildWeeklyComparisonPoints(
      week("current", [50, 0, 75, 0, 0, 0, 0]),
      week("record", [40, 500, 90, 500, 0, 0, 0]),
      [2, 0],
    );

    expect(points).toHaveLength(7);
    expect(points[3]).toMatchObject({
      isFuture: true,
      current: null,
      dailyDiff: null,
      cumulativeDiff: null,
      referenceCumulative: 1_130,
    });
    expect(points[2].currentCumulative).toBe(125);
    expect(points[2].cumulativeDiff).toBe(-5);
  });

  it("projects future cumulative earnings from the tracked-day average", () => {
    const points = buildWeeklyComparisonPoints(
      week("current", [80, 120, 0, 0, 0, 0, 0]),
      week("previous", [100, 100, 100, 100, 100, 100, 100]),
      [0, 1],
    );

    expect(points[1].projectedCumulative).toBe(200);
    expect(points[2].projectedCumulative).toBe(300);
    expect(points[6].projectedCumulative).toBe(700);
  });
});
