import { describe, expect, it } from "vitest";
import { dayTotal } from "./store";
import { isRewardApp, operationalDayTotal, operationalWeekTotal, rewardDayTotal } from "./rewardIncome";
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
});
