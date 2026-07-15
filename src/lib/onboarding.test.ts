import { describe, expect, it } from "vitest";
import { isOnboardingComplete } from "./onboarding";

describe("isOnboardingComplete", () => {
  it("requires every first-run milestone", () => {
    expect(isOnboardingComplete({
      setupCompletedAt: "2026-07-14T00:00:00.000Z",
      firstWeekCompletedAt: "2026-07-14T00:00:00.000Z",
    })).toBe(false);
  });

  it("accepts a completed guided start", () => {
    expect(isOnboardingComplete({
      setupCompletedAt: "2026-07-14T00:00:00.000Z",
      firstWeekCompletedAt: "2026-07-14T00:00:00.000Z",
      firstActivityCompletedAt: "2026-07-14T00:00:00.000Z",
    })).toBe(true);
  });
});
