import { describe, expect, it } from "vitest";
import { adjustOctopusPoints, octopusRewardProgress } from "@/lib/octopusRewards";

describe("Octopus reward progress", () => {
  it("adds and removes eligible Uber rides at 1.5 points each", () => {
    expect(adjustOctopusPoints(100, 4)).toBe(106);
    expect(adjustOctopusPoints(100, -3)).toBe(95.5);
  });

  it("never allows a negative balance", () => {
    expect(adjustOctopusPoints(1.5, -5)).toBe(0);
  });

  it("reports remaining rides and ready rewards", () => {
    expect(octopusRewardProgress(184).ridesRemaining).toBe(44);
    expect(octopusRewardProgress(250).rewardsReady).toBe(1);
    expect(octopusRewardProgress(500).rewardsReady).toBe(2);
  });
});
