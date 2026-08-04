import { dateRangeForPreset, type DeepInsightsFilters } from "./deepInsights";
import { operationalDayTotal } from "./rewardIncome";
import { getShiftBlocks, getShiftMiles, resolveShiftEarnings, shiftDurationHours } from "./shiftIntelligence";
import { buildAttributedHourAmounts } from "./earningsAttributions";
import type { DayEntry, EarningsAttribution, EarningsSnapshot, OperationalSnapshot, ShiftSession, WeekRecord } from "./types";

export type OperationalSource = "Confirmed" | "Attributed" | "Estimated" | "Mixed" | "Insufficient";
export type OperationalWindowPreset = "all" | "morning" | "afternoon" | "evening" | "late-night" | "custom";

export interface OperationalExplorerFilters {
  windowPreset: OperationalWindowPreset;
  windowStart?: string;
  windowEnd?: string;
}

export interface OperationalBucket {
  hour: number;
  label: string;
  hours: number;
  earnings: number;
  rides: number;
  miles: number;
  earningsPerHour: number | null;
  ridesPerHour: number | null;
  milesPerHour: number | null;
  source: OperationalSource;
}

export interface OperationalWeekdayRow {
  dayName: string;
  hours: number;
  earnings: number;
  rate: number | null;
  days: number;
}

