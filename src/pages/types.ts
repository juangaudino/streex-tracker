import type { WeekRecord, AppSettings, EarningsSnapshot } from "@/lib/types";
import type { User } from "@supabase/supabase-js";

export interface StoreContext {
  user: User | null;
  weeks: WeekRecord[];
  openWeek: WeekRecord | null;
  settings: AppSettings;
  earningsSnapshots: EarningsSnapshot[];
  loading: boolean;
  hasLocalData: boolean;
  addWeek: (w: WeekRecord) => void;
  updateWeek: (w: WeekRecord) => Promise<boolean>;
  deleteWeek: (id: string) => void;
  updateSettings: (s: AppSettings) => void;
  importLocalData: () => Promise<number | undefined>;
  reload: () => void;
}
