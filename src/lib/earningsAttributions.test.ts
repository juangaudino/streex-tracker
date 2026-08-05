import { describe, expect, it } from "vitest";
import { attributedHoursForSnapshot, buildAttributionReviewItems, isExactTimeInsideWorkedShift, resolveDayPerformanceEarnings } from "./earningsAttributions";
import { resolveShiftRate } from "./shiftIntelligence";
import type { EarningsAttribution, EarningsSnapshot, WeekRecord } from "./types";

const shift = {
  id: "shift-1",
  startTime: "2026-07-10T13:00:00",
  endTime: "2026-07-10T16:00:00",
  blocks: [
    { id: "b1", startTime: "2026-07-10T13:00:00", endTime: "2026-07-10T14:00:00" },
    { id: "b2", startTime: "2026-07-10T14:30:00", endTime: "2026-07-10T16:00:00" },
  ],
};

const week: WeekRecord = {
  id: "week-1",
  startDate: "2026-07-06",
  endDate: "2026-07-12",
  weeklyGoal: 1000,
  status: "closed",
  createdAt: "2026-07-06T00:00:00Z",
  updatedAt: "2026-07-12T00:00:00Z",
  entries: [{
    dayName: "Friday",
    date: "2026-07-10",
    apps: { Uber: 120 },
    logged: true,
    shifts: [shift],
  }],
};

const lateSnapshot: EarningsSnapshot = {
  id: "snapshot-late",
  userId: "user-1",
  weekId: week.id,
  dayDate: "2026-07-10",
  app: "Uber",
  previousAmount: 100,
  newAmount: 120,
  delta: 20,
  shiftId: null,
  createdAt: "2026-07-10T20:00:00",
};

function attribution(overrides: Partial<EarningsAttribution>): EarningsAttribution {
  return {
    id: "attribution-1",
    userId: "user-1",
    snapshotId: lateSnapshot.id,
    amount: 20,
    status: "resolved",
    mode: "shift_distributed",
    attributedDayDate: "2026-07-10",
    shiftId: shift.id,
    effectiveStartAt: shift.startTime,
    effectiveEndAt: shift.endTime,
    source: "user",
    confidence: "estimated",
    createdAt: "2026-07-11T00:00:00Z",
    updatedAt: "2026-07-11T00:00:00Z",
    ...overrides,
  };
}

