import { describe, expect, it } from "vitest";
import { formatVersionLabel } from "./changelog";
import { isVersionNewer } from "./appVersion";

describe("app version comparison", () => {
  it("only treats a newer configured alpha version as an update inside the alpha archive", () => {
    expect(isVersionNewer("5.7.9", "5.7.8")).toBe(true);
    expect(isVersionNewer("5.8.0", "5.7.8")).toBe(true);
    expect(isVersionNewer("5.7.8", "5.7.8")).toBe(false);
    expect(isVersionNewer("5.7.7", "5.7.8")).toBe(false);
  });

  it("accepts an optional v prefix", () => {
    expect(isVersionNewer("v5.7.9", "5.7.8")).toBe(true);
  });

  it("treats archived V5 alpha labels as older than the public beta baseline", () => {
    expect(isVersionNewer("5.7.9", "0.1.0")).toBe(false);
    expect(isVersionNewer("0.1.1", "0.1.0")).toBe(true);
    expect(isVersionNewer("1.0.0", "0.9.9")).toBe(true);
  });

  it("formats beta and archived alpha version labels", () => {
    expect(formatVersionLabel("0.1.0")).toBe("Beta 0.1.0");
    expect(formatVersionLabel("5.7.9")).toBe("Alpha v5.7.9");
    expect(formatVersionLabel("1.0.0")).toBe("v1.0.0");
  });
});
