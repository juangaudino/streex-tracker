export type DashboardExperience = "standard" | "full-focus";

export const DASHBOARD_EXPERIENCE_KEY = "streex_dashboard_experience_v1";
export const DASHBOARD_EXPERIENCE_EVENT = "streex-dashboard-experience-change";

export function readDashboardExperience(): DashboardExperience {
  try {
    const value = localStorage.getItem(DASHBOARD_EXPERIENCE_KEY);
    return value === "full-focus" ? "full-focus" : "standard";
  } catch {
    return "standard";
  }
}

export function writeDashboardExperience(experience: DashboardExperience) {
  try {
    localStorage.setItem(DASHBOARD_EXPERIENCE_KEY, experience);
    window.dispatchEvent(new CustomEvent(DASHBOARD_EXPERIENCE_EVENT, { detail: experience }));
  } catch {
    // Local preference only.
  }
}
