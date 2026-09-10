import { reconcileEarningsSnapshotDeltas } from "./earningsSnapshots";
import { dateRangeForPreset, type DeepInsightsFilters } from "./deepInsights";
import type { EarningsSnapshot, ManualRideAllocation, RideEvent, RidePayment, RideSnapshotAllocation, RideUpdateBatch, RideUpdateBatchEvent } from "./types";

export type ZoneIntelligenceMode = "coverage" | "earnings" | "flow";

export interface ZoneFlow {
  fromZoneKey: string;
  toZoneKey: string;
  rides: number;
}

export interface ZoneIntelligenceZone {
  zoneKey: string;
  pickupCount: number;
  dropoffCount: number;
  singleLinkedCount: number;
  batchLinkedCount: number;
  unlinkedCount: number;
  eligibleRideCount: number;
  baseEarnings: number;
  lateTips: number;
  adjustments: number;
  eligibleEarnings: number;
}

export interface ZoneIntelligenceData {
  zones: ZoneIntelligenceZone[];
  flows: ZoneFlow[];
  completedRides: number;
  pickupCaptured: number;
  dropoffCaptured: number;
  singleLinked: number;
  batchLinked: number;
  unlinked: number;
  excludedFromEarnings: number;
  eligibleRideCount: number;
  distinctEligibleDays: number;
  sampleReady: boolean;
}

function money(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? +parsed.toFixed(2) : 0;
}

function localWeekday(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { weekday: "long" });
}

function matchesFilters(ride: RideEvent, filters: DeepInsightsFilters, now: Date): boolean {
  const range = dateRangeForPreset(filters.timePreset, now, filters.customStart, filters.customEnd);
  if (range.start && ride.dayDate < range.start) return false;
  if (range.end && ride.dayDate > range.end) return false;
  if (filters.app !== "all" && ride.app !== filters.app) return false;
  if (filters.weekdays.length && !filters.weekdays.includes(localWeekday(ride.dayDate))) return false;
  return true;
}

function completed(ride: RideEvent): boolean {
  return ride.source === "foreground_browser" && ride.status !== "active" && ride.status !== "cancelled";
}

function zoneForPickup(ride: RideEvent): string | null {
  if (ride.source !== "foreground_browser") return null;
  // Version 1 started at pickup. Version 2 starts on acceptance and must have a
  // separately confirmed pickup before it can create pickup-zone evidence.
  if (ride.lifecycleVersion === 2) {
    return ride.pickupCaptureStatus === "captured" && ride.pickupZoneKey ? ride.pickupZoneKey : null;
  }
  return ride.startCaptureStatus === "captured" && ride.startZoneKey ? ride.startZoneKey : null;
}

function zoneForDropoff(ride: RideEvent): string | null {
  return ride.source === "foreground_browser" && ride.endCaptureStatus === "captured" && ride.endZoneKey ? ride.endZoneKey : null;
}

function emptyZone(zoneKey: string): ZoneIntelligenceZone {
  return {
    zoneKey, pickupCount: 0, dropoffCount: 0, singleLinkedCount: 0, batchLinkedCount: 0, unlinkedCount: 0,
    eligibleRideCount: 0, baseEarnings: 0, lateTips: 0, adjustments: 0, eligibleEarnings: 0,
  };
}

/**
 * Builds private zone evidence without dividing batch money or inferring location.
 * A zone earns money only through an explicit single-event relationship and an
 * already reconciled positive snapshot delta.
 */
