import { describe, expect, it } from "vitest";
import {
  buildDriverIdentitySummary,
  buildXpEventsFromWeeks,
  calculateArchetypes,
  getHistoricalDayRanking,
  getIdealWeekComparison,
  getLevelProgress,
  XP_EVENT_TYPES,
} from "./driverIdentity";
import type { DayEntry, WeekRecord } from "./types";
import { DAY_NAMES } from "./types";

function day(dayName: DayEntry["dayName"], date: string, total: number, closed = false): DayEntry {
  return {
    dayName,
    date,
    logged: total > 0,
    dayClosed: closed,
    apps: {
      Uber: total,
      Lyft: 0,
      "Spark Driver": 0,
    },
  };
}

function week(id: string, startDate: string, totals: number[], status: WeekRecord["status"] = "closed"): WeekRecord {
  const start = new Date(`${startDate}T00:00:00`);
  const entries = totals.map((total, index) => {
    const d = new Date(start);
    d.setDate(start.getDate() + index);
    return day(DAY_NAMES[index], d.toISOString().slice(0, 10), total, total > 0);
  });
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return {
    id,
    startDate,
    endDate: end.toISOString().slice(0, 10),
    weeklyGoal: 1000,
    status,
    entries,
    createdAt: `${startDate}T00:00:00.000Z`,
    updatedAt: `${startDate}T00:00:00.000Z`,
  };
}

describe("driver identity engine", () => {
  it("generates idempotent XP event keys", () => {
    const events = buildXpEventsFromWeeks([
      week("w1", "2026-05-04", [100, 120, 140, 0, 350, 0, 0]),
    ]);
    const keys = events.map((event) => event.eventKey);

    expect(new Set(keys).size).toBe(keys.length);
    expect(events.some((event) => event.eventType === XP_EVENT_TYPES.DAY_OPENED)).toBe(true);
    expect(events.some((event) => event.eventType === XP_EVENT_TYPES.DAILY_RECORD)).toBe(true);
  });

  it("calculates cumulative driver levels", () => {
    expect(getLevelProgress(0).currentLevel).toBe("Rookie");
    expect(getLevelProgress(800).currentLevel).toBe("Steady Grinder");
    expect(getLevelProgress(10000).currentLevel).toBe("Streex Legend");
    expect(getLevelProgress(10000).xpToNext).toBe(0);
  });

  it("keeps archetypes locked until enough history exists", () => {
    const result = calculateArchetypes([
      week("w1", "2026-05-04", [100, 0, 0, 0, 0, 0, 0]),
    ]);

    expect(result.locked).toBe(true);
    expect(result.primary).toBeNull();
  });

  it("ranks the current day against the same weekday", () => {
    const weeks = [
      week("w1", "2026-05-04", [100, 0, 0, 0, 0, 0, 0]),
      week("w2", "2026-05-11", [200, 0, 0, 0, 0, 0, 0]),
      week("w3", "2026-05-18", [150, 0, 0, 0, 0, 0, 0], "open"),
    ];

    const ranking = getHistoricalDayRanking(weeks, weeks[2], "2026-05-18");

    expect(ranking?.rank).toBe(2);
    expect(ranking?.sampleSize).toBe(3);
  });

  it("builds an ideal week from best weekday totals", () => {
    const weeks = [
      week("w1", "2026-05-04", [100, 200, 300, 400, 500, 0, 0]),
      week("w2", "2026-05-11", [150, 100, 200, 300, 450, 50, 0], "open"),
    ];

    const ideal = getIdealWeekComparison(weeks, weeks[1]);

    expect(ideal?.availableWeekdays).toBe(6);
    expect(ideal?.idealWeekTotal).toBe(1600);
  });

  it("keeps day off framing neutral in the summary", () => {
    const weeks = [week("w1", "2026-05-04", [0, 0, 0, 0, 0, 0, 0], "open")];
    const summary = buildDriverIdentitySummary(weeks, weeks[0], [], "2026-05-04");

    expect(summary.totalXp).toBe(0);
    expect(summary.level.currentLevel).toBe("Rookie");
  });
});
