import { describe, expect, it } from "vitest";
import { buildComparisonData, buildComparisonResult, buildDefaultComparisonBlocks, comparisonRangeForType } from "./comparisonBuilder";
import type { DayEntry, WeekRecord } from "./types";

function day(date: string, dayName: DayEntry["dayName"], earnings: number, extras: Partial<DayEntry> = {}): DayEntry {
  return { date, dayName, apps: { Uber: earnings }, logged: earnings > 0, ...extras };
}

function week(id: string, startDate: string, status: WeekRecord["status"], entries: DayEntry[]): WeekRecord {
  return {
    id,
    startDate,
    endDate: comparisonRangeForType("week", startDate).endDate,
    weeklyGoal: 1000,
    weeklyHoursGoal: 40,
    status,
    entries,
    createdAt: `${startDate}T00:00:00.000Z`,
    updatedAt: `${startDate}T00:00:00.000Z`,
  };
}

const priorWeek = week("prior", "2026-06-08", "closed", [
  day("2026-06-08", "Monday", 100, { shifts: [{ id: "p1", startTime: "2026-06-08T10:00:00", endTime: "2026-06-08T14:00:00", miles: 80, rideCount: 8 }] }),
  day("2026-06-09", "Tuesday", 200),
  day("2026-06-10", "Wednesday", 0),
]);
const currentWeek = week("current", "2026-06-15", "open", [
  day("2026-06-15", "Monday", 150, { bonuses: [{ id: "b1", app: "Uber", amount: 25 }], shifts: [{ id: "c1", startTime: "2026-06-15T10:00:00", endTime: "2026-06-15T15:00:00", miles: 100, rideCount: 10 }] }),
  day("2026-06-16", "Tuesday", 50),
  day("2026-06-17", "Wednesday", 0),
]);

describe("advanced comparison builder", () => {
  it("builds honest all-app operational metrics and keeps bonus out of efficiency", () => {
    const result = buildComparisonResult({
      block: { id: "current", type: "custom", startDate: "2026-06-15", endDate: "2026-06-17" },
      weeks: [priorWeek, currentWeek],
    });

    expect(result.metrics.earnings).toBe(225);
    expect(result.metrics.operationalEarnings).toBe(200);
    expect(result.metrics.hours).toBe(5);
    expect(result.metrics.earningsPerHour).toBe(40);
    expect(result.metrics.earningsPerMile).toBe(2);
    expect(result.metrics.earningsPerRide).toBe(20);
    expect(result.metrics.activeDays).toBe(2);
    expect(result.metrics.calendarDays).toBe(3);
  });

  it("hides resources and efficiency for app-filtered comparisons", () => {
    const result = buildComparisonResult({
      block: { id: "uber", type: "custom", startDate: "2026-06-15", endDate: "2026-06-17" },
      weeks: [currentWeek],
      appFilter: "Uber",
    });

    expect(result.metrics.earnings).toBe(225);
    expect(result.metrics.hours).toBeNull();
    expect(result.metrics.miles).toBeNull();
    expect(result.metrics.rides).toBeNull();
    expect(result.metrics.earningsPerHour).toBeNull();
  });

  it("only reports goal progress for a tracked week selection", () => {
    const exact = buildComparisonResult({
      block: { id: "week", type: "week", startDate: "2026-06-15", endDate: "2026-06-21" },
      weeks: [currentWeek],
    });
    const partial = buildComparisonResult({
      block: { id: "partial", type: "custom", startDate: "2026-06-15", endDate: "2026-06-17" },
      weeks: [currentWeek],
    });
    const currentWeekToDate = buildComparisonResult({
      block: { id: "week-to-date", type: "week", startDate: "2026-06-15", endDate: "2026-06-17" },
      weeks: [currentWeek],
    });

    expect(exact.metrics.earningsGoalProgress).toBe(22.5);
    expect(exact.metrics.hoursGoalProgress).toBe(12.5);
    expect(currentWeekToDate.metrics.earningsGoalProgress).toBe(22.5);
    expect(partial.metrics.earningsGoalProgress).toBeNull();
  });

  it("creates same-point default blocks for current and previous weeks", () => {
    const blocks = buildDefaultComparisonBlocks([priorWeek, currentWeek], new Date(2026, 5, 17, 12));
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toMatchObject({ startDate: "2026-06-15", endDate: "2026-06-17" });
    expect(blocks[1]).toMatchObject({ startDate: "2026-06-08", endDate: "2026-06-10" });
  });

  it("builds deterministic comparison insights", () => {
    const data = buildComparisonData({
      blocks: [
        { id: "prior", type: "custom", label: "Prior", startDate: "2026-06-08", endDate: "2026-06-10" },
        { id: "current", type: "custom", label: "Current", startDate: "2026-06-15", endDate: "2026-06-17" },
      ],
      weeks: [priorWeek, currentWeek],
    });
    expect(data.results).toHaveLength(2);
    expect(data.insights[0]).toContain("Prior earned the most");
  });
});
