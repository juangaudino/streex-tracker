import { describe, expect, it } from "vitest";
import { dayTotal, formatDate } from "./store";
import type { DayEntry } from "./types";

describe("store date helpers", () => {
  it("formats dates from local calendar parts", () => {
    expect(formatDate(new Date(2026, 4, 31, 23, 30))).toBe("2026-05-31");
  });

  it("keeps daily notes outside earnings calculations", () => {
    const day: DayEntry = {
      dayName: "Monday",
      date: "2026-06-15",
      apps: { Uber: 120.5, Lyft: 30 },
      notes: "Stopped early because I was sick.",
    };

    expect(dayTotal(day)).toBe(150.5);
    expect(dayTotal({ ...day, notes: undefined })).toBe(150.5);
  });
});
