import { describe, expect, it } from "vitest";
import { buildZoneIntelligenceData } from "./zoneIntelligence";
import type { EarningsSnapshot, RideEvent, RidePayment, RideUpdateBatch, RideUpdateBatchEvent } from "./types";

const filters = { timePreset: "all" as const, app: "all", weekdays: [] };
const snapshot = (id: string, delta: number): EarningsSnapshot => ({ id, userId: "u1", weekId: "w1", dayDate: "2026-09-06", app: "Uber", previousAmount: 0, newAmount: delta, delta, shiftId: "s1", createdAt: "2026-09-06T12:00:00Z" });
const ride = (id: string, overrides: Partial<RideEvent> = {}): RideEvent => ({
  id, userId: "u1", weekId: "w1", dayDate: "2026-09-06", shiftId: "s1", app: "Uber", status: "completed",
  startedAt: "2026-09-06T10:00:00Z", endedAt: "2026-09-06T10:20:00Z", startZoneKey: "zone-v1:100:200", endZoneKey: "zone-v1:101:201",
  startCaptureStatus: "captured", endCaptureStatus: "captured", source: "foreground_browser", ...overrides,
});
const batch = (id: string, kind: RideUpdateBatch["kind"], earningsSnapshotId: string): RideUpdateBatch => ({ id, userId: "u1", app: "Uber", kind, earningsSnapshotId, createdAt: "2026-09-06T12:01:00Z" });
const link = (batchId: string, rideEventId: string): RideUpdateBatchEvent => ({ batchId, rideEventId });

describe("zone intelligence", () => {
  it("attributes a positive single-linked snapshot once to the pickup zone", () => {
    const data = buildZoneIntelligenceData({
      rideEvents: [ride("r1")], rideUpdateBatches: [batch("b1", "single", "s1")], rideUpdateBatchEvents: [link("b1", "r1")], earningsSnapshots: [snapshot("s1", 24.5)], filters,
    });
    expect(data.zones).toHaveLength(2);
    expect(data.zones.find((zone) => zone.zoneKey === "zone-v1:100:200")).toMatchObject({ baseEarnings: 24.5, eligibleEarnings: 24.5, eligibleRideCount: 1, pickupCount: 1 });
    expect(data.zones.find((zone) => zone.zoneKey === "zone-v1:101:201")).toMatchObject({ eligibleEarnings: 0, dropoffCount: 1 });
  });

  it("keeps a batch link as coverage and never divides its money", () => {
    const data = buildZoneIntelligenceData({
      rideEvents: [ride("r1"), ride("r2", { startZoneKey: "zone-v1:102:202" })], rideUpdateBatches: [batch("b1", "batch", "s1")], rideUpdateBatchEvents: [link("b1", "r1"), link("b1", "r2")], earningsSnapshots: [snapshot("s1", 50)], filters,
    });
    expect(data.batchLinked).toBe(2);
    expect(data.eligibleRideCount).toBe(0);
    expect(data.zones.every((zone) => zone.eligibleEarnings === 0)).toBe(true);
  });

  it("does not create zone earnings without a captured pickup", () => {
    const data = buildZoneIntelligenceData({
      rideEvents: [ride("r1", { startZoneKey: null, startCaptureStatus: "denied" })], rideUpdateBatches: [batch("b1", "single", "s1")], rideUpdateBatchEvents: [link("b1", "r1")], earningsSnapshots: [snapshot("s1", 30)], filters,
    });
    expect(data.eligibleRideCount).toBe(0);
    expect(data.zones.every((zone) => zone.eligibleEarnings === 0)).toBe(true);
  });

  it("adds an explicit late tip only to the original pickup zone", () => {
    const payment: RidePayment = { id: "p1", userId: "u1", rideEventId: "r1", earningsSnapshotId: "tip", kind: "late_tip", observedAt: "2026-09-09T18:00:00Z", createdAt: "2026-09-09T18:00:00Z" };
    const data = buildZoneIntelligenceData({
      rideEvents: [ride("r1")], ridePayments: [payment], earningsSnapshots: [snapshot("tip", 6)], filters,
    });
    expect(data.zones.find((zone) => zone.zoneKey === "zone-v1:100:200")).toMatchObject({ lateTips: 6, eligibleEarnings: 6 });
    expect(data.zones.find((zone) => zone.zoneKey === "zone-v1:101:201")).toMatchObject({ eligibleEarnings: 0 });
  });
});
