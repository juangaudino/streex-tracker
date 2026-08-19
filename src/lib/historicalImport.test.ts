import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { dayTotal } from "./store";
import { getDayRideCount, getDayShiftHours } from "./shiftIntelligence";
import { issueCounts, mergeHistoricalImport, parseHistoricalWorkbook } from "./historicalImport";
import type { WeekRecord } from "./types";

async function workbookBytes(): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  const daily = workbook.addWorksheet("Daily Earnings");
  daily.addRow(["title"]);
  daily.addRow(["subtitle"]);
  daily.addRow([]);
  daily.addRow(["date", "app", "regular_earnings", "bonus_earnings", "source_daily_total", "daily_miles", "daily_rides", "worked_hours", "notes", "day_closed"]);
  daily.addRow(["2026-01-05", "Uber", 100, null, 160, 50, 5, 4, "Airport", true]);
  daily.addRow(["2026-01-05", "Lyft", 50]);

  const shifts = workbook.addWorksheet("Optional Shifts");
  shifts.addRow(["title"]);
  shifts.addRow(["subtitle"]);
  shifts.addRow([]);
  shifts.addRow(["date", "shift_key", "start_datetime", "end_datetime", "shift_earnings", "shift_miles", "shift_rides", "uber_rides", "lyft_rides"]);
  shifts.addRow(["2026-01-05", "morning", "2026-01-05 09:00", "2026-01-05 13:00", 150, 50, 5, 4, 1]);

  const pauses = workbook.addWorksheet("Pauses");
  pauses.addRow(["title"]);
  pauses.addRow(["subtitle"]);
  pauses.addRow([]);
  pauses.addRow(["date", "shift_key", "pause_number", "pause_start_datetime", "pause_end_datetime"]);
  pauses.addRow(["2026-01-05", "morning", 1, "2026-01-05 11:00", "2026-01-05 11:30"]);

  const bonuses = workbook.addWorksheet("Bonuses");
  bonuses.addRow(["title"]);
  bonuses.addRow(["subtitle"]);
  bonuses.addRow([]);
  bonuses.addRow(["date", "app", "amount", "source", "notes"]);
  bonuses.addRow(["2026-01-05", "Uber", 10, "manual", "Tip adjustment"]);

  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer as unknown as ArrayBuffer);
}

async function shiftsOnlyWorkbookBytes(): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  const shifts = workbook.addWorksheet("Optional Shifts");
  shifts.addRow(["title"]);
  shifts.addRow(["subtitle"]);
  shifts.addRow([]);
  shifts.addRow(["date", "shift_key", "start_datetime", "end_datetime", "shift_earnings", "shift_miles", "shift_rides"]);
  shifts.addRow(["2026-01-05", "morning", "2026-01-05 09:00", "2026-01-05 13:00", 150, 50, 5]);
  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer as unknown as ArrayBuffer);
}

function existingWeek(): WeekRecord {
  return {
    id: "existing-week",
    startDate: "2026-01-05",
    endDate: "2026-01-11",
    weeklyGoal: 1200,
    status: "closed",
    entries: Array.from({ length: 7 }, (_, index) => ({
      dayName: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][index] as WeekRecord["entries"][number]["dayName"],
      date: `2026-01-${String(5 + index).padStart(2, "0")}`,
      apps: index === 0 ? { Uber: 100 } : {},
    })),
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("historical import", () => {
  it("parses daily detail, pauses, bonuses, and precise historical blocks", async () => {
    const preview = await parseHistoricalWorkbook(await workbookBytes(), 1200);
    const counts = issueCounts(preview.issues);
    expect(counts.errors).toBe(0);
    expect(counts.warnings).toBeGreaterThan(0);
    expect(preview.stats.days).toBe(1);
    expect(preview.stats.shifts).toBe(1);
    expect(preview.stats.bonuses).toBe(1);

    const day = preview.weeks[0].entries[0];
    expect(dayTotal(day)).toBe(160);
    expect(day.apps).toEqual({ Uber: 100, Lyft: 50 });
    expect(getDayRideCount(day)).toBe(5);
    expect(getDayShiftHours(day)).toBe(3.5);
    expect(day.shifts?.[0].blocks).toHaveLength(2);
    expect(day.shifts?.[0].ridesByApp).toEqual({ Uber: 4, Lyft: 1 });
  });

  it("fills only missing fields and blocks conflicting existing money", async () => {
    const preview = await parseHistoricalWorkbook(await workbookBytes(), 1200);
    const merged = mergeHistoricalImport(preview, [existingWeek()], 1200);
    expect(merged.conflicts).toHaveLength(0);
    expect(merged.changedWeekIds).toEqual(["existing-week"]);
    const mergedDay = merged.weeks.find((week) => week.id === "existing-week")?.entries[0];
    expect(mergedDay?.apps).toMatchObject({ Uber: 100, Lyft: 50 });
    expect(mergedDay?.shifts).toHaveLength(1);

    const conflicting = existingWeek();
    conflicting.entries[0].apps.Uber = 120;
    const conflictResult = mergeHistoricalImport(preview, [conflicting], 1200);
    expect(conflictResult.conflicts.some((conflict) => conflict.field === "apps.Uber")).toBe(true);
  });

  it("can add precise shifts without requiring a duplicate daily earnings row", async () => {
    const preview = await parseHistoricalWorkbook(await shiftsOnlyWorkbookBytes(), 1200);
    const counts = issueCounts(preview.issues);
    expect(counts.errors).toBe(0);
    expect(counts.warnings).toBe(1);
    expect(preview.stats.days).toBe(1);
    expect(preview.stats.shifts).toBe(1);
    const merged = mergeHistoricalImport(preview, [existingWeek()], 1200);
    expect(merged.conflicts).toHaveLength(0);
    expect(merged.weeks.find((week) => week.id === "existing-week")?.entries[0].shifts).toHaveLength(1);
  });

  it("accepts the normalized CSV form for daily earnings", async () => {
    const file = {
      name: "history.csv",
      text: async () => "date,app,regular_earnings,daily_miles,daily_rides,worked_hours\n2026-01-05,Uber,125.5,42,4,3.25\n",
    } as unknown as File;
    const preview = await parseHistoricalWorkbook(file, 1200);
    expect(issueCounts(preview.issues).errors).toBe(0);
    expect(preview.weeks[0].entries[0].apps).toEqual({ Uber: 125.5 });
    expect(preview.weeks[0].entries[0].workedHours).toBe(3.25);
  });
});
