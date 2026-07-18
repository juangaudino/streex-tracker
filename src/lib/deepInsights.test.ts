import { describe, expect, it } from "vitest";
import { buildDeepInsightsData } from "./deepInsights";
import type { DayEntry, EarningsSnapshot, WeekRecord } from "./types";
import { DAY_NAMES } from "./types";

function day(index: number, date: string, apps: DayEntry["apps"], extras: Partial<DayEntry> = {}): DayEntry {
  return {
    dayName: DAY_NAMES[index],
    date,
    logged: Object.values(apps).some((value) => Number(value) > 0),
    apps,
    ...extras,
  };
}

function week(id: string, startDate: string, endDate: string, entries: DayEntry[]): WeekRecord {
  return {
    id,
    startDate,
    endDate,
    weeklyGoal: 1000,
    weeklyHoursGoal: 45,
    status: "open",
    entries,
    createdAt: `${startDate}T00:00:00.000Z`,
    updatedAt: `${endDate}T00:00:00.000Z`,
  };
}

function snapshot(id: string, weekId: string, dayDate: string, shiftId: string, delta: number): EarningsSnapshot {
  return {
    id,
    userId: "user-1",
    weekId,
    dayDate,
    app: "Uber",
    previousAmount: 0,
    newAmount: delta,
    delta,
    shiftId,
    createdAt: `${dayDate}T18:00:00.000Z`,
  };
}

describe("deep insights", () => {
  const shift = { id: "shift-1", startTime: "2026-06-01T10:00:00", endTime: "2026-06-01T14:00:00", miles: 80, rideCount: 8 };
  const weeks = [
    week("w1", "2026-06-01", "2026-06-07", [
      day(0, "2026-06-01", { Uber: 100, Octopus: 25 }, {
        bonuses: [{ id: "b1", app: "Uber", amount: 20 }],
        shifts: [shift],
      }),
      day(1, "2026-06-02", { Lyft: 60 }),
      day(2, "2026-06-03", { Uber: 40 }),
      day(3, "2026-06-04", {}),
      day(4, "2026-06-05", {}),
      day(5, "2026-06-06", {}),
      day(6, "2026-06-07", {}),
    ]),
    week("w2", "2026-06-08", "2026-06-14", [
      day(0, "2026-06-08", { Uber: 200 }),
      day(1, "2026-06-09", {}),
      day(2, "2026-06-10", {}),
      day(3, "2026-06-11", {}),
      day(4, "2026-06-12", {}),
      day(5, "2026-06-13", {}),
      day(6, "2026-06-14", {}),
    ]),
  ];

  it("keeps bonuses in earnings totals while excluding reward income from hourly efficiency", () => {
    const result = buildDeepInsightsData({
      weeks,
      earningsSnapshots: [],
      filters: { timePreset: "all", app: "all", weekdays: [] },
      now: new Date("2026-06-15T12:00:00"),
    });

    expect(result.totals.earnings).toBe(445);
    expect(result.totals.operationalEarnings).toBe(400);
    expect(result.totals.hours).toBe(4);
    expect(result.totals.earningsPerHour).toBe(100);
  });

  it("applies app filters without inventing app-specific hourly metrics", () => {
    const result = buildDeepInsightsData({
      weeks,
      earningsSnapshots: [],
      filters: { timePreset: "all", app: "Uber", weekdays: [] },
      now: new Date("2026-06-15T12:00:00"),
    });

    expect(result.totals.earnings).toBe(360);
    expect(result.totals.hours).toBe(0);
    expect(result.totals.earningsPerHour).toBeNull();
    expect(result.appFilterActive).toBe(true);
  });

  it("filters the entire dataset by date preset and weekday", () => {
    const result = buildDeepInsightsData({
      weeks,
      earningsSnapshots: [],
      filters: { timePreset: "last-7-days", app: "all", weekdays: ["Monday"] },
      now: new Date("2026-06-14T12:00:00"),
    });

    expect(result.days.map((entry) => entry.date)).toEqual(["2026-06-08"]);
    expect(result.totals.earnings).toBe(200);
    expect(result.weeks).toHaveLength(1);
  });

  it("only ranks shifts when shift earnings can be resolved", () => {
    const result = buildDeepInsightsData({
      weeks,
      earningsSnapshots: [snapshot("snap-1", "w1", "2026-06-01", "shift-1", 100)],
      filters: { timePreset: "all", app: "all", weekdays: [] },
      now: new Date("2026-06-15T12:00:00"),
    });

    expect(result.bestShifts).toHaveLength(1);
    expect(result.bestShifts[0]).toMatchObject({ id: "shift-1", earnings: 100, rate: 25, source: "snapshot" });
  });

  it("builds shift intelligence from completed shifts without inventing unresolved earnings", () => {
    const shifts = [
      { id: "short-1", startTime: "2026-06-01T08:00:00", endTime: "2026-06-01T10:00:00", miles: 40, rideCount: 4 },
      { id: "short-2", startTime: "2026-06-01T11:00:00", endTime: "2026-06-01T13:00:00", miles: 50, rideCount: 6 },
      { id: "long-1", startTime: "2026-06-01T14:00:00", endTime: "2026-06-01T20:00:00", miles: 120, rideCount: 12 },
    ];
    const intelligenceWeeks = [week("intelligence", "2026-06-01", "2026-06-07", [
      day(0, "2026-06-01", { Uber: 260 }, { shifts }),
      ...DAY_NAMES.slice(1).map((_, index) => day(index + 1, `2026-06-0${index + 2}`, {})),
    ])];
    const snapshots = [
      snapshot("short-snap-1", "intelligence", "2026-06-01", "short-1", 60),
      snapshot("short-snap-2", "intelligence", "2026-06-01", "short-2", 80),
    ];

    const result = buildDeepInsightsData({
      weeks: intelligenceWeeks,
      earningsSnapshots: snapshots,
      filters: { timePreset: "all", app: "all", weekdays: [] },
      now: new Date("2026-06-15T12:00:00"),
    });

    expect(result.shiftIntelligence).toMatchObject({
      completedShifts: 3,
      resolvedShifts: 2,
      earningsCoverage: 66.67,
      averageDuration: 3.33,
      ridesPerHour: 2.2,
      milesPerHour: 21,
    });
    expect(result.shiftIntelligence.strongestPattern).toMatchObject({ id: "short", shifts: 2, earningsPerHour: 35 });
    expect(result.shiftIntelligence.patterns.find((pattern) => pattern.id === "long")).toMatchObject({ shifts: 0, earningsPerHour: null });
    expect(result.shiftIntelligence.unresolvedShifts).toEqual([
      {
        id: "long-1",
        date: "2026-06-01",
        dayName: "Monday",
        label: "2:00 PM → 8:00 PM",
        hours: 6,
        reason: "Multi-shift day without assigned shift earnings",
      },
    ]);
    expect(result.shiftIntelligence.signals.some((signal) => signal.includes("2 of 3"))).toBe(true);
  });
});
