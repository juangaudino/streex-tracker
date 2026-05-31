import { describe, expect, it } from "vitest";
import { buildPatternIntelligence, getDayMiles, getWeekMiles, shiftDurationHours } from "./shiftIntelligence";
import type { DayEntry, WeekRecord } from "./types";
import { DAY_NAMES } from "./types";

function day(index: number, total: number, shifts: DayEntry["shifts"] = [], mileage?: number): DayEntry {
  return {
    dayName: DAY_NAMES[index],
    date: `2026-05-${String(4 + index).padStart(2, "0")}`,
    logged: total > 0,
    apps: { Uber: total * 0.6, "Spark Driver": total * 0.4 },
    shifts,
    mileage,
  };
}

function week(entries: DayEntry[]): WeekRecord {
  return {
    id: "w1",
    startDate: "2026-05-04",
    endDate: "2026-05-10",
    weeklyGoal: 1000,
    status: "open",
    entries,
    createdAt: "2026-05-04T00:00:00.000Z",
    updatedAt: "2026-05-04T00:00:00.000Z",
  };
}

describe("shift intelligence", () => {
  it("calculates shift duration and mileage from manual shifts", () => {
    const shift = {
      id: "s1",
      startTime: "2026-05-04T08:00:00",
      endTime: "2026-05-04T11:30:00",
      miles: 42,
    };
    const d = day(0, 220, [shift], 10);

    expect(shiftDurationHours(shift)).toBe(3.5);
    expect(getDayMiles(d)).toBe(42);
    expect(getWeekMiles(week([d]))).toBe(42);
  });

  it("builds pattern intelligence from completed shifts", () => {
    const weeks = [
      week([
        day(0, 240, [{ id: "s1", startTime: "2026-05-04T08:00:00", endTime: "2026-05-04T10:00:00", miles: 24 }]),
        day(1, 180, [{ id: "s2", startTime: "2026-05-05T18:00:00", endTime: "2026-05-05T20:00:00", miles: 18 }]),
        day(2, 260, [{ id: "s3", startTime: "2026-05-06T08:00:00", endTime: "2026-05-06T10:00:00", miles: 22 }]),
        day(3, 0),
        day(4, 0),
        day(5, 0),
        day(6, 0),
      ]),
    ];

    const result = buildPatternIntelligence(weeks);

    expect(result.hasEnoughShiftData).toBe(true);
    expect(result.summary.totalHours).toBe(6);
    expect(result.summary.totalMiles).toBe(64);
    expect(result.summary.earningsPerHour).toBeCloseTo(113.33);
    expect(result.strongestHours.length).toBeGreaterThan(0);
    expect(result.bestAppsByHour.length).toBeGreaterThan(0);
  });
});
