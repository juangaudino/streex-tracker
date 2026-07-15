import { supabase } from "@/integrations/supabase/client";
import type { DayEntry, WeekRecord } from "./types";

export type WeekSaveStatus = "saved" | "conflict" | "failed";

export interface WeekSaveResult {
  status: WeekSaveStatus;
  updatedAt?: string;
  revisionId?: string;
  error?: string;
}

export interface WeekRevision {
  id: string;
  sourceUpdatedAt: string;
  startDate: string;
  endDate: string;
  weeklyGoal: number;
  weeklyHoursGoal: number;
  status: WeekRecord["status"];
  entries: DayEntry[];
  reason: "before_update" | "before_restore";
  createdAt: string;
}

interface RpcSaveRow {
  save_status: "saved" | "conflict";
  saved_updated_at: string | null;
  revision_id: string | null;
}

interface RpcRevisionRow {
  id: string;
  source_updated_at: string;
  start_date: string;
  end_date: string;
  weekly_goal: number | string;
  weekly_hours_goal: number | string | null;
  status: string;
  entries: DayEntry[] | string;
  reason: string;
  created_at: string;
}

type UntypedRpc = <T>(functionName: string, args: Record<string, unknown>) => Promise<{
  data: T | null;
  error: { message: string } | null;
}>;

const rpc = supabase.rpc.bind(supabase) as unknown as UntypedRpc;

function parseEntries(entries: RpcRevisionRow["entries"]): DayEntry[] {
  if (Array.isArray(entries)) return entries;
  try {
    const parsed: unknown = JSON.parse(entries);
    return Array.isArray(parsed) ? parsed as DayEntry[] : [];
  } catch {
    return [];
  }
}

export function parseWeekRevision(row: RpcRevisionRow): WeekRevision {
  return {
    id: row.id,
    sourceUpdatedAt: row.source_updated_at,
    startDate: row.start_date,
    endDate: row.end_date,
    weeklyGoal: Number(row.weekly_goal),
    weeklyHoursGoal: Number(row.weekly_hours_goal ?? 0),
    status: row.status === "closed" ? "closed" : "open",
    entries: parseEntries(row.entries),
    reason: row.reason === "before_restore" ? "before_restore" : "before_update",
    createdAt: row.created_at,
  };
}

function parseSaveResponse(data: RpcSaveRow[] | null, error: { message: string } | null): WeekSaveResult {
  if (error) return { status: "failed", error: error.message };
  const row = data?.[0];
  if (!row) return { status: "failed", error: "The save service returned no result." };
  if (row.save_status === "conflict") return { status: "conflict" };
  return {
    status: "saved",
    updatedAt: row.saved_updated_at ?? undefined,
    revisionId: row.revision_id ?? undefined,
  };
}

export async function saveWeekWithRevision(week: WeekRecord, expectedUpdatedAt: string): Promise<WeekSaveResult> {
  const { data, error } = await rpc<RpcSaveRow[]>("update_week_with_revision", {
    p_week_id: week.id,
    p_expected_updated_at: expectedUpdatedAt,
    p_start_date: week.startDate,
    p_end_date: week.endDate,
    p_weekly_goal: week.weeklyGoal,
    p_weekly_hours_goal: week.weeklyHoursGoal ?? 0,
    p_status: week.status,
    p_entries: week.entries,
  });
  return parseSaveResponse(data, error);
}

export async function restoreWeekRevision(
  weekId: string,
  revisionId: string,
  expectedUpdatedAt: string,
): Promise<WeekSaveResult> {
  const { data, error } = await rpc<RpcSaveRow[]>("restore_week_revision", {
    p_week_id: weekId,
    p_revision_id: revisionId,
    p_expected_updated_at: expectedUpdatedAt,
  });
  return parseSaveResponse(data, error);
}

export async function loadWeekRevisions(weekId: string): Promise<WeekRevision[]> {
  const { data, error } = await rpc<RpcRevisionRow[]>("list_week_revisions", { p_week_id: weekId });
  if (error) throw new Error(error.message);
  return (data ?? []).map(parseWeekRevision);
}