export interface OperationalExplorerData {
  totals: {
    earnings: number;
    hours: number;
    rides: number;
    miles: number;
    earningsPerHour: number | null;
    ridesPerHour: number | null;
    milesPerHour: number | null;
    earningsPerMile: number | null;
    earningsPerRide: number | null;
    milesPerRide: number | null;
    minutesPerRide: number | null;
    shifts: number;
    days: number;
  };
  source: OperationalSource;
  sampleLabel: "Insufficient" | "Low sample" | "Reliable sample";
  coverage: number;
  windowLabel: string;
  hourly: OperationalBucket[];
  weekdays: OperationalWeekdayRow[];
  heatmap: Array<{ dayName: string; hours: Array<{ hour: number; hours: number; rate: number | null }> }>;
  bestWindows: OperationalBucket[];
  observations: string[];
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const WINDOW_MAP: Record<Exclude<OperationalWindowPreset, "all" | "custom">, [number, number, string]> = {
  morning: [5 * 60, 12 * 60, "Morning · 5 AM–12 PM"],
  afternoon: [12 * 60, 17 * 60, "Afternoon · 12–5 PM"],
  evening: [17 * 60, 22 * 60, "Evening · 5–10 PM"],
  "late-night": [22 * 60, 5 * 60, "Late night · 10 PM–5 AM"],
};

const round = (value: number, digits = 2) => Number(value.toFixed(digits));
const timeMinutes = (value = "00:00") => {
  const [hours, minutes] = value.split(":").map(Number);
  return Math.max(0, Math.min(1439, (hours || 0) * 60 + (minutes || 0)));
};

function windowDefinition(filters: OperationalExplorerFilters): { start: number; end: number; label: string } | null {
  if (filters.windowPreset === "all") return null;
  if (filters.windowPreset === "custom") {
    const start = timeMinutes(filters.windowStart);
    const end = timeMinutes(filters.windowEnd || "23:59");
    return { start, end, label: `Custom · ${filters.windowStart || "00:00"}–${filters.windowEnd || "23:59"}` };
  }
  const [start, end, label] = WINDOW_MAP[filters.windowPreset];
  return { start, end, label };
}

function includedMinute(minute: number, window: ReturnType<typeof windowDefinition>): boolean {
  if (!window) return true;
  return window.start < window.end
    ? minute >= window.start && minute < window.end
    : minute >= window.start || minute < window.end;
}

function blockSegments(shift: ShiftSession, window: ReturnType<typeof windowDefinition>) {
  const segments: Array<{ hour: number; hours: number }> = [];
  for (const block of getShiftBlocks(shift)) {
    if (!block.endTime) continue;
    let cursor = Date.parse(block.startTime);
    const end = Date.parse(block.endTime);
    if (!Number.isFinite(cursor) || !Number.isFinite(end) || end <= cursor) continue;
    while (cursor < end) {
      const date = new Date(cursor);
      const nextQuarter = new Date(date);
      nextQuarter.setMinutes((Math.floor(date.getMinutes() / 15) + 1) * 15, 0, 0);
      const segmentEnd = Math.min(end, nextQuarter.getTime());
      const minute = date.getHours() * 60 + date.getMinutes();
      if (includedMinute(minute, window)) {
        segments.push({ hour: date.getHours(), hours: (segmentEnd - cursor) / 3_600_000 });
      }
      cursor = segmentEnd;
    }
  }
  return segments;
}

function metricDeltas(snapshots: OperationalSnapshot[], day: DayEntry, shift: ShiftSession, app: string | null) {
  const allDay = snapshots.filter((snapshot) => snapshot.dayDate === day.date).sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
  const relevant = allDay.filter((snapshot) => snapshot.shiftId === shift.id);
  let previousRides = 0;
  return relevant.map((snapshot) => {
    const ridesNow = app
      ? Number(snapshot.ridesByApp[app]) || 0
      : Object.values(snapshot.ridesByApp).reduce((sum, value) => sum + (Number(value) || 0), 0);
    const rides = Math.max(0, ridesNow - previousRides);
    const dayIndex = allDay.findIndex((item) => item.eventKey === snapshot.eventKey);
    const previousMiles = dayIndex > 0 ? allDay[dayIndex - 1].dayMileage : 0;
    const miles = Math.max(0, snapshot.dayMileage - previousMiles);
    previousRides = ridesNow;
    return { at: snapshot.recordedAt, rides, miles };
  });
}

export function buildOperationalExplorerData(args: {
  weeks: WeekRecord[];
  earningsSnapshots?: EarningsSnapshot[];
  earningsAttributions?: EarningsAttribution[];
  operationalSnapshots?: OperationalSnapshot[];
  globalFilters: DeepInsightsFilters;
  operationalFilters: OperationalExplorerFilters;
  now?: Date;
}): OperationalExplorerData {
  const { weeks, earningsSnapshots = [], earningsAttributions = [], operationalSnapshots = [], globalFilters, operationalFilters, now = new Date() } = args;
  const range = dateRangeForPreset(globalFilters.timePreset, now, globalFilters.customStart, globalFilters.customEnd);
  const selectedDays = new Set(globalFilters.weekdays ?? []);
  const app = globalFilters.app === "all" ? null : globalFilters.app;
  const window = windowDefinition(operationalFilters);
  const buckets = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    label: new Date(2020, 0, 1, hour).toLocaleTimeString("en-US", { hour: "numeric" }),
    hours: 0, earnings: 0, rides: 0, miles: 0, confirmed: 0, attributed: 0, estimated: 0,
  }));
  const weekday = new Map(DAYS.map((name) => [name, { hours: 0, earnings: 0, dates: new Set<string>() }]));
  const heatmap = new Map(DAYS.map((name) => [name, Array.from({ length: 24 }, () => ({ hours: 0, earnings: 0 }))]));
  let shifts = 0;
  const dates = new Set<string>();
  let confirmedWeight = 0;
  let attributedWeight = 0;
  let estimatedWeight = 0;
  const attributedSegments = buildAttributedHourAmounts({ weeks, snapshots: earningsSnapshots, attributions: earningsAttributions });

  for (const week of weeks) for (const day of week.entries) {
    if ((range.start && day.date < range.start) || (range.end && day.date > range.end)) continue;
    if (selectedDays.size && !selectedDays.has(day.dayName)) continue;
    for (const shift of day.shifts ?? []) {
      if (!shift.endTime) continue;
      const totalShiftHours = shiftDurationHours(shift);
      const segments = blockSegments(shift, window);
      const includedHours = segments.reduce((sum, segment) => sum + segment.hours, 0);
      if (includedHours <= 0 || totalShiftHours <= 0) continue;
      shifts += 1;
      dates.add(day.date);
      const weekdayRow = weekday.get(day.dayName)!;
      weekdayRow.hours += includedHours;
      weekdayRow.dates.add(day.date);

      const shiftAttributed = attributedSegments.filter((item) => item.dayDate === day.date && item.shiftId === shift.id && (!app || item.app === app));
      const attributedTotal = shiftAttributed.reduce((sum, item) => sum + item.amount, 0);
      const completedDayHours = (day.shifts ?? []).filter((item) => item.endTime).reduce((sum, item) => sum + shiftDurationHours(item), 0);
      const appTotal = app ? Math.max(0, Number(day.apps[app]) || 0) : null;
      const appPositiveSnapshots = app ? earningsSnapshots.reduce((sum, snapshot) => {
        return snapshot.dayDate === day.date && snapshot.app === app && Number(snapshot.delta) > 0
          ? sum + Number(snapshot.delta)
          : sum;
      }, 0) : 0;
      const appBaseline = appTotal !== null ? Math.max(0, appTotal - appPositiveSnapshots) : 0;
      const resolved = resolveShiftEarnings(day, shift, earningsSnapshots, earningsAttributions, weeks).earnings;
      const proratedDayEarnings = completedDayHours > 0 ? operationalDayTotal(day) * (totalShiftHours / completedDayHours) : 0;
      const shiftEarnings = appTotal !== null
        ? attributedTotal + (completedDayHours > 0 ? appBaseline * (totalShiftHours / completedDayHours) : 0)
        : resolved ?? proratedDayEarnings;
      let earnings = 0;
      for (const attributed of shiftAttributed) {
        if (!includedMinute(attributed.hour * 60, window)) continue;
        buckets[attributed.hour].earnings += attributed.amount;
        if (attributed.confidence === "confirmed") buckets[attributed.hour].confirmed += attributed.amount;
        else buckets[attributed.hour].attributed += attributed.amount;
        heatmap.get(day.dayName)![attributed.hour].earnings += attributed.amount;
        earnings += attributed.amount;
        if (attributed.confidence === "confirmed") confirmedWeight += attributed.amount;
        else attributedWeight += attributed.amount;
      }
      const residual = Math.max(0, shiftEarnings - attributedTotal);
      if (residual > 0) {
        for (const segment of segments) {
          const amount = residual * (segment.hours / totalShiftHours);
          buckets[segment.hour].earnings += amount;
          buckets[segment.hour].estimated += amount;
          heatmap.get(day.dayName)![segment.hour].earnings += amount;
          earnings += amount;
          estimatedWeight += amount;
        }
      }
      weekdayRow.earnings += earnings;

      const deltas = metricDeltas(operationalSnapshots, day, shift, app);
      if (deltas.length) {
        for (const delta of deltas) {
          const date = new Date(delta.at);
          const minute = date.getHours() * 60 + date.getMinutes();
          if (!includedMinute(minute, window)) continue;
          buckets[date.getHours()].rides += delta.rides;
          buckets[date.getHours()].miles += delta.miles;
        }
      } else {
        const totalRides = app ? Number(shift.ridesByApp?.[app]) || 0 : Math.max(0, Number(shift.rideCount) || 0);
        const totalMiles = getShiftMiles(day, shift);
        for (const segment of segments) {
          buckets[segment.hour].rides += totalRides * (segment.hours / totalShiftHours);
          buckets[segment.hour].miles += totalMiles * (segment.hours / totalShiftHours);
        }
      }
      for (const segment of segments) {
        buckets[segment.hour].hours += segment.hours;
        heatmap.get(day.dayName)![segment.hour].hours += segment.hours;
      }
    }
  }

  const hourly: OperationalBucket[] = buckets.map((bucket) => ({
    hour: bucket.hour,
    label: bucket.label,
    hours: round(bucket.hours),
    earnings: round(bucket.earnings),
    rides: round(bucket.rides, 1),
    miles: round(bucket.miles, 1),
    earningsPerHour: bucket.hours >= 0.5 ? round(bucket.earnings / bucket.hours) : null,
    ridesPerHour: bucket.hours >= 0.5 ? round(bucket.rides / bucket.hours) : null,
    milesPerHour: bucket.hours >= 0.5 ? round(bucket.miles / bucket.hours) : null,
    source: [bucket.confirmed > 0, bucket.attributed > 0, bucket.estimated > 0].filter(Boolean).length > 1
      ? "Mixed"
      : bucket.confirmed ? "Confirmed" : bucket.attributed ? "Attributed" : bucket.hours ? "Estimated" : "Insufficient",
  }));
  const hours = buckets.reduce((sum, bucket) => sum + bucket.hours, 0);
  const earnings = buckets.reduce((sum, bucket) => sum + bucket.earnings, 0);
  const rides = buckets.reduce((sum, bucket) => sum + bucket.rides, 0);
  const miles = buckets.reduce((sum, bucket) => sum + bucket.miles, 0);
  const sourceSignals = [confirmedWeight > 0, attributedWeight > 0, estimatedWeight > 0].filter(Boolean).length;
  const source: OperationalSource = sourceSignals > 1
    ? "Mixed"
    : confirmedWeight ? "Confirmed" : attributedWeight ? "Attributed" : hours ? "Estimated" : "Insufficient";
  const coverage = earnings > 0 ? round(((confirmedWeight + attributedWeight) / earnings) * 100) : 0;
  const bestWindows = hourly.filter((bucket) => bucket.earningsPerHour !== null && bucket.hours >= 0.5)
    .sort((a, b) => (b.earningsPerHour ?? 0) - (a.earningsPerHour ?? 0)).slice(0, 5);
  const totals = {
    earnings: round(earnings), hours: round(hours), rides: round(rides, 1), miles: round(miles, 1),
    earningsPerHour: hours >= 0.5 ? round(earnings / hours) : null,
    ridesPerHour: hours >= 0.5 ? round(rides / hours) : null,
    milesPerHour: hours >= 0.5 ? round(miles / hours) : null,
    earningsPerMile: miles > 0 ? round(earnings / miles) : null,
    earningsPerRide: rides > 0 ? round(earnings / rides) : null,
    milesPerRide: rides > 0 ? round(miles / rides) : null,
    minutesPerRide: rides > 0 ? round((hours * 60) / rides) : null,
    shifts, days: dates.size,
  };
  const observations = [
    bestWindows[0]?.earningsPerHour != null ? `${bestWindows[0].label} is the strongest measured hour at $${bestWindows[0].earningsPerHour.toFixed(2)}/hr.` : "More shift time is needed to identify a strongest hour.",
    totals.ridesPerHour != null ? `The selected scope averages ${totals.ridesPerHour.toFixed(2)} rides per worked hour.` : "Ride efficiency needs more tracked rides and hours.",
    coverage > 0 ? `${coverage.toFixed(0)}% of operational earnings in this view is timestamp-observed.` : "Historical timing is estimated from exact shift overlap; future Quick Updates improve precision.",
  ];

  return {
    totals,
    source,
    sampleLabel: hours < 0.5 || !shifts ? "Insufficient" : dates.size >= 3 && hours >= 5 ? "Reliable sample" : "Low sample",
    coverage,
    windowLabel: window?.label ?? "All worked hours",
    hourly,
    weekdays: DAYS.map((dayName) => {
      const row = weekday.get(dayName)!;
      return { dayName, hours: round(row.hours), earnings: round(row.earnings), rate: row.hours >= 0.5 ? round(row.earnings / row.hours) : null, days: row.dates.size };
    }),
    heatmap: DAYS.map((dayName) => ({
      dayName,
      hours: heatmap.get(dayName)!.map((cell, hour) => ({ hour, hours: round(cell.hours), rate: cell.hours >= 0.5 ? round(cell.earnings / cell.hours) : null })),
    })),
    bestWindows,
    observations,
  };
}
