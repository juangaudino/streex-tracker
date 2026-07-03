import { describe, expect, it } from "vitest";
import type { ShiftSession } from "./types";
import {
  formatRideAttribution,
  getUnattributedRideCount,
  replaceShiftTotalRideCount,
  updateShiftAppRideCount,
} from "./rideAttribution";

const shift = (rides: number = 0): ShiftSession => ({
  id: "shift-1",
  startTime: "2026-07-03T08:00:00",
  rideCount: rides,
});

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
});
