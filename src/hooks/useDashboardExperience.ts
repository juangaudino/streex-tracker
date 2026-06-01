import { useEffect, useState } from "react";
import {
  DASHBOARD_EXPERIENCE_EVENT,
  readDashboardExperience,
  writeDashboardExperience,
  type DashboardExperience,
} from "@/lib/dashboardExperience";

export function useDashboardExperience() {
  const [experience, setExperienceState] = useState<DashboardExperience>(() => readDashboardExperience());

  useEffect(() => {
    const sync = () => setExperienceState(readDashboardExperience());
    window.addEventListener(DASHBOARD_EXPERIENCE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(DASHBOARD_EXPERIENCE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  function setDashboardExperience(next: DashboardExperience) {
    setExperienceState(next);
    writeDashboardExperience(next);
  }

  return {
    dashboardExperience: experience,
    setDashboardExperience,
    isFullFocus: experience === "full-focus",
  };
}
