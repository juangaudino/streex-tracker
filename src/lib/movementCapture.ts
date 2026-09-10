import type { Database } from "@/integrations/supabase/types";
import type { RideCaptureResult, RideEvent } from "./types";

type RideEventRow = Database["public"]["Tables"]["ride_events"]["Row"];

export function dbToRideEvent(row: RideEventRow): RideEvent {
  return {
    id: row.id, userId: row.user_id, weekId: row.week_id, dayDate: row.day_date,
    shiftId: row.shift_id, app: row.app, status: row.status as RideEvent["status"],
    startedAt: row.started_at, endedAt: row.ended_at, lifecycleVersion: row.lifecycle_version as 1 | 2,
    startZoneKey: row.start_zone_key, pickupAt: row.pickup_at, pickupZoneKey: row.pickup_zone_key,
    endZoneKey: row.end_zone_key, startCaptureStatus: row.start_capture_status as RideEvent["startCaptureStatus"],
    endCaptureStatus: row.end_capture_status as RideEvent["endCaptureStatus"],
    pickupCaptureStatus: row.pickup_capture_status as RideEvent["pickupCaptureStatus"],
    startAccuracyClass: row.start_accuracy_class as RideEvent["startAccuracyClass"],
    endAccuracyClass: row.end_accuracy_class as RideEvent["endAccuracyClass"],
    pickupAccuracyClass: row.pickup_accuracy_class as RideEvent["pickupAccuracyClass"],
    source: row.source as RideEvent["source"],
  };
}

/** Captures one foreground position and immediately reduces it to a coarse ~5 km zone. */
export async function captureForegroundZone(): Promise<RideCaptureResult> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return { status: "unavailable" };
  return new Promise((resolve) => navigator.geolocation.getCurrentPosition(
    (position) => {
      if (position.timestamp < Date.now() - 120_000) return resolve({ status: "stale" });
      const accuracy = Number(position.coords.accuracy);
      if (!Number.isFinite(accuracy) || accuracy > 250) return resolve({ status: "imprecise" });
      const latCell = Math.floor((position.coords.latitude + 90) / 0.05);
      const lonCell = Math.floor((position.coords.longitude + 180) / 0.05);
      resolve({ zoneKey: `zone-v1:${latCell}:${lonCell}`, status: "captured", accuracyClass: accuracy <= 50 ? "high" : "usable" });
    },
    (error) => resolve({ status: error.code === error.PERMISSION_DENIED ? "denied" : "unavailable" }),
    { enableHighAccuracy: false, maximumAge: 30_000, timeout: 12_000 },
  ));
}
