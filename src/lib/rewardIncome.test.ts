import { describe, expect, it } from "vitest";
import { appTotal, dayTotal } from "./store";
import { isRewardApp, normalizeLegacyBonusDay, operationalDayTotal, operationalWeekTotal, rewardDayTotal } from "./rewardIncome";
import type { DayEntry, WeekRecord } from "./types";

const day: DayEntry = {
  dayName: "Monday",
  date: "2026-06-01",
  logged: true,
  apps: {
    Uber: 100,
    Octopus: 25,
  },
};

describe("reward income classification", () => {
  it("keeps reward apps in real totals but excludes them from operational totals", () => {
    expect(isRewardApp("Octopus")).toBe(true);
    expect(isRewardApp(" Uber ")).toBe(false);
    expect(dayTotal(day)).toBe(125);
    expect(rewardDayTotal(day)).toBe(25);
    expect(operationalDayTotal(day)).toBe(100);
  });

  it("normalizes legacy Octopus entries into bonuses without changing the day total", () => {
    const before = dayTotal(day);
    const normalized = normalizeLegacyBonusDay(day);

    expect(normalized.apps.Octopus).toBe(0);
    expect(normalized.bonuses).toEqual([
      expect.objectContaining({
        app: "Octopus",
        amount: 25,
        source: "legacy_octopus",
      }),
    ]);
    expect(dayTotal(normalized)).toBe(before);
    expect(operationalDayTotal(normalized)).toBe(100);
    expect(rewardDayTotal(normalized)).toBe(25);
  });

  it("calculates operational week totals without reward income", () => {
    const week: WeekRecord = {
      id: "week",
      startDate: "2026-06-01",
      endDate: "2026-06-07",
      weeklyGoal: 1000,
      status: "open",
      entries: [
        day,
        { ...day, dayName: "Tuesday", date: "2026-06-02", apps: { Lyft: 80, Octopus: 25 } },
      ],
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z",
    };

    expect(operationalWeekTotal(week)).toBe(180);
  });

  it("counts manual bonuses in app and day totals while keeping operational earnings clean", () => {
    const bonusDay: DayEntry = {
      dayName: "Wednesday",
      date: "2026-06-03",
      apps: { Uber: 100, Lyft: 50 },
      bonuses: [{ id: "bonus_1", app: "Uber", amount: 25, source: "manual" }],
    };
    const week: WeekRecord = {
      id: "week",
      startDate: "2026-06-01",
      endDate: "2026-06-07",
      weeklyGoal: 1000,
      status: "open",
      entries: [bonusDay],
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z",
    };

    expect(dayTotal(bonusDay)).toBe(175);
    expect(appTotal(week, "Uber")).toBe(125);
    expect(operationalDayTotal(bonusDay)).toBe(150);
  });
});
