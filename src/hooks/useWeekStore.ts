import { useState, useCallback, useEffect } from "react";
import { WeekRecord, AppSettings, DEFAULT_APPS, DayEntry } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { getWeeks as getLocalWeeks } from "@/lib/store";
import { lifecycleDebug } from "@/lib/appLifecycle";

const DEFAULT_SETTINGS: AppSettings = {
  defaultWeeklyGoal: 1200,
  currencySymbol: "$",
  activeApps: [...DEFAULT_APPS],
};

interface WeekStoreSnapshot {
  weeks: WeekRecord[];
  settings: AppSettings;
  hasLocalData: boolean;
}

const storeCache = new Map<string, WeekStoreSnapshot>();

function dbToWeek(row: any): WeekRecord {
  return {
    id: row.id,
    startDate: row.start_date,
    endDate: row.end_date,
    weeklyGoal: Number(row.weekly_goal),
    status: row.status as "open" | "closed",
    entries: (typeof row.entries === "string" ? JSON.parse(row.entries) : row.entries) as DayEntry[],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function useWeekStore(user: User | null) {
  const cachedStore = user ? storeCache.get(user.id) : undefined;
  const [weeks, setWeeks] = useState<WeekRecord[]>(() => cachedStore?.weeks ?? []);
  const [settings, setSettingsState] = useState<AppSettings>(() => cachedStore?.settings ?? DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(() => !cachedStore);
  const [hasLocalData, setHasLocalData] = useState(() => cachedStore?.hasLocalData ?? false);

  // Load data from DB
  const reload = useCallback(async () => {
    if (!user) { setWeeks([]); setLoading(false); return; }
    const hasCachedStore = storeCache.has(user.id);
    if (!hasCachedStore) setLoading(true);
    try {
      const [{ data, error }, { data: sData, error: settingsError }] = await Promise.all([
        supabase
          .from("weeks")
          .select("*")
          .order("start_date", { ascending: false }),
        supabase
          .from("user_settings")
          .select("*")
          .maybeSingle(),
      ]);
      if (error) throw error;
      if (settingsError) throw settingsError;

      const nextWeeks = data?.map(dbToWeek) ?? [];
      const nextSettings = sData ? {
        defaultWeeklyGoal: Number(sData.default_weekly_goal),
        currencySymbol: sData.currency_symbol,
        activeApps: (typeof sData.active_apps === "string"
          ? JSON.parse(sData.active_apps)
          : sData.active_apps) as string[],
      } : storeCache.get(user.id)?.settings ?? DEFAULT_SETTINGS;

      // Check for local data to import
      const local = getLocalWeeks();
      const nextHasLocalData = local.length > 0;
      storeCache.set(user.id, {
        weeks: nextWeeks,
        settings: nextSettings,
        hasLocalData: nextHasLocalData,
      });
      setWeeks(nextWeeks);
      setSettingsState(nextSettings);
      setHasLocalData(nextHasLocalData);
      lifecycleDebug("week store hydrated", {
        userId: user.id,
        weeks: nextWeeks.length,
        fromCache: hasCachedStore,
      });
    } catch (error) {
      console.warn("[weeks.reload] failed to hydrate week store", error);
      lifecycleDebug("week store hydration failed", {
        userId: user.id,
        message: error instanceof Error ? error.message : String(error),
        preservedCache: hasCachedStore,
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { reload(); }, [reload]);

  const addWeek = useCallback(async (w: WeekRecord) => {
    if (!user) return;
    const { data, error } = await supabase.from("weeks").insert({
      user_id: user.id,
      start_date: w.startDate,
      end_date: w.endDate,
      weekly_goal: w.weeklyGoal,
      status: w.status,
      entries: w.entries as any,
    }).select().single();
    if (error) {
      console.error("Save failed:", error);
      alert("Error saving week: " + error.message);
      return;
    }
    await reload();
  }, [user, reload]);

  const updateWeek = useCallback(async (w: WeekRecord): Promise<boolean> => {
    if (!user) {
      console.warn("[weeks.updateWeek] skipped: no authenticated user", { weekId: w.id });
      return false;
    }
    const now = new Date().toISOString();
    try {
      const payload = {
        start_date: w.startDate,
        end_date: w.endDate,
        weekly_goal: w.weeklyGoal,
        status: w.status,
        entries: w.entries as any,
        updated_at: now,
      };
      console.info("[weeks.updateWeek] saving", {
        weekId: w.id,
        userId: user.id,
        startDate: w.startDate,
        endDate: w.endDate,
        status: w.status,
        entries: w.entries.length,
      });
      const { error } = await supabase
        .from("weeks")
        .update(payload)
        .eq("id", w.id)
        .eq("user_id", user.id);
      if (error) {
        console.error("[weeks.updateWeek] Supabase update failed", {
          weekId: w.id,
          userId: user.id,
          error,
          payload,
        });
        alert("Could not save this week. Please check your connection and try again.");
        return false;
      }
      setWeeks((prev) => {
        const nextWeeks = prev.map((x) => (x.id === w.id ? { ...w, updatedAt: now } : x));
        storeCache.set(user.id, { weeks: nextWeeks, settings, hasLocalData });
        return nextWeeks;
      });
      return true;
    } catch (error) {
      console.error("[weeks.updateWeek] request failed", {
        weekId: w.id,
        userId: user.id,
        error,
      });
      alert("Could not save this week. Please check your connection and try again.");
      return false;
    }
  }, [hasLocalData, settings, user]);

  const deleteWeek = useCallback(async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from("weeks").delete().eq("id", id).eq("user_id", user.id);
    if (error) {
      console.error("Delete failed:", error);
      alert("Error deleting week: " + error.message);
      return;
    }
    setWeeks((prev) => {
      const nextWeeks = prev.filter((w) => w.id !== id);
      storeCache.set(user.id, { weeks: nextWeeks, settings, hasLocalData });
      return nextWeeks;
    });
  }, [hasLocalData, settings, user]);

  const updateSettings = useCallback(async (s: AppSettings) => {
    if (!user) return;
    const { error } = await supabase.from("user_settings").upsert({
      user_id: user.id,
      default_weekly_goal: s.defaultWeeklyGoal,
      currency_symbol: s.currencySymbol,
      active_apps: s.activeApps as any,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    if (error) {
      console.error("Settings save failed:", error);
      alert("Error saving settings: " + error.message);
      return;
    }
    storeCache.set(user.id, { weeks, settings: s, hasLocalData });
    setSettingsState(s);
  }, [hasLocalData, user, weeks]);

  const importLocalData = useCallback(async () => {
    if (!user) return;
    const local = getLocalWeeks();
    if (!local.length) return;
    const existingStarts = new Set(weeks.map((w) => w.startDate));
    const toImport = local.filter((w) => !existingStarts.has(w.startDate));
    if (!toImport.length) {
      localStorage.removeItem("streex_weeks");
      setHasLocalData(false);
      return 0;
    }
    const rows = toImport.map((w) => ({
      user_id: user.id,
      start_date: w.startDate,
      end_date: w.endDate,
      weekly_goal: w.weeklyGoal,
      status: w.status,
      entries: w.entries as any,
    }));
    const { error } = await supabase.from("weeks").insert(rows);
    if (error) {
      console.error("Import failed:", error);
      alert("Error importing data: " + error.message);
      return 0;
    }
    localStorage.removeItem("streex_weeks");
    setHasLocalData(false);
    await reload();
    return toImport.length;
  }, [user, weeks, reload]);

  const openWeek = weeks.find((w) => w.status === "open") || null;

  return {
    user,
    weeks,
    openWeek,
    settings,
    loading,
    hasLocalData,
    addWeek,
    updateWeek,
    deleteWeek,
    updateSettings,
    importLocalData,
    reload,
  };
}
