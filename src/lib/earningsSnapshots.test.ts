import { describe, expect, it } from "vitest";
import { representativeAuditWeek } from "./auditFixtures";
import { buildEarningsSnapshotRows } from "./earningsSnapshots";

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
});
