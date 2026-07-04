import { describe, expect, it } from "vitest";
import type { DayEntry, ShiftSession } from "./types";
import { DAY_NAMES } from "./types";
import {
  applyAccumulatedDayMileage,
  getAccumulatedDayMileage,
  getEffectiveShiftMiles,
  replaceShiftMileage,
} from "./mileageAttribution";

function shift(id: string, value?: number): ShiftSession {
  return { id, startTime: `2026-07-03T${id === "s1" ? "08" : "12"}:00:00`, miles: value };
}

function day(shifts: ShiftSession[], mileage?: number): DayEntry {
  return { dayName: DAY_NAMES[4], date: "2026-07-03", apps: { Uber: 0 }, shifts, mileage };
}

describe("mileage attribution", () => {
  it("recognizes previously stored cumulative shift mileage", () => {
    const friday = day([shift("s1", 50), shift("s2", 115.9)], 115.9);

    expect(getAccumulatedDayMileage(friday)).toBe(115.9);
    expect(getEffectiveShiftMiles(friday)).toEqual([50, 65.9]);
  });

  it("converts accumulated day updates into active-shift differences", () => {
    const afterFirstShift = day([shift("s1", 50), shift("s2")], 50);
    const updated = applyAccumulatedDayMileage(afterFirstShift, "s2", 115.9);

    expect(updated.mileage).toBe(115.9);
    expect(updated.shifts?.map((item) => item.miles)).toEqual([50, 65.9]);

    const nextUpdate = applyAccumulatedDayMileage(updated, "s2", 120.9);
    expect(nextUpdate.shifts?.map((item) => item.miles)).toEqual([50, 70.9]);
  });

  it("normalizes an affected day before assigning mileage to a new shift", () => {
    const affected = day([shift("s1", 50), shift("s2", 115.9), shift("s3")], 115.9);
    const updated = applyAccumulatedDayMileage(affected, "s3", 130);

    expect(updated.shifts?.map((item) => item.miles)).toEqual([50, 65.9, 14.1]);
    expect(updated.mileage).toBe(130);
  });

  it("supports downward corrections without negative shift mileage", () => {
    const current = day([shift("s1", 50), shift("s2", 65.9)], 115.9);
    const corrected = applyAccumulatedDayMileage(current, "s2", 100);

    expect(corrected.shifts?.map((item) => item.miles)).toEqual([50, 50]);
    expect(corrected.mileage).toBe(100);
  });

  it("keeps manual per-shift edits and the day total synchronized", () => {
    const current = day([shift("s1", 50), shift("s2", 65.9)], 115.9);
    const corrected = replaceShiftMileage(current, "s2", 60);

    expect(corrected.shifts?.map((item) => item.miles)).toEqual([50, 60]);
    expect(corrected.mileage).toBe(110);
  });
});
