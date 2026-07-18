import type { Database, Json } from "@/integrations/supabase/types";
import type { OperationalSnapshot, OperationalSnapshotDraft } from "./types";
import type { IntegrityIssue } from "./weekIntegrity";

type OperationalRow = Database["public"]["Tables"]["operational_snapshots"]["Row"];

function finiteMap(value: Json): Record<string, number> {
  if (!value || Array.isArray(value) || typeof value !== "object") return {};
  return Object.fromEntries(Object.entries(value).flatMap(([key, raw]) => {
    const number = Number(raw);
    return key && Number.isFinite(number) && number >= 0 ? [[key, number]] : [];
  }));
}

export function dbToOperationalSnapshot(row: OperationalRow): OperationalSnapshot {
  return {
    id: row.id,
    userId: row.user_id,
    weekId: row.week_id,
    dayDate: row.day_date,
    shiftId: row.shift_id,
    recordedAt: row.recorded_at,
    appTotals: finiteMap(row.app_totals),
    ridesByApp: finiteMap(row.rides_by_app),
    dayMileage: Math.max(0, Number(row.day_mileage) || 0),
    source: "quick_update",
    eventKey: row.event_key,
  };
}

export function operationalDraftToRow(
  draft: OperationalSnapshotDraft,
  userId: string,
  weekId: string,
): Database["public"]["Tables"]["operational_snapshots"]["Insert"] {
  return {
    user_id: userId,
    week_id: weekId,
    day_date: draft.dayDate,
    shift_id: draft.shiftId ?? null,
    recorded_at: draft.recordedAt,
    app_totals: draft.appTotals as Json,
    rides_by_app: draft.ridesByApp as Json,
    day_mileage: draft.dayMileage,
    source: "quick_update",
    event_key: draft.eventKey,
  };
}

export function createOperationalEventKey(): string {
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `quick-update:${id}`;
}

export function inspectOperationalSnapshot(snapshot: OperationalSnapshot): IntegrityIssue[] {
  const issues: IntegrityIssue[] = [];
  if (!snapshot.eventKey || snapshot.source !== "quick_update") issues.push({ severity: "P1", code: "OPERATIONAL_SNAPSHOT_IDENTITY", path: `operational:${snapshot.id}`, message: "Operational snapshot has an invalid source or event key." });
  if (!Number.isFinite(snapshot.dayMileage) || snapshot.dayMileage < 0) issues.push({ severity: "P1", code: "OPERATIONAL_SNAPSHOT_MILEAGE", path: `operational:${snapshot.id}.dayMileage`, message: "Operational mileage must be finite and non-negative." });
  if (!Number.isFinite(Date.parse(snapshot.recordedAt))) issues.push({ severity: "P1", code: "OPERATIONAL_SNAPSHOT_TIME", path: `operational:${snapshot.id}.recordedAt`, message: "Operational snapshot timestamp is invalid." });
  for (const [app, value] of [...Object.entries(snapshot.appTotals), ...Object.entries(snapshot.ridesByApp)]) {
    if (!app || !Number.isFinite(value) || value < 0) issues.push({ severity: "P1", code: "OPERATIONAL_SNAPSHOT_VALUE", path: `operational:${snapshot.id}.${app}`, message: "Operational cumulative values must be finite and non-negative." });
  }
  return issues;
}
