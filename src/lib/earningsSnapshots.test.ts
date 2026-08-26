import { describe, expect, it } from "vitest";
import { representativeAuditWeek } from "./auditFixtures";
import { buildEarningsSnapshotRows, reconcileEarningsSnapshotDeltas } from "./earningsSnapshots";
import type { EarningsSnapshot } from "./types";

describe("earnings snapshot idempotency", () => {
  it("reuses a key for the same logical save and rotates it after a later revision", () => {
    const previous = structuredClone(representativeAuditWeek);
    const next = structuredClone(previous);
    next.entries[0].apps.Uber = 130.5;

    const first = buildEarningsSnapshotRows({
      userId: "qa-user",
      previousWeek: previous,
      nextWeek: next,
      sourceRevision: previous.updatedAt,
    });
    const retry = buildEarningsSnapshotRows({
      userId: "qa-user",
      previousWeek: previous,
      nextWeek: next,
      sourceRevision: previous.updatedAt,
    });
    const later = buildEarningsSnapshotRows({
      userId: "qa-user",
      previousWeek: previous,
      nextWeek: next,
      sourceRevision: "2026-07-04T01:00:00.000Z",
    });

    expect(first).toHaveLength(1);
    expect(first[0].event_key).toBe(retry[0].event_key);
    expect(later[0].event_key).not.toBe(first[0].event_key);
  });

  it("keeps a correction recovery from becoming fictional new earnings", () => {
    const base = {
      userId: "qa-user",
      weekId: "week-1",
      dayDate: "2026-08-24",
      app: "Uber",
      shiftId: "shift-1",
    };
    const snapshots: EarningsSnapshot[] = [
      { ...base, id: "first", previousAmount: 0, newAmount: 100, delta: 100, createdAt: "2026-08-24T09:00:00" },
      { ...base, id: "mistake", previousAmount: 100, newAmount: 35, delta: -65, createdAt: "2026-08-24T09:05:00" },
      { ...base, id: "recovery", previousAmount: 35, newAmount: 135, delta: 100, createdAt: "2026-08-24T09:06:00" },
      { ...base, id: "new-income", previousAmount: 135, newAmount: 160, delta: 25, createdAt: "2026-08-24T09:20:00" },
      { ...base, id: "reset", previousAmount: 160, newAmount: 0, delta: -160, createdAt: "2026-08-24T09:25:00" },
      { ...base, id: "reset-recovery", previousAmount: 0, newAmount: 160, delta: 160, createdAt: "2026-08-24T09:26:00" },
    ];

    const reconciled = reconcileEarningsSnapshotDeltas(snapshots);
    expect(reconciled.bySnapshotId.get("first")?.effectiveDelta).toBe(100);
    expect(reconciled.bySnapshotId.get("mistake")?.effectiveDelta).toBe(0);
    expect(reconciled.bySnapshotId.get("recovery")).toMatchObject({ effectiveDelta: 35, recoveryAmount: 65 });
    expect(reconciled.bySnapshotId.get("new-income")?.effectiveDelta).toBe(25);
    expect(reconciled.bySnapshotId.get("reset-recovery")).toMatchObject({ effectiveDelta: 0, recoveryAmount: 160 });
    expect([...reconciled.bySnapshotId.values()].reduce((sum, item) => sum + item.effectiveDelta, 0)).toBe(160);
    expect(reconciled.corrections).toEqual([expect.objectContaining({ recoveredAmount: 225, outstandingAmount: 0 })]);
  });
});
