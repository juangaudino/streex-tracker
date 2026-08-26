import type { DayEntry, EarningsSnapshot, WeekRecord } from "./types";

export interface EarningsSnapshotInsert {
  user_id: string;
  week_id: string;
  day_date: string;
  app: string;
  previous_amount: number;
  new_amount: number;
  delta: number;
  shift_id?: string | null;
  event_key: string;
}

export interface ReconciledEarningsSnapshot {
  /** The original append-only observation. It is never rewritten. */
  snapshotId: string;
  /** The raw stored transition amount. It may be negative for a correction. */
  rawDelta: number;
  /**
   * The net new earnings represented by this observation after a temporary
   * downward correction has been recovered. This is safe to use in timing and
   * shift-performance calculations.
   */
  effectiveDelta: number;
  /** Portion of a positive transition that only restores an earlier total. */
  recoveryAmount: number;
}

export interface SnapshotCorrectionSummary {
  key: string;
  snapshotIds: string[];
  recoveredAmount: number;
  outstandingAmount: number;
}

function money(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return +parsed.toFixed(2);
}

function activeShiftId(day: DayEntry): string | null {
  return day.shifts?.find((shift) => !shift.endTime)?.id ?? null;
}

export function earningsSnapshotTransitionKey(snapshot: {
  user_id?: string;
  userId?: string;
  week_id?: string;
  weekId?: string;
  day_date?: string;
  dayDate?: string;
  app: string;
  previous_amount?: number;
  previousAmount?: number;
  new_amount?: number;
  newAmount?: number;
  delta: number;
  shift_id?: string | null;
  shiftId?: string | null;
}): string {
  const userId = snapshot.user_id ?? snapshot.userId ?? "";
  const weekId = snapshot.week_id ?? snapshot.weekId ?? "";
  const dayDate = snapshot.day_date ?? snapshot.dayDate ?? "";
  const previousAmount = money(snapshot.previous_amount ?? snapshot.previousAmount);
  const newAmount = money(snapshot.new_amount ?? snapshot.newAmount);
  const delta = money(snapshot.delta);
  const shiftId = snapshot.shift_id ?? snapshot.shiftId ?? "";
  return [userId, weekId, dayDate, snapshot.app, previousAmount, newAmount, delta, shiftId].join("|");
}

function correctionGroupKey(snapshot: EarningsSnapshot): string {
  return [snapshot.userId, snapshot.weekId, snapshot.dayDate, snapshot.app].join("|");
}

/**
 * Converts an append-only accumulated-total history into safe analytical
 * increments. A temporary correction such as 100 -> 35 -> 135 contains a
 * -65 and then +100 raw transition, but only +35 is genuinely new after the
 * prior 100 total. We keep both raw rows for audit, while preventing the +65
 * recovery from becoming fictional earnings.
 */
export function reconcileEarningsSnapshotDeltas(snapshots: EarningsSnapshot[]): {
  bySnapshotId: Map<string, ReconciledEarningsSnapshot>;
  corrections: SnapshotCorrectionSummary[];
} {
  const bySnapshotId = new Map<string, ReconciledEarningsSnapshot>();
  const grouped = new Map<string, EarningsSnapshot[]>();
  const seenTransitions = new Set<string>();

  for (const snapshot of snapshots) {
    const transition = earningsSnapshotTransitionKey(snapshot);
    if (seenTransitions.has(transition)) continue;
    seenTransitions.add(transition);
    const key = correctionGroupKey(snapshot);
    grouped.set(key, [...(grouped.get(key) ?? []), snapshot]);
  }

  const corrections: SnapshotCorrectionSummary[] = [];
  for (const [key, group] of grouped) {
    const ordered = [...group].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
    let correctionDebt = 0;
    let recoveredAmount = 0;
    const snapshotIds: string[] = [];

    for (const snapshot of ordered) {
      const rawDelta = money(snapshot.delta);
      snapshotIds.push(snapshot.id);
      if (rawDelta < 0) {
        correctionDebt += Math.abs(rawDelta);
        bySnapshotId.set(snapshot.id, {
          snapshotId: snapshot.id,
          rawDelta,
          effectiveDelta: 0,
          recoveryAmount: 0,
        });
        continue;
      }

      const recoveryAmount = Math.min(correctionDebt, rawDelta);
      correctionDebt = money(correctionDebt - recoveryAmount);
      recoveredAmount = money(recoveredAmount + recoveryAmount);
      bySnapshotId.set(snapshot.id, {
        snapshotId: snapshot.id,
        rawDelta,
        effectiveDelta: money(rawDelta - recoveryAmount),
        recoveryAmount,
      });
    }

    if (recoveredAmount > 0 || correctionDebt > 0) {
      corrections.push({ key, snapshotIds, recoveredAmount, outstandingAmount: correctionDebt });
    }
  }

  return { bySnapshotId, corrections };
}

export function dbToEarningsSnapshot(row: {
  id: string;
  user_id: string;
  week_id: string;
  day_date: string;
  app: string;
  previous_amount: number;
  new_amount: number;
  delta: number;
  shift_id: string | null;
  created_at: string;
}): EarningsSnapshot {
  return {
    id: row.id,
    userId: row.user_id,
    weekId: row.week_id,
    dayDate: row.day_date,
    app: row.app,
    previousAmount: Number(row.previous_amount),
    newAmount: Number(row.new_amount),
    delta: Number(row.delta),
    shiftId: row.shift_id,
    createdAt: row.created_at,
  };
}

export function buildEarningsSnapshotRows(params: {
  userId: string;
  previousWeek?: WeekRecord | null;
  nextWeek: WeekRecord;
  sourceRevision?: string;
}): EarningsSnapshotInsert[] {
  const { userId, previousWeek, nextWeek } = params;
  if (!previousWeek) return [];

  const previousDays = new Map(previousWeek.entries.map((day) => [day.date, day]));
  const rows: EarningsSnapshotInsert[] = [];

  for (const nextDay of nextWeek.entries) {
    const previousDay = previousDays.get(nextDay.date);
    if (!previousDay) continue;

    const apps = new Set([
      ...Object.keys(previousDay.apps ?? {}),
      ...Object.keys(nextDay.apps ?? {}),
    ]);

    for (const app of apps) {
      const previousAmount = money(previousDay.apps?.[app]);
      const newAmount = money(nextDay.apps?.[app]);
      const delta = money(newAmount - previousAmount);
      if (Math.abs(delta) < 0.01) continue;

      const transition = {
        user_id: userId,
        week_id: nextWeek.id,
        day_date: nextDay.date,
        app,
        previous_amount: previousAmount,
        new_amount: newAmount,
        delta,
        shift_id: activeShiftId(nextDay),
      };
      rows.push({
        ...transition,
        // A week revision identifies one logical save. Concurrent/retried
        // saves of that revision share a key, while a later correction cycle
        // receives a new revision and remains a legitimate new observation.
        event_key: `${params.sourceRevision ?? previousWeek.updatedAt}|${earningsSnapshotTransitionKey(transition)}`,
      });
    }
  }

  return rows;
}
