import { useState, useCallback, useEffect } from "react";
import { WeekRecord, AppSettings, DEFAULT_APPS, DayEntry, EarningsSnapshot, OperationalSnapshot, OperationalSnapshotDraft } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { getWeeks as getLocalWeeks } from "@/lib/store";
import { lifecycleDebug } from "@/lib/appLifecycle";
import { buildEarningsSnapshotRows, dbToEarningsSnapshot, earningsSnapshotTransitionKey } from "@/lib/earningsSnapshots";
import { normalizeLegacyBonusWeek } from "@/lib/rewardIncome";
import { inspectWeekIntegrity, parseWeekRecord } from "@/lib/weekIntegrity";
import { loadWeekRevisions, restoreWeekRevision, saveWeekWithRevision, type WeekRevision } from "@/lib/weekRevisions";
import type { Database, Json } from "@/integrations/supabase/types";
import { dbToOperationalSnapshot, operationalDraftToRow } from "@/lib/operationalSnapshots";

const DEFAULT_SETTINGS: AppSettings = {
  defaultWeeklyGoal: 1200,
  defaultWeeklyHoursGoal: 0,
  currencySymbol: "$",
  activeApps: [...DEFAULT_APPS],
  octopusPoints: 0,
};

interface WeekStoreSnapshot {
  weeks: WeekRecord[];
  settings: AppSettings;
  earningsSnapshots: EarningsSnapshot[];
  operationalSnapshots: OperationalSnapshot[];
  hasLocalData: boolean;
}

const storeCache = new Map<string, WeekStoreSnapshot>();
const pendingSnapshotKeys = new Set<string>();
type WeekRow = Database["public"]["Tables"]["weeks"]["Row"];

