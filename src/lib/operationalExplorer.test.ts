import { describe, expect, it } from "vitest";
import { buildOperationalExplorerData } from "./operationalExplorer";
import type { EarningsAttribution, EarningsSnapshot, WeekRecord } from "./types";

const week: WeekRecord = {
  id: "11111111-1111-1111-1111-111111111111",
  startDate: "2026-07-13",
  endDate: "2026-07-19",
  weeklyGoal: 1000,
  status: "closed",
  createdAt: "2026-07-13T00:00:00Z",
  updatedAt: "2026-07-17T00:00:00Z",
  entries: [{
    dayName: "Monday", date: "2026-07-13", apps: { Uber: 100 }, mileage: 40,
    shifts: [{ id: "s1", startTime: "2026-07-13T09:00:00", endTime: "2026-07-13T13:00:00", earnings: 100, miles: 40, rideCount: 8, ridesByApp: { Uber: 8 } }],
  }],
};

describe("operational explorer", () => {
  it("weights totals from exact shift overlap instead of averaging rates", () => {
    const data = buildOperationalExplorerData({ weeks: [week], globalFilters: { timePreset: "all", app: "all", weekdays: [] }, operationalFilters: { windowPreset: "morning" } });
    expect(data.totals.hours).toBe(3);
    expect(data.totals.earnings).toBe(75);
    expect(data.totals.earningsPerHour).toBe(25);
    expect(data.source).toBe("Estimated");
  });

  it("uses app contribution language without inventing app online hours", () => {
    const data = buildOperationalExplorerData({ weeks: [week], globalFilters: { timePreset: "all", app: "Uber", weekdays: ["Monday"] }, operationalFilters: { windowPreset: "all" } });
    expect(data.totals.hours).toBe(4);
    expect(data.totals.earningsPerHour).toBe(25);
    expect(data.totals.ridesPerHour).toBe(2);
  });

  it("honors 15-minute custom windows", () => {
    const data = buildOperationalExplorerData({ weeks: [week], globalFilters: { timePreset: "all", app: "all", weekdays: [] }, operationalFilters: { windowPreset: "custom", windowStart: "09:15", windowEnd: "10:45" } });
    expect(data.totals.hours).toBe(1.5);
    expect(data.totals.earnings).toBe(37.5);
  });

  it("does not duplicate a day app total across multiple shifts", () => {
    const multi: WeekRecord = { ...week, entries: [{ ...week.entries[0], apps: { Uber: 120 }, shifts: [
      { id: "s1", startTime: "2026-07-13T09:00:00", endTime: "2026-07-13T11:00:00", rideCount: 4, ridesByApp: { Uber: 4 } },
      { id: "s2", startTime: "2026-07-13T14:00:00", endTime: "2026-07-13T16:00:00", rideCount: 4, ridesByApp: { Uber: 4 } },
    ] }] };
    const data = buildOperationalExplorerData({ weeks: [multi], globalFilters: { timePreset: "all", app: "Uber", weekdays: [] }, operationalFilters: { windowPreset: "all" } });
    expect(data.totals.earnings).toBe(120);
    expect(data.totals.earningsPerHour).toBe(30);
  });

  it("keeps a post-shift update out of hourly performance until it is attributed", () => {
    const closedAtEighty: WeekRecord = {
      ...week,
      entries: [{
        ...week.entries[0],
        shifts: [{ ...week.entries[0].shifts![0], earnings: 80 }],
      }],
    };
    const snapshot: EarningsSnapshot = {
      id: "late", userId: "u1", weekId: closedAtEighty.id, dayDate: "2026-07-13", app: "Uber",
      previousAmount: 80, newAmount: 100, delta: 20, shiftId: null, createdAt: "2026-07-13T20:00:00",
    };
    const pending = buildOperationalExplorerData({
      weeks: [closedAtEighty], earningsSnapshots: [snapshot],
      globalFilters: { timePreset: "all", app: "all", weekdays: [] }, operationalFilters: { windowPreset: "all" },
    });
    expect(pending.totals.earnings).toBe(80);
    expect(pending.hourly.find((item) => item.hour === 20)?.earnings).toBe(0);

    const attribution: EarningsAttribution = {
      id: "a1", userId: "u1", snapshotId: snapshot.id, amount: 20, status: "resolved", mode: "shift_distributed",
      attributedDayDate: "2026-07-13", shiftId: "s1", effectiveStartAt: "2026-07-13T09:00:00", effectiveEndAt: "2026-07-13T13:00:00",
      source: "user", confidence: "estimated", createdAt: "2026-07-14T00:00:00Z", updatedAt: "2026-07-14T00:00:00Z",
    };
    const resolved = buildOperationalExplorerData({
      weeks: [closedAtEighty], earningsSnapshots: [snapshot], earningsAttributions: [attribution],
      globalFilters: { timePreset: "all", app: "all", weekdays: [] }, operationalFilters: { windowPreset: "all" },
    });
    expect(resolved.totals.earnings).toBe(100);
    expect(resolved.hourly.find((item) => item.hour === 20)?.earnings).toBe(0);
  });
});
