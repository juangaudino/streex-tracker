import type { ShiftSession } from "./types";

function normalizeRideCount(value: unknown): number {
  return Math.max(0, Math.trunc(Number(value) || 0));
}

export function getAppRideCount(shift: ShiftSession, app: string): number | null {
  if (!shift.ridesByApp) return null;
  return normalizeRideCount(shift.ridesByApp[app]);
}

export function getAttributedRideCount(shift: ShiftSession): number {
  return Object.values(shift.ridesByApp ?? {}).reduce(
    (sum, value) => sum + normalizeRideCount(value),
    0,
  );
}

export function getUnattributedRideCount(shift: ShiftSession): number {
  const legacyTotal = normalizeRideCount(shift.legacyRideCount ?? shift.rideCount);
  return Math.max(0, legacyTotal - getAttributedRideCount(shift));
}

export function formatRideAttribution(shift: ShiftSession): string | null {
  if (!shift.ridesByApp) return null;
  const parts = Object.entries(shift.ridesByApp)
    .filter(([, value]) => normalizeRideCount(value) > 0)
    .map(([app, value]) => `${app} ${normalizeRideCount(value)}`);
  const unattributed = getUnattributedRideCount(shift);
  if (unattributed > 0) parts.push(`Unattributed ${unattributed}`);
  return parts.length ? parts.join(" · ") : null;
}

export interface AppRideUpdate {
  shift: ShiftSession;
  previousAppRideCount: number | null;
  nextAppRideCount: number;
  appRideDelta: number;
}

export function updateShiftAppRideCount(
  shift: ShiftSession,
  app: string,
  nextCount: number,
): AppRideUpdate {
  const nextAppRideCount = normalizeRideCount(nextCount);
  const previousAppRideCount = getAppRideCount(shift, app);
  const hadLegacyTotal = !shift.ridesByApp && normalizeRideCount(shift.rideCount) > 0;
  const legacyRideCount = normalizeRideCount(
    shift.legacyRideCount ?? (hadLegacyTotal ? shift.rideCount : 0),
  );
  const ridesByApp = {
    ...(shift.ridesByApp ?? {}),
    [app]: nextAppRideCount,
  };
  const attributedTotal = Object.values(ridesByApp).reduce(
    (sum, value) => sum + normalizeRideCount(value),
    0,
  );

  return {
    shift: {
      ...shift,
      ridesByApp,
      rideCount: Math.max(legacyRideCount, attributedTotal),
      ...(legacyRideCount > 0 ? { legacyRideCount } : {}),
    },
    previousAppRideCount,
    nextAppRideCount,
    // Existing totals have unknown ownership. Initial attribution must not
    // retroactively award Uber rewards or invent an app-specific delta.
    appRideDelta: previousAppRideCount === null && hadLegacyTotal
      ? 0
      : nextAppRideCount - (previousAppRideCount ?? 0),
  };
}

export function replaceShiftTotalRideCount(shift: ShiftSession, total: number): ShiftSession {
  const rideCount = normalizeRideCount(total);
  return {
    ...shift,
    rideCount,
    ridesByApp: undefined,
    legacyRideCount: rideCount || undefined,
  };
}