function dbToWeek(row: WeekRow): WeekRecord {
  const week = parseWeekRecord(normalizeLegacyBonusWeek({
    id: row.id,
    startDate: row.start_date,
    endDate: row.end_date,
    weeklyGoal: Number(row.weekly_goal),
    weeklyHoursGoal: Number(row.weekly_hours_goal ?? 0),
    status: row.status as "open" | "closed",
    entries: (typeof row.entries === "string" ? JSON.parse(row.entries) : row.entries) as DayEntry[],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
  const integrityIssues = inspectWeekIntegrity(week);
  if (integrityIssues.length) {
    console.warn("[weeks.integrity] semantic inconsistencies detected", {
      weekId: week.id,
      issues: integrityIssues.map(({ severity, code, path }) => ({ severity, code, path })),
    });
  }
  return week;
}

export function useWeekStore(user: User | null) {
  const cachedStore = user ? storeCache.get(user.id) : undefined;
  const [weeks, setWeeks] = useState<WeekRecord[]>(() => cachedStore?.weeks ?? []);
  const [settings, setSettingsState] = useState<AppSettings>(() => cachedStore?.settings ?? DEFAULT_SETTINGS);
  const [earningsSnapshots, setEarningsSnapshots] = useState<EarningsSnapshot[]>(() => cachedStore?.earningsSnapshots ?? []);
  const [operationalSnapshots, setOperationalSnapshots] = useState<OperationalSnapshot[]>(() => cachedStore?.operationalSnapshots ?? []);
  const [loading, setLoading] = useState(() => !cachedStore);
  const [hasLocalData, setHasLocalData] = useState(() => cachedStore?.hasLocalData ?? false);
  const [syncStatus, setSyncStatus] = useState<"saved" | "saving" | "conflict" | "error">("saved");
  const [conflictDraft, setConflictDraft] = useState<WeekRecord | null>(null);
  const [retryDraft, setRetryDraft] = useState<WeekRecord | null>(null);

  // Load data from DB
  const reload = useCallback(async () => {
    if (!user) { setWeeks([]); setLoading(false); return; }
    const hasCachedStore = storeCache.has(user.id);
    if (!hasCachedStore) setLoading(true);
    try {
      const [{ data, error }, { data: sData, error: settingsError }, snapshotsResult, operationalResult] = await Promise.all([
        supabase
          .from("weeks")
          .select("*")
          .order("start_date", { ascending: false }),
        supabase
          .from("user_settings")
          .select("*")
          .maybeSingle(),
        supabase
          .from("earnings_snapshots")
          .select("*")
          .order("created_at", { ascending: true }),
        supabase
          .from("operational_snapshots")
          .select("*")
          .order("recorded_at", { ascending: true }),
      ]);
      if (error) throw error;
      if (settingsError) throw settingsError;

      const nextWeeks = data?.map(dbToWeek) ?? [];
      const nextSettings = sData ? {
        defaultWeeklyGoal: Number(sData.default_weekly_goal),
        defaultWeeklyHoursGoal: Number(sData.default_weekly_hours_goal ?? 0),
        currencySymbol: sData.currency_symbol,
        activeApps: (typeof sData.active_apps === "string"
          ? JSON.parse(sData.active_apps)
          : sData.active_apps) as string[],
        octopusPoints: Math.max(0, Number(sData.octopus_points ?? 0)),
        octopusUpdatedAt: sData.octopus_updated_at ?? undefined,
      } : storeCache.get(user.id)?.settings ?? DEFAULT_SETTINGS;
      const nextSnapshots = snapshotsResult.error
        ? storeCache.get(user.id)?.earningsSnapshots ?? []
        : snapshotsResult.data?.map(dbToEarningsSnapshot) ?? [];
      let nextOperationalSnapshots = operationalResult.error
        ? storeCache.get(user.id)?.operationalSnapshots ?? []
        : operationalResult.data?.map(dbToOperationalSnapshot) ?? [];

      if (snapshotsResult.error) {
        console.warn("[weeks.reload] earnings snapshots unavailable", snapshotsResult.error);
      }
      if (operationalResult.error) {
        console.warn("[weeks.reload] operational snapshots unavailable", operationalResult.error);
      } else {
        const queueKey = `streex_operational_snapshot_queue:${user.id}`;
        try {
          const queued = JSON.parse(localStorage.getItem(queueKey) ?? "[]") as Database["public"]["Tables"]["operational_snapshots"]["Insert"][];
          if (queued.length) {
            const retry = await supabase.from("operational_snapshots").upsert(queued, { onConflict: "event_key", ignoreDuplicates: true }).select("*");
            if (!retry.error) {
              localStorage.removeItem(queueKey);
              const byKey = new Map(nextOperationalSnapshots.map((snapshot) => [snapshot.eventKey, snapshot]));
              retry.data?.map(dbToOperationalSnapshot).forEach((snapshot) => byKey.set(snapshot.eventKey, snapshot));
              nextOperationalSnapshots = [...byKey.values()].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
            }
          }
        } catch (retryError) {
          console.warn("[weeks.reload] operational snapshot retry deferred", retryError);
        }
      }

      // Check for local data to import
      const local = getLocalWeeks();
      const nextHasLocalData = local.length > 0;
      storeCache.set(user.id, {
        weeks: nextWeeks,
        settings: nextSettings,
        earningsSnapshots: nextSnapshots,
        operationalSnapshots: nextOperationalSnapshots,
        hasLocalData: nextHasLocalData,
      });
      setWeeks(nextWeeks);
      setSettingsState(nextSettings);
      setEarningsSnapshots(nextSnapshots);
      setOperationalSnapshots(nextOperationalSnapshots);
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
    const normalizedWeek = normalizeLegacyBonusWeek(w);
    const integrityIssues = inspectWeekIntegrity(normalizedWeek);
    if (integrityIssues.length) {
      console.warn("[weeks.addWeek] semantic inconsistencies before save", {
        weekId: normalizedWeek.id,
        issues: integrityIssues.map(({ severity, code, path }) => ({ severity, code, path })),
      });
    }
    const { data, error } = await supabase.from("weeks").insert({
      user_id: user.id,
      start_date: normalizedWeek.startDate,
      end_date: normalizedWeek.endDate,
      weekly_goal: normalizedWeek.weeklyGoal,
      weekly_hours_goal: normalizedWeek.weeklyHoursGoal ?? 0,
      status: normalizedWeek.status,
      entries: normalizedWeek.entries as unknown as Json,
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
    const previousWeek = storeCache.get(user.id)?.weeks.find((week) => week.id === w.id)
      ?? weeks.find((week) => week.id === w.id)
      ?? null;
    if (!previousWeek) {
      console.warn("[weeks.updateWeek] skipped: unknown local revision", { weekId: w.id });
      setSyncStatus("error");
      setRetryDraft(w);
      return false;
    }
    const normalizedWeek = normalizeLegacyBonusWeek(w);
    try {
      const integrityIssues = inspectWeekIntegrity(normalizedWeek);
      if (integrityIssues.length) {
        console.warn("[weeks.updateWeek] semantic inconsistencies before save", {
          weekId: normalizedWeek.id,
          userId: user.id,
          issues: integrityIssues.map(({ severity, code, path }) => ({ severity, code, path })),
        });
      }
      setSyncStatus("saving");
      console.info("[weeks.updateWeek] saving", {
        weekId: w.id,
        userId: user.id,
        startDate: normalizedWeek.startDate,
        endDate: normalizedWeek.endDate,
        status: normalizedWeek.status,
        entries: normalizedWeek.entries.length,
      });
      const saveResult = await saveWeekWithRevision(normalizedWeek, previousWeek.updatedAt);
      if (saveResult.status === "conflict") {
        setConflictDraft(normalizedWeek);
        setRetryDraft(null);
        setSyncStatus("conflict");
        await reload();
        return false;
      }
      if (saveResult.status === "failed") {
        console.error("[weeks.updateWeek] Supabase update failed", {
          weekId: w.id,
          userId: user.id,
          error: saveResult.error,
        });
        setRetryDraft(normalizedWeek);
        setSyncStatus("error");
        alert("Could not save this week. Your latest edit is kept locally so you can retry.");
        return false;
      }
      const now = saveResult.updatedAt ?? new Date().toISOString();
      const existingSnapshotKeys = new Set(
        earningsSnapshots.map((snapshot) => earningsSnapshotTransitionKey(snapshot)),
      );
      const snapshotRows = buildEarningsSnapshotRows({
        userId: user.id,
        previousWeek,
        nextWeek: normalizedWeek,
        sourceRevision: previousWeek?.updatedAt,
      }).filter((row) => {
        const key = earningsSnapshotTransitionKey(row);
        if (existingSnapshotKeys.has(key) || pendingSnapshotKeys.has(key)) return false;
        pendingSnapshotKeys.add(key);
        return true;
      });
      let insertedSnapshots: EarningsSnapshot[] = [];
      if (snapshotRows.length) {
        try {
          const { data: snapshotData, error: snapshotError } = await supabase
            .from("earnings_snapshots")
            .upsert(snapshotRows, { onConflict: "event_key", ignoreDuplicates: true })
            .select("*");
          if (snapshotError) {
            console.warn("[weeks.updateWeek] earnings snapshots unavailable", {
              weekId: w.id,
              count: snapshotRows.length,
              error: snapshotError,
            });
          } else if (snapshotData?.length) {
            insertedSnapshots = snapshotData.map(dbToEarningsSnapshot);
            setEarningsSnapshots((prev) => [...prev, ...insertedSnapshots]);
          }
        } finally {
          snapshotRows.forEach((row) => pendingSnapshotKeys.delete(earningsSnapshotTransitionKey(row)));
        }
      }
      setWeeks((prev) => {
        const nextWeeks = prev.map((x) => (x.id === normalizedWeek.id ? { ...normalizedWeek, updatedAt: now } : x));
        const nextSnapshots = insertedSnapshots.length ? [...earningsSnapshots, ...insertedSnapshots] : earningsSnapshots;
        storeCache.set(user.id, { weeks: nextWeeks, settings, earningsSnapshots: nextSnapshots, operationalSnapshots, hasLocalData });
        return nextWeeks;
      });
      setConflictDraft(null);
      setRetryDraft(null);
      setSyncStatus("saved");
      return true;
    } catch (error) {
      console.error("[weeks.updateWeek] request failed", {
        weekId: w.id,
        userId: user.id,
        error,
      });
      setRetryDraft(normalizedWeek);
      setSyncStatus("error");
      alert("Could not save this week. Your latest edit is kept locally so you can retry.");
      return false;
    }
  }, [earningsSnapshots, hasLocalData, operationalSnapshots, reload, settings, user, weeks]);

  const recordOperationalSnapshot = useCallback(async (draft: OperationalSnapshotDraft): Promise<boolean> => {
    if (!user) return false;
    const week = weeks.find((item) => item.entries.some((day) => day.date === draft.dayDate));
    if (!week) return false;
    const row = operationalDraftToRow(draft, user.id, week.id);
    const queueKey = `streex_operational_snapshot_queue:${user.id}`;
    const queued = (() => {
      try { return JSON.parse(localStorage.getItem(queueKey) ?? "[]") as typeof row[]; }
      catch { return [] as typeof row[]; }
    })();
    const rows = [...queued.filter((item) => item.event_key !== row.event_key), row];
    const { data, error } = await supabase
      .from("operational_snapshots")
      .upsert(rows, { onConflict: "event_key", ignoreDuplicates: true })
      .select("*");
    if (error) {
      localStorage.setItem(queueKey, JSON.stringify(rows));
      console.warn("[operationalSnapshots] queued for retry", { count: rows.length, error });
      return false;
    }
    localStorage.removeItem(queueKey);
    if (data?.length) {
      setOperationalSnapshots((previous) => {
        const byKey = new Map(previous.map((snapshot) => [snapshot.eventKey, snapshot]));
        data.map(dbToOperationalSnapshot).forEach((snapshot) => byKey.set(snapshot.eventKey, snapshot));
        const next = [...byKey.values()].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
        storeCache.set(user.id, { weeks, settings, earningsSnapshots, operationalSnapshots: next, hasLocalData });
        return next;
      });
    }
    return true;
  }, [earningsSnapshots, hasLocalData, settings, user, weeks]);

  const resolveWeekConflict = useCallback(async (strategy: "keep-remote" | "use-local"): Promise<boolean> => {
    const draft = conflictDraft;
    if (!draft) return false;
    if (strategy === "keep-remote") {
      setConflictDraft(null);
      setSyncStatus("saved");
      return true;
    }
    const remoteWeek = storeCache.get(user?.id ?? "")?.weeks.find((week) => week.id === draft.id)
      ?? weeks.find((week) => week.id === draft.id);
    if (!remoteWeek) return false;
    setConflictDraft(null);
    return updateWeek({ ...draft, updatedAt: remoteWeek.updatedAt });
  }, [conflictDraft, updateWeek, user?.id, weeks]);

  const retryLastSave = useCallback(async (): Promise<boolean> => {
    if (!retryDraft) return false;
    const remoteWeek = storeCache.get(user?.id ?? "")?.weeks.find((week) => week.id === retryDraft.id)
      ?? weeks.find((week) => week.id === retryDraft.id);
    if (!remoteWeek) return false;
    return updateWeek({ ...retryDraft, updatedAt: remoteWeek.updatedAt });
  }, [retryDraft, updateWeek, user?.id, weeks]);

  const getWeekRevisions = useCallback(async (weekId: string): Promise<WeekRevision[]> => {
    return loadWeekRevisions(weekId);
  }, []);

  const restoreRevision = useCallback(async (weekId: string, revisionId: string): Promise<boolean> => {
    if (!user) return false;
    const currentWeek = storeCache.get(user.id)?.weeks.find((week) => week.id === weekId)
      ?? weeks.find((week) => week.id === weekId);
    if (!currentWeek) return false;
    setSyncStatus("saving");
    const result = await restoreWeekRevision(weekId, revisionId, currentWeek.updatedAt);
    if (result.status === "conflict") {
      await reload();
      setSyncStatus("saved");
      return false;
    }
    if (result.status === "failed") {
      setSyncStatus("error");
      return false;
    }
    await reload();
    setSyncStatus("saved");
    return true;
  }, [reload, user, weeks]);

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
      const nextSnapshots = earningsSnapshots.filter((snapshot) => snapshot.weekId !== id);
      storeCache.set(user.id, { weeks: nextWeeks, settings, earningsSnapshots: nextSnapshots, operationalSnapshots, hasLocalData });
      setEarningsSnapshots(nextSnapshots);
      return nextWeeks;
    });
  }, [earningsSnapshots, hasLocalData, operationalSnapshots, settings, user]);

  const updateSettings = useCallback(async (s: AppSettings): Promise<boolean> => {
    if (!user) return false;
    const { error } = await supabase.from("user_settings").upsert({
      user_id: user.id,
      default_weekly_goal: s.defaultWeeklyGoal,
      default_weekly_hours_goal: s.defaultWeeklyHoursGoal ?? 0,
      currency_symbol: s.currencySymbol,
      active_apps: s.activeApps as unknown as Json,
      octopus_points: Math.max(0, Number(s.octopusPoints) || 0),
      octopus_updated_at: s.octopusUpdatedAt ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    if (error) {
      console.error("Settings save failed:", error);
      alert("Error saving settings: " + error.message);
      return false;
    }
    storeCache.set(user.id, { weeks, settings: s, earningsSnapshots, operationalSnapshots, hasLocalData });
    setSettingsState(s);
    return true;
  }, [earningsSnapshots, hasLocalData, operationalSnapshots, user, weeks]);

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
    const rows = toImport.map(normalizeLegacyBonusWeek).map((w) => ({
      user_id: user.id,
      start_date: w.startDate,
      end_date: w.endDate,
      weekly_goal: w.weeklyGoal,
      weekly_hours_goal: w.weeklyHoursGoal ?? 0,
      status: w.status,
      entries: w.entries as unknown as Json,
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
    earningsSnapshots,
    operationalSnapshots,
    loading,
    hasLocalData,
    addWeek,
    updateWeek,
    recordOperationalSnapshot,
    deleteWeek,
    updateSettings,
    importLocalData,
    reload,
    syncStatus,
    hasPendingConflict: Boolean(conflictDraft),
    resolveWeekConflict,
    retryLastSave,
    getWeekRevisions,
    restoreRevision,
  };
}
