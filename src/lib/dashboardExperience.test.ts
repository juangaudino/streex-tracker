import { describe, expect, it, beforeEach } from "vitest";
import { DASHBOARD_EXPERIENCE_KEY, readDashboardExperience, writeDashboardExperience } from "./dashboardExperience";

describe("dashboard experience preference", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to standard", () => {
    expect(readDashboardExperience()).toBe("standard");
  });

  it("persists full focus locally", () => {
    writeDashboardExperience("full-focus");
    expect(localStorage.getItem(DASHBOARD_EXPERIENCE_KEY)).toBe("full-focus");
    expect(readDashboardExperience()).toBe("full-focus");
  });

  it("falls back to standard for unknown values", () => {
    localStorage.setItem(DASHBOARD_EXPERIENCE_KEY, "cosmic");
    expect(readDashboardExperience()).toBe("standard");
  });
});
