import { describe, expect, it } from "vitest";
import { buildCareerDrillDownData } from "./careerDrillDowns";
import type { DayEntry, WeekRecord } from "./types";

function day(date: string, dayName: DayEntry["dayName"], apps: Record<string, number>): DayEntry {
  return { date, dayName, apps };
}

function week(id: string, startDate: string, entries: DayEntry[]): WeekRecord {
  return {
    id,
    startDate,
    endDate: entries.at(-1)?.date ?? startDate,
    weeklyGoal: 1000,
    status: "closed",
    entries,
    createdAt: `${startDate}T00:00:00.000Z`,
    updatedAt: `${startDate}T00:00:00.000Z`,
  };
}

const weeks = [
  week("jan", "2026-01-05", [
    day("2026-01-05", "Monday", { Uber: 100, Lyft: 20 }),
    day("2026-01-06", "Tuesday", { Uber: 80, Lyft: 0 }),
  ]),
  week("may", "2026-05-04", [
    day("2026-05-01", "Monday", { Uber: 200, Lyft: 50 }),
    day("2026-05-02", "Tuesday", { Uber: 150, Lyft: 50 }),
  ]),
  week("jun", "2026-06-01", [
    day("2026-06-01", "Monday", { Uber: 300, Lyft: 0 }),
    day("2026-06-02", "Tuesday", { Uber: 100, Lyft: 100 }),
  ]),
];

describe("buildCareerDrillDownData", () => {
  it("builds provisional monthly rank and same-point context", () => {
    const result = buildCareerDrillDownData(weeks, new Date(2026, 5, 2));

    expect(result.monthly.currentTotal).toBe(500);
    expect(result.monthly.previousTotal).toBe(450);
    expect(result.monthly.previousSamePointTotal).toBe(450);
    expect(result.monthly.provisionalRank).toBe(1);
    expect(result.monthly.topMonths[0]).toMatchObject({ key: "2026-06", total: 500, isCurrent: true });
  });

  it("returns deterministic day, week, app, and weekday rankings", () => {
    const result = buildCareerDrillDownData(weeks, new Date(2026, 5, 2));

    expect(result.topDays[0]).toMatchObject({ date: "2026-06-01", total: 300 });
    expect(result.topWeeks[0]).toMatchObject({ id: "jun", total: 500 });
    expect(result.rankedWeeks).toBe(3);
    expect(result.apps[0]).toMatchObject({ app: "Uber", total: 930 });
    expect(result.weekdays[0]).toMatchObject({ dayName: "Monday", count: 3 });
  });

  it("keeps bonus earnings in the app and money story", () => {
    const bonusWeeks = [week("bonus", "2026-06-01", [{
      ...day("2026-06-01", "Monday", { Uber: 100 }),
      bonuses: [{ id: "b1", app: "Uber", amount: 25 }],
    }])];

    const result = buildCareerDrillDownData(bonusWeeks, new Date(2026, 5, 1));
    expect(result.monthly.currentTotal).toBe(125);
    expect(result.apps[0]).toMatchObject({ app: "Uber", total: 125, share: 100 });
  });
});