export function buildZoneIntelligenceData(params: {
  rideEvents: RideEvent[];
  rideUpdateBatches?: RideUpdateBatch[];
  rideUpdateBatchEvents?: RideUpdateBatchEvent[];
  ridePayments?: RidePayment[];
  rideSnapshotAllocations?: RideSnapshotAllocation[];
  manualRideAllocations?: ManualRideAllocation[];
  earningsSnapshots?: EarningsSnapshot[];
  filters: DeepInsightsFilters;
  now?: Date;
}): ZoneIntelligenceData {
  const now = params.now ?? new Date();
  const rides = params.rideEvents.filter((ride) => completed(ride) && matchesFilters(ride, params.filters, now));
  const rideById = new Map(rides.map((ride) => [ride.id, ride]));
  const batchById = new Map((params.rideUpdateBatches ?? []).map((batch) => [batch.id, batch]));
  const batchForRide = new Map<string, RideUpdateBatch>();
  for (const link of params.rideUpdateBatchEvents ?? []) {
    const batch = batchById.get(link.batchId);
    if (batch && rideById.has(link.rideEventId)) batchForRide.set(link.rideEventId, batch);
  }
  const reconciled = reconcileEarningsSnapshotDeltas(params.earningsSnapshots ?? []).bySnapshotId;
  const currentAllocations = (params.rideSnapshotAllocations ?? []).filter((allocation) => allocation.isCurrent);
  const ledgerSnapshotIds = new Set(currentAllocations.map((allocation) => allocation.earningsSnapshotId));
  const zones = new Map<string, ZoneIntelligenceZone>();
  const getZone = (zoneKey: string) => {
    const current = zones.get(zoneKey) ?? emptyZone(zoneKey);
    zones.set(zoneKey, current);
    return current;
  };
  const flows = new Map<string, ZoneFlow>();
  const eligibleRides = new Set<string>();
  const eligibleDays = new Set<string>();
  const accountedSnapshotIds = new Set<string>();
  let pickupCaptured = 0;
  let dropoffCaptured = 0;
  let singleLinked = 0;
  let batchLinked = 0;
  let unlinked = 0;

  for (const ride of rides) {
    const pickup = zoneForPickup(ride);
    const dropoff = zoneForDropoff(ride);
    const batch = batchForRide.get(ride.id);

    if (pickup) {
      pickupCaptured += 1;
      getZone(pickup).pickupCount += 1;
    }
    if (dropoff) {
      dropoffCaptured += 1;
      getZone(dropoff).dropoffCount += 1;
    }
    if (pickup && dropoff) {
      const key = `${pickup}|${dropoff}`;
      const flow = flows.get(key) ?? { fromZoneKey: pickup, toZoneKey: dropoff, rides: 0 };
      flow.rides += 1;
      flows.set(key, flow);
    }

    if (batch?.kind === "single") {
      singleLinked += 1;
      if (pickup) getZone(pickup).singleLinkedCount += 1;
      const delta = reconciled.get(batch.earningsSnapshotId)?.effectiveDelta ?? 0;
      if (pickup && delta > 0 && !ledgerSnapshotIds.has(batch.earningsSnapshotId) && !accountedSnapshotIds.has(batch.earningsSnapshotId)) {
        const zone = getZone(pickup);
        zone.baseEarnings = money(zone.baseEarnings + delta);
        zone.eligibleEarnings = money(zone.eligibleEarnings + delta);
        zone.eligibleRideCount += 1;
        eligibleRides.add(ride.id);
        eligibleDays.add(ride.dayDate);
        accountedSnapshotIds.add(batch.earningsSnapshotId);
      }
    } else if (batch?.kind === "batch") {
      batchLinked += 1;
      if (pickup) getZone(pickup).batchLinkedCount += 1;
    } else {
      unlinked += 1;
      if (pickup) getZone(pickup).unlinkedCount += 1;
    }
  }

  for (const payment of params.ridePayments ?? []) {
    const ride = rideById.get(payment.rideEventId);
    const pickup = ride ? zoneForPickup(ride) : null;
    const delta = reconciled.get(payment.earningsSnapshotId)?.effectiveDelta ?? 0;
    if (!ride || !pickup || delta <= 0 || ledgerSnapshotIds.has(payment.earningsSnapshotId) || accountedSnapshotIds.has(payment.earningsSnapshotId)) continue;
    const zone = getZone(pickup);
    if (payment.kind === "late_tip") zone.lateTips = money(zone.lateTips + delta);
    else if (payment.kind === "adjustment") zone.adjustments = money(zone.adjustments + delta);
    else zone.baseEarnings = money(zone.baseEarnings + delta);
    zone.eligibleEarnings = money(zone.eligibleEarnings + delta);
    if (!eligibleRides.has(ride.id)) {
      zone.eligibleRideCount += 1;
      eligibleRides.add(ride.id);
      eligibleDays.add(ride.dayDate);
    }
    accountedSnapshotIds.add(payment.earningsSnapshotId);
  }

  for (const allocation of currentAllocations) {
    if (!allocation.rideEventId) continue;
    const ride = rideById.get(allocation.rideEventId);
    const pickup = ride ? zoneForPickup(ride) : null;
    if (!ride || !pickup || allocation.amount <= 0) continue;
    const zone = getZone(pickup);
    if (allocation.kind === "late_tip") zone.lateTips = money(zone.lateTips + allocation.amount);
    else if (allocation.kind === "adjustment") zone.adjustments = money(zone.adjustments + allocation.amount);
    else zone.baseEarnings = money(zone.baseEarnings + allocation.amount);
    zone.eligibleEarnings = money(zone.eligibleEarnings + allocation.amount);
    if (!eligibleRides.has(ride.id)) {
      zone.eligibleRideCount += 1;
      eligibleRides.add(ride.id);
      eligibleDays.add(ride.dayDate);
    }
  }

  for (const allocation of (params.manualRideAllocations ?? []).filter((item) => item.isCurrent)) {
    if (!allocation.rideEventId) continue;
    const ride = rideById.get(allocation.rideEventId);
    const pickup = ride ? zoneForPickup(ride) : null;
    if (!ride || !pickup || allocation.amount <= 0) continue;
    const zone = getZone(pickup);
    zone.baseEarnings = money(zone.baseEarnings + allocation.amount);
    zone.eligibleEarnings = money(zone.eligibleEarnings + allocation.amount);
    if (!eligibleRides.has(ride.id)) {
      zone.eligibleRideCount += 1;
      eligibleRides.add(ride.id);
      eligibleDays.add(ride.dayDate);
    }
  }

  const sortedZones = [...zones.values()].sort((a, b) =>
    b.eligibleEarnings - a.eligibleEarnings || b.pickupCount - a.pickupCount || a.zoneKey.localeCompare(b.zoneKey),
  );
  return {
    zones: sortedZones,
    flows: [...flows.values()].sort((a, b) => b.rides - a.rides || a.fromZoneKey.localeCompare(b.fromZoneKey)),
    completedRides: rides.length,
    pickupCaptured,
    dropoffCaptured,
    singleLinked,
    batchLinked,
    unlinked,
    excludedFromEarnings: Math.max(0, rides.length - eligibleRides.size),
    eligibleRideCount: eligibleRides.size,
    distinctEligibleDays: eligibleDays.size,
    sampleReady: eligibleRides.size >= 8 && eligibleDays.size >= 3,
  };
}

export function zoneCellCoordinates(zoneKey: string): { latitudeCell: number; longitudeCell: number } | null {
  const match = /^zone-v1:(\d+):(\d+)$/.exec(zoneKey);
  if (!match) return null;
  return { latitudeCell: Number(match[1]), longitudeCell: Number(match[2]) };
}

/** Converts a stored coarse cell to its approximate map bounds. Never use for route or address precision. */
export function zoneCellBounds(zoneKey: string): [[number, number], [number, number]] | null {
  const coordinate = zoneCellCoordinates(zoneKey);
  if (!coordinate) return null;
  const south = coordinate.latitudeCell * 0.05 - 90;
  const west = coordinate.longitudeCell * 0.05 - 180;
  return [[south, west], [south + 0.05, west + 0.05]];
}

export function zoneCellCenter(zoneKey: string): { latitude: number; longitude: number } | null {
  const bounds = zoneCellBounds(zoneKey);
  return bounds ? { latitude: (bounds[0][0] + bounds[1][0]) / 2, longitude: (bounds[0][1] + bounds[1][1]) / 2 } : null;
}
