import { describe, expect, it } from "vitest";
import { buildOperationalExplorerCsv } from "./operationalExplorerExport";
import type { OperationalExplorerData } from "./operationalExplorer";

const data: OperationalExplorerData = {
  totals: { earnings: 125.5, hours: 5, rides: 8, miles: 42, earningsPerHour: 25.1, ridesPerHour: 1.6, milesPerHour: 8.4, earningsPerMile: 2.99, earningsPerRide: 15.69, milesPerRide: 5.25, minutesPerRide: 37.5, shifts: 1, days: 1 },
  source: "Attributed", sampleLabel: "Reliable sample", coverage: 95, windowLabel: "Custom · 3 PM–7 PM",
  hourly: [{ hour: 17, label: "5 PM", hours: 1, earnings: 32, rides: 2, miles: 8, earningsPerHour: 32, ridesPerHour: 2, milesPerHour: 8, source: "Attributed" }],
  weekdays: [{ dayName: "Monday", days: 1, hours: 5, earnings: 125.5, rate: 25.1 }], heatmap: [], bestWindows: [], observations: [],
};

describe("operational explorer CSV export", () => {
  it("includes filter, evidence, summary, and profile context", () => {
    const csv = buildOperationalExplorerCsv({ data, globalFilters: { timePreset: "last-30-days", app: "Uber, Lyft", weekdays: ["Monday"] }, operationalFilters: { windowPreset: "custom", windowStart: "15:00", windowEnd: "19:00" }, exportedAt: new Date("2026-08-26T12:00:00.000Z") });
    expect(csv).toContain("evidence_source,Attributed");
    expect(csv).toContain('app,"Uber, Lyft"');
    expect(csv).toContain("earnings_per_hour,25.1");
    expect(csv).toContain("hour,label,worked_hours");
    expect(csv).toContain("17,5 PM,1,32");
  });
});
