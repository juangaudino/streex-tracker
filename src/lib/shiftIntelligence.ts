import { dayTotal } from "./store";
import type { DayEntry, EarningsSnapshot, ShiftSession, WeekRecord } from "./types";

export interface ShiftSummary {
  totalShifts: number;
  completedShifts: number;
  activeShifts: number;
  workDays: number;
  multiShiftDays: number;
  totalHours: number;
  averageShiftHours: number | null;
  totalMiles: number;
  earningsPerHour: number | null;
  earningsPerMile: number | null;
  milesPerHour: number | null;
}

export interface HourBucket {
  hour: number;
  label: string;
  earnings: number;
  hours: number;
  earningsPerHour: number;
  observations?: number;
}

export interface PatternIntelligence {
  summary: ShiftSummary;
  hourlyHeatmap: HourBucket[];
  strongestHours: HourBucket[];
  recoveryWindows: HourBucket[];
  bestAppsByHour: { hour: number; label: string; app: string; earnings: number }[];
  morningVsNight: {
    style: "morning" | "night" | "balanced" | "insufficient";
    morningEarningsPerHour: number;
    nightEarningsPerHour: number;
    copy: string;
  };
  productivityWindows: { label: string; earningsPerHour: number; hours: number }[];
  fatigueNote: string | null;
  hasEnoughShiftData: boolean;
  hasEnoughTimingData: boolean;
  timingSource: "snapshot" | "estimated";
  timingSourceLabel: string;
  timingCopy: string;
}

function round(value: number): number {
  return +value.toFixed(2);
}

export function shiftDurationHours(shift: ShiftSession): number {
  if (!shift.endTime) return 0;
  const start = Date.parse(shift.startTime);
  const end = Date.parse(shift.endTime);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return round((end - start) / 3600000);
}

export function getDayMiles(day: DayEntry): number {
  const shiftMiles = (day.shifts ?? []).reduce((sum, shift) => sum + (Number(shift.miles) || 0), 0);
  return round(shiftMiles || Number(day.mileage) || 0);
}

export function getWeekMiles(week: WeekRecord): number {
  return round(week.entries.reduce((sum, day) => sum + getDayMiles(day), 0));
}

export function getDayShiftHours(day: DayEntry): number {
  return round((day.shifts ?? []).reduce((sum, shift) => sum + shiftDurationHours(shift), 0));
}

export function getWeekShiftHours(week: WeekRecord): number {
  return round(week.entries.reduce((sum, day) => sum + getDayShiftHours(day), 0));
}

