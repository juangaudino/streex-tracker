import { describe, expect, it } from "vitest";
import { isVersionNewer } from "./appVersion";

describe("app version comparison", () => {
  it("only treats a newer configured version as an update", () => {
    expect(isVersionNewer("5.7.9", "5.7.8")).toBe(true);
    expect(isVersionNewer("5.8.0", "5.7.8")).toBe(true);
    expect(isVersionNewer("5.7.8", "5.7.8")).toBe(false);
    expect(isVersionNewer("5.7.7", "5.7.8")).toBe(false);
  });

  it("accepts an optional v prefix", () => {
    expect(isVersionNewer("v5.7.9", "5.7.8")).toBe(true);
  });
});

