import type { DayEntry, ShiftSession } from "./types";

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

/** Returns the known rides for one app across every shift in the day. */
export function getDayAppRideCount(day: DayEntry, app: string): number {
  return (day.shifts ?? []).reduce((sum, shift) => sum + (getAppRideCount(shift, app) ?? 0), 0);
}

/** Rides with no app ownership cannot safely participate in an app-total update. */
export function getDayUnattributedRideCount(day: DayEntry): number {
  return (day.shifts ?? []).reduce((sum, shift) => sum + getUnattributedRideCount(shift), 0);
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

export interface AccumulatedDayAppRideUpdate {
  day: DayEntry;
  previousDayAppRideCount: number;
  nextDayAppRideCount: number;
  /** Change actually assigned to one or more known app counts. */
  appRideDelta: number;
  /** Existing rides whose app is unknown. No automatic assignment is made. */
  unattributedRideCount: number;
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

/**
 * Applies an accumulated app ride total for the whole day while preserving
 * per-shift counts. Positive changes belong to the active shift. A downward
 * correction is removed from the most recent known counts first.
 */
export function applyAccumulatedDayAppRideCount(
  day: DayEntry,
  activeShiftId: string,
  app: string,
  nextDayAppRideCount: number,
): AccumulatedDayAppRideUpdate {
  const previousDayAppRideCount = getDayAppRideCount(day, app);
  const requestedTotal = normalizeRideCount(nextDayAppRideCount);
  const unattributedRideCount = getDayUnattributedRideCount(day);
  const activeIndex = (day.shifts ?? []).findIndex((shift) => shift.id === activeShiftId);

  // A legacy/manual shift total does not tell us which app owns its rides.
  // Refuse to guess, so a daily Uber total cannot silently duplicate those rides.
  if (activeIndex < 0 || unattributedRideCount > 0) {
    return {
      day,
      previousDayAppRideCount,
      nextDayAppRideCount: previousDayAppRideCount,
      appRideDelta: 0,
      unattributedRideCount,
    };
  }

  const difference = requestedTotal - previousDayAppRideCount;
  if (difference === 0) {
    return { day, previousDayAppRideCount, nextDayAppRideCount: previousDayAppRideCount, appRideDelta: 0, unattributedRideCount };
  }

  const shifts = [...(day.shifts ?? [])];
  if (difference > 0) {
    const active = shifts[activeIndex];
    const currentShiftAppRides = getAppRideCount(active, app) ?? 0;
    shifts[activeIndex] = updateShiftAppRideCount(active, app, currentShiftAppRides + difference).shift;
    return {
      day: { ...day, shifts },
      previousDayAppRideCount,
      nextDayAppRideCount: requestedTotal,
      appRideDelta: difference,
      unattributedRideCount,
    };
  }

  let remainingReduction = Math.abs(difference);
  const mostRecentFirst = shifts
    .map((shift, index) => ({ shift, index }))
    .sort((a, b) => b.shift.startTime.localeCompare(a.shift.startTime));

  for (const { index } of mostRecentFirst) {
    if (remainingReduction <= 0) break;
    const current = getAppRideCount(shifts[index], app) ?? 0;
    if (current <= 0) continue;
    const reduction = Math.min(current, remainingReduction);
    shifts[index] = updateShiftAppRideCount(shifts[index], app, current - reduction).shift;
    remainingReduction -= reduction;
  }

  const appliedReduction = Math.abs(difference) - remainingReduction;
  const appRideDelta = -appliedReduction;
  return {
    day: { ...day, shifts },
    previousDayAppRideCount,
    nextDayAppRideCount: previousDayAppRideCount + appRideDelta,
    appRideDelta,
    unattributedRideCount,
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
