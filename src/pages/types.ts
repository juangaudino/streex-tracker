import type { WeekRecord, AppSettings } from "@/lib/types";

export interface StoreContext {
  weeks: WeekRecord[];
  openWeek: WeekRecord | null;
  settings: AppSettings;
  addWeek: (w: WeekRecord) => void;
  updateWeek: (w: WeekRecord) => void;
  deleteWeek: (id: string) => void;
  updateSettings: (s: AppSettings) => void;
  reload: () => void;
}