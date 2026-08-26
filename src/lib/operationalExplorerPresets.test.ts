import { describe, expect, it } from "vitest";
import { addOperationalExplorerPreset, normalizeOperationalExplorerPreset } from "./operationalExplorerPresets";

const preset = {
  id: "rush-hour",
  label: "  Weekday rush  ",
  createdAt: "2026-08-26T12:00:00.000Z",
  globalFilters: { timePreset: "last-30-days", app: "Uber", weekdays: ["Monday", "Tuesday"] },
  operationalFilters: { windowPreset: "custom", windowStart: "15:00", windowEnd: "19:00" },
};

describe("operational explorer presets", () => {
  it("normalizes a browser-stored view without accepting unknown filter modes", () => {
    const result = normalizeOperationalExplorerPreset({ ...preset, globalFilters: { ...preset.globalFilters, timePreset: "unknown" }, operationalFilters: { ...preset.operationalFilters, windowPreset: "unknown" } });
    expect(result).toMatchObject({ label: "Weekday rush", globalFilters: { timePreset: "all", app: "Uber" }, operationalFilters: { windowPreset: "all", windowStart: "15:00" } });
  });

  it("ignores malformed saved data", () => {
    expect(normalizeOperationalExplorerPreset({ label: "No filters" })).toBeNull();
  });

  it("replaces a saved view with the same label", () => {
    const first = normalizeOperationalExplorerPreset(preset)!;
    const replacement = normalizeOperationalExplorerPreset({ ...preset, id: "rush-hour-new", label: "weekday RUSH" })!;
    expect(addOperationalExplorerPreset([first], replacement)).toEqual([replacement]);
  });
});
