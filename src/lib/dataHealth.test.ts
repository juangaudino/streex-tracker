import { describe, expect, it } from "vitest";
import { representativeAuditWeek } from "./auditFixtures";
import { summarizeDataHealth } from "./dataHealth";

describe("data health summary", () => {
  it("reports a healthy status for canonical representative data", () => {
    const summary = summarizeDataHealth({
      weeks: [representativeAuditWeek],
      snapshots: [],
      checkedAt: "2026-07-08T12:00:00.000Z",
    });

    expect(summary.status).toBe("healthy");
    expect(summary.weeksChecked).toBe(1);
    expect(summary.issueCount).toBe(0);
    expect(summary.contracts.every((contract) => contract.status === "pass")).toBe(true);
  });

  it("groups data contract failures into actionable health sections", () => {
    const corrupt = structuredClone(representativeAuditWeek);
    corrupt.entries[0].shifts![0].miles = 99;
    corrupt.entries[0].shifts![0].rideCount = 1;

    const summary = summarizeDataHealth({
      weeks: [corrupt],
      snapshots: [
        {
          id: "snapshot-1",
          userId: "user-1",
          weekId: corrupt.id,
          dayDate: "2026-06-29",
          app: "Uber",
          previousAmount: 10,
          newAmount: 20,
          delta: 10,
          shiftId: "shift-1",
          createdAt: "2026-06-29T12:00:00.000Z",
        },
        {
          id: "snapshot-2",
          userId: "user-1",
          weekId: corrupt.id,
          dayDate: "2026-06-29",
          app: "Uber",
          previousAmount: 10,
          newAmount: 20,
          delta: 10,
          shiftId: "shift-1",
          createdAt: "2026-06-29T12:01:00.000Z",
        },
      ],
    });

    expect(summary.status).toBe("critical");
    expect(summary.criticalIssueCount).toBeGreaterThanOrEqual(3);
    expect(summary.contracts.find((contract) => contract.id === "miles")?.status).toBe("fail");
    expect(summary.contracts.find((contract) => contract.id === "rides")?.status).toBe("fail");
    expect(summary.contracts.find((contract) => contract.id === "snapshots")?.status).toBe("fail");
  });

  it("reports recovered snapshot corrections without treating them as data failures", () => {
    const week = structuredClone(representativeAuditWeek);
    const snapshots = [
      { id: "before", previousAmount: 0, newAmount: 100, delta: 100, createdAt: "2026-06-29T09:00:00.000Z" },
      { id: "correction", previousAmount: 100, newAmount: 35, delta: -65, createdAt: "2026-06-29T09:05:00.000Z" },
      { id: "recovered", previousAmount: 35, newAmount: 135, delta: 100, createdAt: "2026-06-29T09:06:00.000Z" },
    ].map((snapshot) => ({
      ...snapshot,
      userId: "user-1",
      weekId: week.id,
      dayDate: week.entries[0].date,
      app: "Uber",
      shiftId: week.entries[0].shifts?.[0]?.id ?? null,
    }));

    const summary = summarizeDataHealth({ weeks: [week], snapshots });

    expect(summary.reconciledSnapshotCorrections).toBe(1);
    expect(summary.issues.some((item) => item.code === "SNAPSHOT_CORRECTION_UNRESOLVED")).toBe(false);
  });

  it("flags a correction that remains unrecovered for timing review", () => {
    const week = structuredClone(representativeAuditWeek);
    const snapshots = [
      { id: "before", previousAmount: 0, newAmount: 100, delta: 100, createdAt: "2026-06-29T09:00:00.000Z" },
      { id: "correction", previousAmount: 100, newAmount: 35, delta: -65, createdAt: "2026-06-29T09:05:00.000Z" },
    ].map((snapshot) => ({
      ...snapshot,
      userId: "user-1",
      weekId: week.id,
      dayDate: week.entries[0].date,
      app: "Uber",
      shiftId: week.entries[0].shifts?.[0]?.id ?? null,
    }));

    const summary = summarizeDataHealth({ weeks: [week], snapshots });

    expect(summary.status).toBe("warning");
    expect(summary.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "SNAPSHOT_CORRECTION_UNRESOLVED", severity: "P2" }),
    ]));
  });
});
