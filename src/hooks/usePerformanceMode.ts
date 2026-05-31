import { useEffect, useState } from "react";
import { readPerformanceMode, writePerformanceMode, type PerformanceMode } from "@/lib/performanceMode";

export function usePerformanceMode() {
  const [mode, setModeState] = useState<PerformanceMode>(() => readPerformanceMode());

  useEffect(() => {
    writePerformanceMode(mode);
  }, [mode]);

  return {
    performanceMode: mode,
    setPerformanceMode: setModeState,
  };
}