export function createShift(date: string, now = new Date()): ShiftSession {
  const current = new Date(now);
  const datePrefix = date || current.toISOString().slice(0, 10);
  return {
    id: `shift_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    startTime: `${datePrefix}T${String(current.getHours()).padStart(2, "0")}:${String(current.getMinutes()).padStart(2, "0")}:00`,
  };
}

export function hasActiveShift(day: DayEntry): boolean {
  return Boolean(day.shifts?.some((shift) => !shift.endTime));
}

export function endActiveShift(day: DayEntry, now = new Date()): DayEntry {
  const shifts = (day.shifts ?? []).map((shift) => {
    if (shift.endTime) return shift;
    const end = `${day.date}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:00`;
    return { ...shift, endTime: end };
  });
  return { ...day, shifts };
}

function hourLabel(hour: number): string {
  const suffix = hour >= 12 ? "p.m." : "a.m.";
  const display = hour % 12 || 12;
  return `${display} ${suffix}`;
}

function overlapHours(startMs: number, endMs: number, hour: number, date: string): number {
  const bucketStart = Date.parse(`${date}T${String(hour).padStart(2, "0")}:00:00`);
  const bucketEnd = bucketStart + 3600000;
  const overlap = Math.max(0, Math.min(endMs, bucketEnd) - Math.max(startMs, bucketStart));
  return overlap / 3600000;
}

function buildSnapshotHourMap(earningsSnapshots: EarningsSnapshot[]) {
  const hourMap = new Map<number, { earnings: number; observations: number; appTotals: Record<string, number> }>();

  for (const snapshot of earningsSnapshots) {
    const delta = Number(snapshot.delta) || 0;
    if (delta <= 0) continue;
    const created = new Date(snapshot.createdAt);
    if (Number.isNaN(created.getTime())) continue;
    const hour = created.getHours();
    const current = hourMap.get(hour) ?? { earnings: 0, observations: 0, appTotals: {} };
    current.earnings += delta;
    current.observations += 1;
    current.appTotals[snapshot.app] = (current.appTotals[snapshot.app] || 0) + delta;
    hourMap.set(hour, current);
  }

  return hourMap;
}

export function buildPatternIntelligence(
  weeks: WeekRecord[],
  earningsSnapshots: EarningsSnapshot[] = [],
): PatternIntelligence {
  const hourMap = new Map<number, { earnings: number; hours: number; appTotals: Record<string, number> }>();
  let totalHours = 0;
  let totalMiles = 0;
  let totalShiftEarnings = 0;
  let totalShifts = 0;
  let completedShifts = 0;
  let activeShifts = 0;
  let workDays = 0;
  let multiShiftDays = 0;
  const firstHalf: number[] = [];
  const secondHalf: number[] = [];

  for (const week of weeks) {
    for (const day of week.entries) {
      const shifts = day.shifts ?? [];
      if (!shifts.length) continue;
      workDays += 1;
      if (shifts.length > 1) multiShiftDays += 1;
      const workedHours = getDayShiftHours(day);
      const earnings = dayTotal(day);
      const miles = getDayMiles(day);
      totalMiles += miles;
      totalShifts += shifts.length;
      activeShifts += shifts.filter((shift) => !shift.endTime).length;
      completedShifts += shifts.filter((shift) => Boolean(shift.endTime)).length;
      if (workedHours <= 0 || earnings <= 0) continue;
      totalHours += workedHours;
      totalShiftEarnings += earnings;

      const sortedShifts = shifts.filter((shift) => shift.endTime).sort((a, b) => a.startTime.localeCompare(b.startTime));
      sortedShifts.forEach((shift, index) => {
        const duration = shiftDurationHours(shift);
        if (duration <= 0 || !shift.endTime) return;
        const shiftShare = duration / workedHours;
        const shiftEarnings = earnings * shiftShare;
        if (index < sortedShifts.length / 2) firstHalf.push(shiftEarnings / duration);
        else secondHalf.push(shiftEarnings / duration);

        const startMs = Date.parse(shift.startTime);
        const endMs = Date.parse(shift.endTime);
        for (let hour = 0; hour < 24; hour++) {
          const hours = overlapHours(startMs, endMs, hour, day.date);
          if (hours <= 0) continue;
          const current = hourMap.get(hour) ?? { earnings: 0, hours: 0, appTotals: {} };
          current.hours += hours;
          current.earnings += shiftEarnings * (hours / duration);
          for (const [app, value] of Object.entries(day.apps || {})) {
            current.appTotals[app] = (current.appTotals[app] || 0) + (Number(value) || 0) * shiftShare * (hours / duration);
          }
          hourMap.set(hour, current);
        }
      });
    }
  }

  const estimatedHourlyHeatmap = Array.from({ length: 24 }, (_, hour) => {
    const value = hourMap.get(hour) ?? { earnings: 0, hours: 0, appTotals: {} };
    return {
      hour,
      label: hourLabel(hour),
      earnings: round(value.earnings),
      hours: round(value.hours),
      earningsPerHour: value.hours > 0 ? round(value.earnings / value.hours) : 0,
    };
  });
  const snapshotHourMap = buildSnapshotHourMap(earningsSnapshots);
  const snapshotObservationCount = [...snapshotHourMap.values()].reduce((sum, value) => sum + value.observations, 0);
  const hasSnapshotTimingData = snapshotObservationCount >= 3;
  const timingSource = hasSnapshotTimingData ? "snapshot" : "estimated";
  const hourlyHeatmap = hasSnapshotTimingData
    ? Array.from({ length: 24 }, (_, hour) => {
        const value = snapshotHourMap.get(hour) ?? { earnings: 0, observations: 0, appTotals: {} };
        return {
          hour,
          label: hourLabel(hour),
          earnings: round(value.earnings),
          hours: value.observations,
          earningsPerHour: round(value.earnings),
          observations: value.observations,
        };
      })
    : estimatedHourlyHeatmap;
  const workedBuckets = hourlyHeatmap.filter((bucket) => bucket.hours >= 0.5);
  const strongestHours = [...workedBuckets].sort((a, b) => b.earningsPerHour - a.earningsPerHour).slice(0, 3);
  const recoveryWindows = [...workedBuckets].sort((a, b) => a.earningsPerHour - b.earningsPerHour).slice(0, 3);

  const appHourEntries = hasSnapshotTimingData
    ? [...snapshotHourMap.entries()].map(([hour, value]) => [hour, { ...value, hours: value.observations }] as const)
    : [...hourMap.entries()];

  const bestAppsByHour = appHourEntries
    .map(([hour, value]) => {
      const appTotals = value.appTotals as Record<string, number>;
      const best = Object.entries(appTotals).sort((a, b) => b[1] - a[1])[0];
      return best ? { hour, label: hourLabel(hour), app: best[0], earnings: round(best[1]) } : null;
    })
    .filter((item): item is { hour: number; label: string; app: string; earnings: number } => Boolean(item))
    .filter((item) => item.earnings > 0)
    .sort((a, b) => b.earnings - a.earnings)
    .slice(0, 6);

  const morning = workedBuckets.filter((bucket) => bucket.hour >= 5 && bucket.hour < 12);
  const night = workedBuckets.filter((bucket) => bucket.hour >= 17 || bucket.hour < 2);
  const morningEarnings = morning.reduce((sum, bucket) => sum + bucket.earnings, 0);
  const morningHours = morning.reduce((sum, bucket) => sum + bucket.hours, 0);
  const nightEarnings = night.reduce((sum, bucket) => sum + bucket.earnings, 0);
  const nightHours = night.reduce((sum, bucket) => sum + bucket.hours, 0);
  const morningEph = morningHours ? morningEarnings / morningHours : 0;
  const nightEph = nightHours ? nightEarnings / nightHours : 0;
  const hasMorningNight = morningHours >= 1 && nightHours >= 1;
  const style = !hasMorningNight ? "insufficient" : morningEph > nightEph * 1.15 ? "morning" : nightEph > morningEph * 1.15 ? "night" : "balanced";

  const summary = {
    totalShifts,
    completedShifts,
    activeShifts,
    workDays,
    multiShiftDays,
    totalHours: round(totalHours),
    averageShiftHours: completedShifts > 0 ? round(totalHours / completedShifts) : null,
    totalMiles: round(totalMiles),
    earningsPerHour: totalHours > 0 ? round(totalShiftEarnings / totalHours) : null,
    earningsPerMile: totalMiles > 0 ? round(totalShiftEarnings / totalMiles) : null,
    milesPerHour: totalHours > 0 ? round(totalMiles / totalHours) : null,
  };

  return {
    summary,
    hourlyHeatmap,
    strongestHours,
    recoveryWindows,
    bestAppsByHour,
    morningVsNight: {
      style,
      morningEarningsPerHour: round(morningEph),
      nightEarningsPerHour: round(nightEph),
      copy: hasSnapshotTimingData
        ? style === "morning"
          ? "Your saved earning updates lean stronger earlier in the day."
          : style === "night"
          ? "Your saved earning updates lean stronger later in the day."
          : style === "balanced"
          ? "Morning and night earning updates look fairly balanced so far."
          : "Save a few more earning updates across the day to compare your operating style."
        : style === "morning"
        ? "Estimated from shift duration: your shifts lean stronger earlier in the day."
        : style === "night"
        ? "Estimated from shift duration: your shifts lean stronger later in the day."
        : style === "balanced"
        ? "Estimated from shift duration: morning and night performance look fairly balanced so far."
        : "Log a few morning and evening shifts to compare your operating style.",
    },
    productivityWindows: strongestHours.map((bucket) => ({
      label: bucket.label,
      earningsPerHour: bucket.earningsPerHour,
      hours: bucket.hours,
    })),
    fatigueNote: firstHalf.length >= 2 && secondHalf.length >= 2 &&
      (secondHalf.reduce((sum, value) => sum + value, 0) / secondHalf.length) <
        (firstHalf.reduce((sum, value) => sum + value, 0) / firstHalf.length) * 0.75
      ? "Longer work blocks show some softer output later in the session. Treat it as a pacing signal, not a warning."
      : null,
    hasEnoughShiftData: totalShifts >= 3 && totalHours >= 3,
    hasEnoughTimingData: hasSnapshotTimingData || (totalShifts >= 3 && totalHours >= 3),
    timingSource,
    timingSourceLabel: hasSnapshotTimingData ? "Observed from earnings updates" : "Estimated from shift duration",
    timingCopy: hasSnapshotTimingData
      ? "Based on saved earnings updates. This is more grounded than shift spreading, but still not ride-level timestamp data."
      : "Estimated by spreading daily earnings across completed shift time. This is directional, not ride-level hourly truth.",
  };
}