describe("earnings attribution integrity", () => {
  it("keeps a late unassigned update out of hourly timing and sends it to review", () => {
    expect(attributedHoursForSnapshot({ snapshot: lateSnapshot, weeks: [week], snapshots: [lateSnapshot] })).toEqual([]);
    const review = buildAttributionReviewItems({ weeks: [week], snapshots: [lateSnapshot] });
    expect(review).toHaveLength(1);
    expect(review[0]).toMatchObject({ reason: "after_shift", suggestedShiftId: shift.id });
  });

  it("places a user-confirmed exact tip in its original work hour", () => {
    const exact = attribution({
      mode: "exact",
      confidence: "confirmed",
      effectiveStartAt: "2026-07-10T14:45:00",
      effectiveEndAt: "2026-07-10T14:45:00",
    });
    expect(attributedHoursForSnapshot({ snapshot: lateSnapshot, attribution: exact, weeks: [week], snapshots: [lateSnapshot] })).toEqual([
      expect.objectContaining({ hour: 14, amount: 20, confidence: "confirmed", shiftId: shift.id }),
    ]);
  });

  it("distributes a shift-level tip only across worked blocks", () => {
    const segments = attributedHoursForSnapshot({ snapshot: lateSnapshot, attribution: attribution({}), weeks: [week], snapshots: [lateSnapshot] });
    expect(segments.map((item) => item.hour)).toEqual([13, 14, 15]);
    expect(segments.reduce((sum, item) => sum + item.amount, 0)).toBeCloseTo(20);
    expect(segments.find((item) => item.hour === 14)?.amount).toBeCloseTo(4);
  });

  it("adds an assigned late tip to the selected shift without changing the reported day total", () => {
    const rate = resolveShiftRate(week.entries[0], shift, [lateSnapshot], [attribution({})], [week]);
    expect(rate.earnings).toBe(120);
    expect(rate.rate).toBe(48);
    expect(week.entries[0].apps.Uber).toBe(120);
  });

  it("adds a cross-day tip to its earned shift even when that historical shift was already manually resolved", () => {
    const manualShift = { ...shift, earnings: 100 };
    const targetWeek: WeekRecord = { ...week, entries: [{ ...week.entries[0], apps: { Uber: 100 }, shifts: [manualShift] }] };
    const nextDaySnapshot = { ...lateSnapshot, id: "snapshot-next-day", dayDate: "2026-07-11", createdAt: "2026-07-11T09:00:00" };
    const resolved = attribution({ snapshotId: nextDaySnapshot.id });

    const rate = resolveShiftRate(targetWeek.entries[0], manualShift, [nextDaySnapshot], [resolved], [targetWeek]);
    expect(rate.earnings).toBe(120);
    expect(targetWeek.entries[0].apps.Uber).toBe(100);
  });

  it("attributes a live update interval before the shift is closed", () => {
    const activeShift = {
      id: "shift-live",
      startTime: "2026-07-10T13:00:00",
      blocks: [{ id: "live-block", startTime: "2026-07-10T13:00:00" }],
    };
    const activeWeek: WeekRecord = {
      ...week,
      entries: [{ ...week.entries[0], apps: { Uber: 20 }, shifts: [activeShift] }],
    };
    const liveSnapshot: EarningsSnapshot = {
      ...lateSnapshot,
      id: "snapshot-live",
      previousAmount: 0,
      newAmount: 20,
      delta: 20,
      shiftId: activeShift.id,
      createdAt: "2026-07-10T14:30:00",
    };
    const liveAttribution = attribution({
      snapshotId: liveSnapshot.id,
      mode: "update_interval",
      attributedDayDate: "2026-07-10",
      shiftId: activeShift.id,
      effectiveStartAt: activeShift.startTime,
      effectiveEndAt: liveSnapshot.createdAt,
      source: "automatic",
    });

    const segments = attributedHoursForSnapshot({ snapshot: liveSnapshot, attribution: liveAttribution, weeks: [activeWeek], snapshots: [liveSnapshot] });
    const performance = resolveDayPerformanceEarnings({ day: activeWeek.entries[0], weeks: [activeWeek], snapshots: [liveSnapshot], attributions: [liveAttribution] });

    expect(segments.map((item) => item.hour)).toEqual([13, 14]);
    expect(segments.reduce((sum, item) => sum + item.amount, 0)).toBeCloseTo(20);
    expect(performance).toMatchObject({ earnings: 20, excludedFromEfficiency: 0 });
  });

  it("rejects exact attribution during a pause", () => {
    expect(isExactTimeInsideWorkedShift(shift, "2026-07-10T14:15:00")).toBe(false);
    expect(isExactTimeInsideWorkedShift(shift, "2026-07-10T14:45:00")).toBe(true);
    const exactDuringPause = attribution({
      mode: "exact",
      confidence: "confirmed",
      effectiveStartAt: "2026-07-10T14:15:00",
      effectiveEndAt: "2026-07-10T14:15:00",
    });
    expect(attributedHoursForSnapshot({ snapshot: lateSnapshot, attribution: exactDuringPause, weeks: [week], snapshots: [lateSnapshot] })).toEqual([]);
    expect(buildAttributionReviewItems({ weeks: [week], snapshots: [lateSnapshot], attributions: [exactDuringPause] })).toEqual([
      expect.objectContaining({ reason: "invalid_exact", suggestedShiftId: shift.id }),
    ]);
  });
});
