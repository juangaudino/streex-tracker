import { describe, expect, it } from "vitest";
import { buildEarningsCsv } from "./dataExport";
import type { WeekRecord } from "./types";

describe("buildEarningsCsv", () => {
  it("exports one day per row with safe defaults and valid CSV escaping", () => {
    const weeks: WeekRecord[] = [
      {
        id: "week-1",
        startDate: "2026-05-04",
        endDate: "2026-05-10",
        weeklyGoal: 1200,
        status: "closed",
        createdAt: "2026-05-04T00:00:00.000Z",
        updatedAt: "2026-05-10T00:00:00.000Z",
        entries: [
          {
            dayName: "Monday",
            date: "2026-05-04",
            apps: {
              Uber: 120.5,
              "Spark Driver": 30.25,
              "Custom, App": 10,
            },
            mileage: 14.75,
            dayClosed: true,
          },
        ],
      },
    ];

    const csv = buildEarningsCsv(weeks);

    expect(csv).toContain("date,weekStartDate,dayName,totalEarnings");
    expect(csv).toContain('"Custom, App"');
    expect(csv).toContain("2026-05-04,2026-05-04,Monday,160.75,120.5,0,30.25");
    expect(csv).toContain("14.75,true");
  });
});
