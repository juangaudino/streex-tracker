import { describe, expect, it } from "vitest";
import type { DayEntry, ShiftSession } from "./types";
import {
  applyAccumulatedDayAppRideCount,
  formatRideAttribution,
  getDayAppRideCount,
  getDayUnattributedRideCount,
  getUnattributedRideCount,
  replaceShiftTotalRideCount,
  updateShiftAppRideCount,
} from "./rideAttribution";
import { getDayRideCount } from "./shiftIntelligence";

const shift = (rides: number = 0): ShiftSession => ({
  id: "shift-1",
  startTime: "2026-07-03T08:00:00",
  rideCount: rides,
});

function dayWithShifts(shifts: ShiftSession[]): DayEntry {
  return { dayName: "Friday", date: "2026-07-03", apps: { Uber: 0, Lyft: 0 }, shifts };
}

describe("ride attribution", () => {
  it("combines app-specific accumulated counts into the shift total", () => {
    const uber = updateShiftAppRideCount(shift(), "Uber", 4);
    const lyft = updateShiftAppRideCount(uber.shift, "Lyft", 1);

    expect(lyft.shift.ridesByApp).toEqual({ Uber: 4, Lyft: 1 });
    expect(lyft.shift.rideCount).toBe(5);
    expect(formatRideAttribution(lyft.shift)).toBe("Uber 4 · Lyft 1");
    expect(uber.appRideDelta).toBe(4);
    expect(lyft.appRideDelta).toBe(1);
  });

  it("uses accumulated app totals instead of adding the full value again", () => {
    const first = updateShiftAppRideCount(shift(), "Uber", 4);
    const second = updateShiftAppRideCount(first.shift, "Uber", 5);

    expect(second.shift.rideCount).toBe(5);
    expect(second.appRideDelta).toBe(1);
  });

  it("preserves a legacy total and suppresses retroactive app rewards", () => {
    const firstAttribution = updateShiftAppRideCount(shift(5), "Uber", 4);

    expect(firstAttribution.shift.rideCount).toBe(5);
    expect(firstAttribution.shift.legacyRideCount).toBe(5);
    expect(firstAttribution.appRideDelta).toBe(0);
    expect(getUnattributedRideCount(firstAttribution.shift)).toBe(1);
    expect(formatRideAttribution(firstAttribution.shift)).toBe("Uber 4 · Unattributed 1");

    const completedAttribution = updateShiftAppRideCount(firstAttribution.shift, "Lyft", 1);
    expect(completedAttribution.shift.rideCount).toBe(5);
    expect(getUnattributedRideCount(completedAttribution.shift)).toBe(0);
  });

  it("manual total editing resets unsafe app attribution", () => {
    const attributed = updateShiftAppRideCount(shift(), "Uber", 4).shift;
    const replaced = replaceShiftTotalRideCount(attributed, 6);

    expect(replaced.rideCount).toBe(6);
    expect(replaced.ridesByApp).toBeUndefined();
    expect(replaced.legacyRideCount).toBe(6);
  });

  it("assigns only a daily app-total delta to a second shift", () => {
    const first = updateShiftAppRideCount({ ...shift(), id: "first", startTime: "2026-07-03T08:00:00" }, "Uber", 10).shift;
    const second = { ...shift(), id: "second", startTime: "2026-07-03T13:00:00" };
    const update = applyAccumulatedDayAppRideCount(dayWithShifts([first, second]), "second", "Uber", 11);

    expect(update.appRideDelta).toBe(1);
    expect(getDayAppRideCount(update.day, "Uber")).toBe(11);
    expect(update.day.shifts?.[0].ridesByApp).toEqual({ Uber: 10 });
    expect(update.day.shifts?.[1].ridesByApp).toEqual({ Uber: 1 });
    expect(getDayRideCount(update.day)).toBe(11);
  });

  it("keeps app totals independent across multiple shifts", () => {
    const first = updateShiftAppRideCount({ ...shift(), id: "first", startTime: "2026-07-03T08:00:00" }, "Uber", 10).shift;
    const withLyft = updateShiftAppRideCount(first, "Lyft", 2).shift;
    const second = { ...shift(), id: "second", startTime: "2026-07-03T13:00:00" };
    const uberUpdate = applyAccumulatedDayAppRideCount(dayWithShifts([withLyft, second]), "second", "Uber", 11);
    const lyftUpdate = applyAccumulatedDayAppRideCount(uberUpdate.day, "second", "Lyft", 3);

    expect(getDayAppRideCount(lyftUpdate.day, "Uber")).toBe(11);
    expect(getDayAppRideCount(lyftUpdate.day, "Lyft")).toBe(3);
    expect(lyftUpdate.day.shifts?.[1].ridesByApp).toEqual({ Uber: 1, Lyft: 1 });
    expect(getDayRideCount(lyftUpdate.day)).toBe(14);
  });

  it("does not create a new ride delta when the daily total is repeated", () => {
    const first = updateShiftAppRideCount({ ...shift(), id: "first", startTime: "2026-07-03T08:00:00" }, "Uber", 10).shift;
    const second = updateShiftAppRideCount({ ...shift(), id: "second", startTime: "2026-07-03T13:00:00" }, "Uber", 1).shift;
    const day = dayWithShifts([first, second]);
    const update = applyAccumulatedDayAppRideCount(day, "second", "Uber", 11);

    expect(update.appRideDelta).toBe(0);
    expect(update.day).toBe(day);
  });

  it("removes a downward correction from the most recent known app rides first", () => {
    const first = updateShiftAppRideCount({ ...shift(), id: "first", startTime: "2026-07-03T08:00:00" }, "Uber", 10).shift;
    const second = updateShiftAppRideCount({ ...shift(), id: "second", startTime: "2026-07-03T13:00:00" }, "Uber", 2).shift;
    const update = applyAccumulatedDayAppRideCount(dayWithShifts([first, second]), "second", "Uber", 11);

    expect(update.appRideDelta).toBe(-1);
    expect(update.day.shifts?.[0].ridesByApp).toEqual({ Uber: 10 });
    expect(update.day.shifts?.[1].ridesByApp).toEqual({ Uber: 1 });
    expect(getDayRideCount(update.day)).toBe(11);
  });

  it("refuses to guess an app total when a prior shift has unattributed rides", () => {
    const legacy = { ...shift(10), id: "legacy", startTime: "2026-07-03T08:00:00" };
    const active = { ...shift(), id: "active", startTime: "2026-07-03T13:00:00" };
    const day = dayWithShifts([legacy, active]);
    const update = applyAccumulatedDayAppRideCount(day, "active", "Uber", 11);

    expect(getDayUnattributedRideCount(day)).toBe(10);
    expect(update.appRideDelta).toBe(0);
    expect(update.unattributedRideCount).toBe(10);
    expect(update.day).toBe(day);
  });
});
