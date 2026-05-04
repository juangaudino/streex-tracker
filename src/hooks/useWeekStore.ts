import { useState, useCallback, useEffect } from "react";
import { WeekRecord, AppSettings, DEFAULT_APPS, DayEntry } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { getWeeks as getLocalWeeks } from "@/lib/store";

const DEFAULT_SETTINGS: AppSettings = {
  defaultWeeklyGoal: 1200,
  currencySymbol: "$",
  activeApps: [...DEFAULT_APPS],
};

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
  const [weeks, setWeeks] = useState<WeekRecord[]>([]);
  const [settings, setSettingsState] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [hasLocalData, setHasLocalData] = useState(false);

  // Load data from DB
  const reload = useCallback(async () => {
    if (!user) { setWeeks([]); setLoading(false); return; }
    const { data } = await supabase
      .from("weeks")
      .select("*")
      .order("start_date", { ascending: false });
    if (data) setWeeks(data.map(dbToWeek));

    const { data: sData } = await supabase
      .from("user_settings")
      .select("*")
      .maybeSingle();
    if (sData) {
      setSettingsState({
        defaultWeeklyGoal: Number(sData.default_weekly_goal),
        currencySymbol: sData.currency_symbol,
        activeApps: (typeof sData.active_apps === "string"
          ? JSON.parse(sData.active_apps)
          : sData.active_apps) as string[],
      });
    }

    // Check for local data to import
    const local = getLocalWeeks();
    setHasLocalData(local.length > 0);
    setLoading(false);
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
  }, [user]);

  const updateWeek = useCallback(async (w: WeekRecord) => {
    if (!user) return;
    const now = new Date().toISOString();
    const { error } = await supabase.from("weeks").update({
      start_date: w.startDate,
      end_date: w.endDate,
      weekly_goal: w.weeklyGoal,
      status: w.status,
      entries: w.entries as any,
      updated_at: now,
    }).eq("id", w.id).eq("user_id", user.id);
    if (error) {
      console.error("Update failed:", error);
      alert("Error updating week: " + error.message);
      return;
    }
    setWeeks((prev) => prev.map((x) => (x.id === w.id ? { ...w, updatedAt: now } : x)));
  }, [user]);

  const deleteWeek = useCallback(async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from("weeks").delete().eq("id", id).eq("user_id", user.id);
    if (error) {
      console.error("Delete failed:", error);
      alert("Error deleting week: " + error.message);
      return;
    }
    setWeeks((prev) => prev.filter((w) => w.id !== id));
  }, [user]);

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
    setSettingsState(s);
  }, [user]);

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