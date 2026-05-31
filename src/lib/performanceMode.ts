export type PerformanceMode = "simple" | "advanced";

export const PERFORMANCE_MODE_KEY = "streex_performance_mode_v1";

export function readPerformanceMode(): PerformanceMode {
  try {
    const value = localStorage.getItem(PERFORMANCE_MODE_KEY);
    return value === "advanced" ? "advanced" : "simple";
  } catch {
    return "simple";
  }
}

export function writePerformanceMode(mode: PerformanceMode) {
  try {
    localStorage.setItem(PERFORMANCE_MODE_KEY, mode);
  } catch {
    // Local preference only.
  }
}
