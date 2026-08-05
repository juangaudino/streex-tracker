import { describe, expect, it } from "vitest";
import { buildDayPerformanceComparison, dayPerformanceSignalLabel } from "./weekdayPerformance";
import type { DayEntry, WeekRecord } from "./types";

function tuesday(date: string, earnings: number, start: string, end?: string): DayEntry {
  return {
    dayName: "Tuesday",
    date,
    apps: { Uber: earnings },
    logged: true,
    shifts: [{
      id: `shift-${date}`,
      startTime: `${date}T${start}:00`,
      endTime: end ? `${date}T${end}:00` : undefined,
      blocks: [{ id: `block-${date}`, startTime: `${date}T${start}:00`, endTime: end ? `${date}T${end}:00` : undefined }],
    }],
  };
}

function week(id: string, entries: DayEntry[]): WeekRecord {
  return {
    id,
    startDate: entries[0].date,
    endDate: entries[0].date,
    weeklyGoal: 1000,
    status: "closed",
    entries,
    createdAt: `${entries[0].date}T00:00:00Z`,
    updatedAt: `${entries[0].date}T23:59:00Z`,
  };
}

describe("weekday output and efficiency", () => {
  it("recognizes a short high-rate day without calling its lower total poor performance", () => {
    const current = tuesday("2026-08-04", 110, "08:00", undefined);
    const historyA = tuesday("2026-07-21", 200, "08:00", "16:00");
    const historyB = tuesday("2026-07-28", 160, "09:00", "15:00");
    const weeks = [week("current", [current]), week("a", [historyA]), week("b", [historyB])];

    const result = buildDayPerformanceComparison({
      day: current,
      weeks,
      historicalAverageTotal: 180,
      now: new Date("2026-08-04T11:00:00"),
    });

    expect(result.currentEarningsPerHour).toBeCloseTo(36.67);
    expect(result.historicalEarningsPerHour).toBeCloseTo(25.71);
    expect(result.representedHistoricalDays).toBe(2);
    expect(result.signal).toBe("short-efficient");
    expect(dayPerformanceSignalLabel(result.signal)).toBe("Short day, strong efficiency");
  });

  it("weights the historical rate by represented hours instead of averaging daily rates", () => {
    const current = tuesday("2026-08-04", 100, "08:00", "12:00");
    const oneHour = tuesday("2026-07-21", 100, "08:00", "09:00");
    const nineHours = tuesday("2026-07-28", 180, "08:00", "17:00");
    const weeks = [week("current", [current]), week("short", [oneHour]), week("long", [nineHours])];

    const result = buildDayPerformanceComparison({ day: current, weeks, historicalAverageTotal: 140 });

    expect(result.historicalEarningsPerHour).toBe(28);
  });
});
