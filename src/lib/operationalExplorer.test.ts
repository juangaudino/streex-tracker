import { describe, expect, it } from "vitest";
import { buildOperationalExplorerData } from "./operationalExplorer";
import type { WeekRecord } from "./types";

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
});
