import type { WeekRecord, AppSettings } from "@/lib/types";

export interface StoreContext {
  weeks: WeekRecord[];
  openWeek: WeekRecord | null;
  settings: AppSettings;
  loading: boolean;
  hasLocalData: boolean;
  addWeek: (w: WeekRecord) => void;
  updateWeek: (w: WeekRecord) => Promise<boolean>;
  deleteWeek: (id: string) => void;
  updateSettings: (s: AppSettings) => void;
  importLocalData: () => Promise<number | undefined>;
  reload: () => void;
}
