import { useState, useCallback } from "react";
import {
  WeekRecord,
  AppSettings,
} from "@/lib/types";
import {
  getWeeks,
  saveWeeks,
  getSettings,
  saveSettings,
} from "@/lib/store";

export function useWeekStore() {
  const [weeks, setWeeks] = useState<WeekRecord[]>(getWeeks);
  const [settings, setSettingsState] = useState<AppSettings>(getSettings);

  const persist = useCallback((w: WeekRecord[]) => {
    setWeeks(w);
    saveWeeks(w);
  }, []);

  const updateSettings = useCallback((s: AppSettings) => {
    setSettingsState(s);
    saveSettings(s);
  }, []);

  const addWeek = useCallback(
    (w: WeekRecord) => {
      const updated = [...getWeeks(), w];
      persist(updated);
    },
    [persist]
  );

  const updateWeek = useCallback(
    (w: WeekRecord) => {
      const all = getWeeks();
      const idx = all.findIndex((x) => x.id === w.id);
      if (idx >= 0) {
        all[idx] = { ...w, updatedAt: new Date().toISOString() };
        persist(all);
      }
    },
    [persist]
  );

  const deleteWeek = useCallback(
    (id: string) => {
      persist(getWeeks().filter((w) => w.id !== id));
    },
    [persist]
  );

  const openWeek = weeks.find((w) => w.status === "open") || null;

  return {
    weeks,
    openWeek,
    settings,
    addWeek,
    updateWeek,
    deleteWeek,
    updateSettings,
    reload: () => setWeeks(getWeeks()),
  };
}