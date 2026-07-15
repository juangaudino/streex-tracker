import type { WeekRecord, AppSettings, EarningsSnapshot } from "@/lib/types";
import type { WeekRevision } from "@/lib/weekRevisions";
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
  updateSettings: (s: AppSettings) => Promise<boolean>;
  importLocalData: () => Promise<number | undefined>;
  reload: () => void;
  syncStatus: "saved" | "saving" | "conflict" | "error";
  hasPendingConflict: boolean;
  resolveWeekConflict: (strategy: "keep-remote" | "use-local") => Promise<boolean>;
  retryLastSave: () => Promise<boolean>;
  getWeekRevisions: (weekId: string) => Promise<WeekRevision[]>;
  restoreRevision: (weekId: string, revisionId: string) => Promise<boolean>;
}
