import type { Workbook, Worksheet } from "exceljs";
import { DAY_NAMES, DEFAULT_APPS, type BonusEntry, type DayEntry, type ShiftSession, type WeekRecord } from "./types";
import { normalizeLegacyBonusWeek } from "./rewardIncome";

export type HistoricalImportIssueSeverity = "error" | "warning";

export interface HistoricalImportIssue {
  severity: HistoricalImportIssueSeverity;
  code: string;
  sheet: string;
  row: number;
  date?: string;
  message: string;
}

export interface HistoricalImportStats {
  sourceMode: "daily-earnings" | "days";
  dailyRows: number;
  shiftRows: number;
  pauseRows: number;
  bonusRows: number;
  days: number;
  weeks: number;
  shifts: number;
  bonuses: number;
}

export interface HistoricalImportPreview {
  weeks: WeekRecord[];
  issues: HistoricalImportIssue[];
  stats: HistoricalImportStats;
}

export interface HistoricalImportConflict {
  weekId: string;
  date?: string;
  field: string;
  message: string;
}

export interface HistoricalImportMergeResult {
  weeks: WeekRecord[];
  conflicts: HistoricalImportConflict[];
  changedWeekIds: string[];
  newWeekIds: string[];
}

export interface HistoricalImportSheetRow {
  rowNumber: number;
  values: Record<string, unknown>;
}

type DraftShift = {
  date: string;
  key: string;
  startTime: string;
  endTime: string;
  earnings?: number;
  miles?: number;
  rides?: number;
  ridesByApp?: Record<string, number>;
  note?: string;
  rowNumber: number;
};

type DraftPause = {
  date: string;
  key: string;
  startTime: string;
  endTime: string;
  rowNumber: number;
};

type DraftDay = {
  date: string;
  apps: Record<string, number>;
  bonuses: BonusEntry[];
  sourceTotal?: number;
  mileage?: number;
  rideCount?: number;
  workedHours?: number;
  logged?: boolean;
  dayClosed?: boolean;
  notes?: string;
  weeklyGoal?: number;
  weeklyHoursGoal?: number;
  shifts: DraftShift[];
};

const APP_ALIASES: Record<string, string> = {
  uber: "Uber",
  lyft: "Lyft",
  spark: "Spark Driver",
  "spark driver": "Spark Driver",
  "door dash": "DoorDash",
  doordash: "DoorDash",
  amazonflex: "Amazon Flex",
  "amazon flex": "Amazon Flex",
  instacart: "Instacart",
  shipt: "Shipt",
  octopus: "Octopus",
};

const APP_RIDE_COLUMNS: Record<string, string> = {
  uber_rides: "Uber",
  lyft_rides: "Lyft",
  spark_rides: "Spark Driver",
  spark_driver_rides: "Spark Driver",
  doordash_rides: "DoorDash",
  amazonflex_rides: "Amazon Flex",
  amazon_flex_rides: "Amazon Flex",
  instacart_rides: "Instacart",
  shipt_rides: "Shipt",
};

const EPSILON = 0.009;

function round(value: number): number {
  return Number(value.toFixed(2));
}

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[()\-/]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function cellValue(value: unknown): unknown {
  if (value && typeof value === "object" && "result" in value) return (value as { result?: unknown }).result;
  if (value && typeof value === "object" && "text" in value) return (value as { text?: unknown }).text;
  return value;
}

function isBlank(value: unknown): boolean {
  const normalized = cellValue(value);
  return normalized === null || normalized === undefined || String(normalized).trim() === "";
}

function excelSerialToDate(serial: number): Date {
  return new Date(Date.UTC(1899, 11, 30) + serial * 86_400_000);
}

function dateParts(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateTimeParts(date: Date): string {
  return `${dateParts(date)}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:00`;
}

function parseDateOnly(value: unknown): string | null {
  const normalized = cellValue(value);
  if (normalized instanceof Date && !Number.isNaN(normalized.getTime())) return dateParts(normalized);
  if (typeof normalized === "number" && Number.isFinite(normalized)) return dateParts(excelSerialToDate(normalized));
  const raw = String(normalized ?? "").trim();
  const iso = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) {
    const candidate = iso[1];
    const date = new Date(`${candidate}T12:00:00`);
    return Number.isNaN(date.getTime()) ? null : candidate;
  }
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? null : dateParts(new Date(parsed));
}

function parseDateTime(value: unknown, date: string): string | null {
  const normalized = cellValue(value);
  if (normalized instanceof Date && !Number.isNaN(normalized.getTime())) {
    const output = dateTimeParts(normalized);
    return output.slice(0, 10) === date ? output : null;
  }
  if (typeof normalized === "number" && Number.isFinite(normalized)) {
    const output = dateTimeParts(excelSerialToDate(normalized));
    return output.slice(0, 10) === date ? output : null;
  }
  const raw = String(normalized ?? "").trim();
  if (!raw) return null;
  const timeOnly = raw.match(/^(\d{1,2}):([0-5]\d)(?::([0-5]\d))?$/);
  if (timeOnly) {
    return `${date}T${String(Number(timeOnly[1])).padStart(2, "0")}:${timeOnly[2]}:${timeOnly[3] ?? "00"}`;
  }
  const local = raw.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{1,2}):([0-5]\d)(?::([0-5]\d))?/);
  if (local) {
    if (local[1] !== date) return null;
    return `${date}T${String(Number(local[2])).padStart(2, "0")}:${local[3]}:${local[4] ?? "00"}`;
  }
  const parsed = Date.parse(raw);
  if (Number.isNaN(parsed)) return null;
  const output = dateTimeParts(new Date(parsed));
  return output.slice(0, 10) === date ? output : null;
}

function parseNumber(value: unknown): number | null | undefined {
  const normalized = cellValue(value);
  if (isBlank(normalized)) return undefined;
  const parsed = typeof normalized === "number" ? normalized : Number(String(normalized).trim().replace(/[$,]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseBoolean(value: unknown): boolean | undefined | null {
  const normalized = cellValue(value);
  if (isBlank(normalized)) return undefined;
  if (normalized === true || normalized === 1) return true;
  if (normalized === false || normalized === 0) return false;
  const raw = String(normalized).trim().toLowerCase();
  if (["true", "yes", "y", "closed", "worked", "1"].includes(raw)) return true;
  if (["false", "no", "n", "open", "rest", "unknown", "0"].includes(raw)) return false;
  return null;
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    if (row.some((value) => value.trim() !== "")) rows.push(row);
    row = [];
  };

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += character;
      }
      continue;
    }
    if (character === '"' && field === "") {
      quoted = true;
    } else if (character === ",") {
      pushField();
    } else if (character === "\n") {
      pushRow();
    } else if (character !== "\r") {
      field += character;
    }
  }
  if (field || row.length) pushRow();
  return rows;
}

function canonicalApp(value: unknown): string | undefined {
  if (isBlank(value)) return undefined;
  const raw = String(cellValue(value)).trim();
  return APP_ALIASES[raw.toLowerCase()] ?? raw;
}

function dayNameForDate(date: string): (typeof DAY_NAMES)[number] {
  const day = new Date(`${date}T12:00:00`).getDay();
  return DAY_NAMES[day === 0 ? 6 : day - 1];
}

function mondayForDate(date: string): string {
  const current = new Date(`${date}T12:00:00`);
  const day = current.getDay();
  current.setDate(current.getDate() - (day === 0 ? 6 : day - 1));
  return dateParts(current);
}

function rowIsEmpty(row: Record<string, unknown>): boolean {
  return Object.values(row).every(isBlank);
}

function worksheetRows(sheet: Worksheet | undefined): HistoricalImportSheetRow[] {
  if (!sheet) return [];
  let headerRow = 0;
  let headers: string[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (headerRow) return;
    const values = Array.isArray(row.values) ? row.values.slice(1) : [];
    const normalized = values.map(normalizeHeader);
    if (normalized.includes("date")) {
      headerRow = rowNumber;
      headers = normalized;
    }
  });
  if (!headerRow) return [];
  const output: HistoricalImportSheetRow[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRow) return;
    const values = Array.isArray(row.values) ? row.values.slice(1) : [];
    const record: Record<string, unknown> = {};
    headers.forEach((header, index) => {
      if (header) record[header] = cellValue(values[index]);
    });
    if (!rowIsEmpty(record) && !String(record.date ?? "").toLowerCase().includes("example")) {
      output.push({ rowNumber, values: record });
    }
  });
  return output;
}

function findSheet(workbook: Workbook, names: string[]): Worksheet | undefined {
  const wanted = new Set(names.map((name) => name.toLowerCase()));
  return workbook.worksheets.find((sheet) => wanted.has(sheet.name.trim().toLowerCase()));
}

function pushIssue(issues: HistoricalImportIssue[], issue: HistoricalImportIssue): void {
  issues.push(issue);
}

function readNonNegative(
  row: HistoricalImportSheetRow,
  field: string,
  label: string,
  issues: HistoricalImportIssue[],
  date?: string,
  integer = false,
  sheet = "Daily Earnings",
): number | undefined {
  const value = parseNumber(row.values[field]);
  if (value === undefined) return undefined;
  if (value === null || value < 0 || (integer && !Number.isInteger(value))) {
    pushIssue(issues, {
      severity: "error",
      code: "INVALID_NUMBER",
      sheet,
      row: row.rowNumber,
      date,
      message: `${label} must be a non-negative ${integer ? "whole " : ""}number or blank.`,
    });
    return undefined;
  }
  return round(value);
}

function addDayMetadata(
  day: DraftDay,
  row: HistoricalImportSheetRow,
  issues: HistoricalImportIssue[],
  sheet: string,
): void {
  const setOnce = (field: keyof DraftDay, value: unknown, label: string) => {
    if (value === undefined) return;
    const current = day[field];
    if (current === undefined) {
      (day as unknown as Record<string, unknown>)[field] = value;
      return;
    }
    if (typeof current === "number" && typeof value === "number" && Math.abs(current - value) <= EPSILON) return;
    if (current === value) return;
    pushIssue(issues, {
      severity: "error",
      code: "CONFLICTING_DAY_METADATA",
      sheet,
      row: row.rowNumber,
      date: day.date,
      message: `${label} is different on another row for ${day.date}. Enter it once or repeat exactly the same value.`,
    });
  };

  const mileage = readNonNegative(row, "daily_miles", "Daily miles", issues, day.date, false, sheet);
  const rides = readNonNegative(row, "daily_rides", "Daily rides", issues, day.date, true, sheet);
  const workedHours = readNonNegative(row, "worked_hours", "Worked hours", issues, day.date, false, sheet);
  const weeklyGoal = readNonNegative(row, "weekly_goal", "Weekly goal", issues, day.date, false, sheet);
  const weeklyHoursGoal = readNonNegative(row, "weekly_hours_goal", "Weekly hours goal", issues, day.date, false, sheet);
  const dayClosed = parseBoolean(row.values.day_closed);
  const dayStatus = isBlank(row.values.day_status) ? undefined : String(row.values.day_status).trim().toLowerCase();
  const logged = dayStatus === "rest" || dayStatus === "worked" ? true : dayStatus === "unknown" ? false : undefined;

  if (dayClosed === null) {
    pushIssue(issues, { severity: "error", code: "INVALID_BOOLEAN", sheet, row: row.rowNumber, date: day.date, message: "day_closed must be TRUE/FALSE, yes/no, 1/0, or blank." });
  }
  if (dayStatus && !["worked", "rest", "unknown"].includes(dayStatus)) {
    pushIssue(issues, { severity: "error", code: "INVALID_DAY_STATUS", sheet, row: row.rowNumber, date: day.date, message: "day_status must be worked, rest, unknown, or blank." });
  }

  setOnce("mileage", mileage, "Daily miles");
  setOnce("rideCount", rides, "Daily rides");
  setOnce("workedHours", workedHours, "Worked hours");
  setOnce("weeklyGoal", weeklyGoal, "Weekly goal");
  setOnce("weeklyHoursGoal", weeklyHoursGoal, "Weekly hours goal");
  setOnce("dayClosed", dayClosed, "Closed state");
  setOnce("logged", logged, "Day status");

  const notes = isBlank(row.values.notes) ? undefined : String(row.values.notes).trim();
  if (notes) setOnce("notes", notes, "Notes");
}

function buildBlocks(shift: DraftShift, pauses: DraftPause[]): ShiftSession["blocks"] {
  const relevant = pauses.filter((pause) => pause.date === shift.date && pause.key === shift.key).sort((a, b) => a.startTime.localeCompare(b.startTime));
  const blocks: NonNullable<ShiftSession["blocks"]> = [];
  let cursor = shift.startTime;
  relevant.forEach((pause, index) => {
    if (pause.startTime > cursor) blocks.push({ id: `${shift.key}_block_${index + 1}`, startTime: cursor, endTime: pause.startTime });
    cursor = pause.endTime;
  });
  if (cursor < shift.endTime) blocks.push({ id: `${shift.key}_block_${blocks.length + 1}`, startTime: cursor, endTime: shift.endTime });
  return blocks.length ? blocks : [{ id: `${shift.key}_block_1`, startTime: shift.startTime, endTime: shift.endTime }];
}

function signatureForBonus(bonus: BonusEntry): string {
  return `${bonus.app}|${round(bonus.amount)}|${bonus.source ?? "manual"}`;
}

function shiftSignature(shift: ShiftSession): string {
  return [shift.startTime, shift.endTime ?? "", shift.earnings ?? "", shift.miles ?? "", shift.rideCount ?? "", JSON.stringify(shift.ridesByApp ?? {})].join("|");
}

function createWeekDraft(startDate: string, days: Map<string, DraftDay>, pauses: DraftPause[], defaultWeeklyGoal: number, now: string): WeekRecord {
  const entries: DayEntry[] = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(`${startDate}T12:00:00`);
    date.setDate(date.getDate() + index);
    const dateKey = dateParts(date);
    const draft = days.get(dateKey);
    const entry: DayEntry = {
      dayName: dayNameForDate(dateKey),
      date: dateKey,
      apps: draft?.apps ?? {},
    };
    if (!draft) return entry;
    if (draft.bonuses.length) entry.bonuses = draft.bonuses;
    if (draft.logged !== undefined) entry.logged = draft.logged;
    if (draft.dayClosed !== undefined) entry.dayClosed = draft.dayClosed;
    if (draft.shifts.length) entry.shifts = draft.shifts.map((draftShift) => ({
      id: `historical_shift_${draftShift.date}_${draftShift.key}`.replace(/[^a-zA-Z0-9_-]/g, "_"),
      startTime: draftShift.startTime,
      endTime: draftShift.endTime,
      blocks: buildBlocks(draftShift, pauses),
      earnings: draftShift.earnings,
      miles: draftShift.miles,
      rideCount: draftShift.rides,
      ridesByApp: draftShift.ridesByApp,
      note: draftShift.note,
    }));
    if (draft.workedHours !== undefined) entry.workedHours = draft.workedHours;
    if (draft.rideCount !== undefined) entry.rideCount = draft.rideCount;
    if (draft.mileage !== undefined) entry.mileage = draft.mileage;
    if (draft.notes) entry.notes = draft.notes;
    entry.logged = entry.logged ?? Boolean(Object.keys(entry.apps).length || entry.bonuses?.length || entry.shifts?.length || entry.workedHours || entry.rideCount || entry.mileage);
    return entry;
  });
  const weeklyGoal = [...days.values()].find((day) => day.weeklyGoal !== undefined)?.weeklyGoal ?? defaultWeeklyGoal;
  const weeklyHoursGoal = [...days.values()].find((day) => day.weeklyHoursGoal !== undefined)?.weeklyHoursGoal;
  return normalizeLegacyBonusWeek({
    id: `historical_week_${startDate}`,
    startDate,
    endDate: entries[6].date,
    weeklyGoal,
    weeklyHoursGoal,
    status: "closed",
    entries,
    createdAt: now,
    updatedAt: now,
  });
}

function appendDateRows(
  rows: HistoricalImportSheetRow[],
  days: Map<string, DraftDay>,
  issues: HistoricalImportIssue[],
  sheet: string,
  stats: HistoricalImportStats,
): void {
  rows.forEach((row) => {
    const date = parseDateOnly(row.values.date);
    stats.dailyRows += 1;
    if (!date) {
      pushIssue(issues, { severity: "error", code: "INVALID_DATE", sheet, row: row.rowNumber, message: "date must be an ISO date (YYYY-MM-DD), an Excel date, or a recognizable date value." });
      return;
    }
    const day = days.get(date) ?? { date, apps: {}, bonuses: [], shifts: [] };
    const app = canonicalApp(row.values.app);
    const regular = readNonNegative(row, "regular_earnings", "Regular earnings", issues, date, false, sheet);
    const bonus = readNonNegative(row, "bonus_earnings", "Bonus earnings", issues, date, false, sheet);
    if ((regular !== undefined || bonus !== undefined) && !app) {
      pushIssue(issues, { severity: "error", code: "APP_REQUIRED", sheet, row: row.rowNumber, date, message: "app is required when regular_earnings or bonus_earnings is provided. Use Unattributed when the source is unknown." });
    }
    if (app && regular !== undefined) {
      const hasExistingValue = Object.prototype.hasOwnProperty.call(day.apps, app);
      if (hasExistingValue) {
        if (!sameNumber(day.apps[app], regular)) {
          pushIssue(issues, { severity: "error", code: "DUPLICATE_APP_ROW", sheet, row: row.rowNumber, date, message: `${app} appears more than once for this date with different regular_earnings. Keep one row per date + app.` });
        } else {
          pushIssue(issues, { severity: "warning", code: "DUPLICATE_APP_ROW", sheet, row: row.rowNumber, date, message: `${app} is repeated for this date with the same regular_earnings; the duplicate was ignored.` });
        }
      } else {
        day.apps[app] = regular;
      }
    }
    if (app && bonus !== undefined && bonus > 0) {
      const duplicateBonus = day.bonuses.some((entry) => entry.app === app && Math.abs(entry.amount - bonus) <= EPSILON);
      if (duplicateBonus) {
        pushIssue(issues, { severity: "error", code: "DUPLICATE_APP_BONUS", sheet, row: row.rowNumber, date, message: `${app} has the same bonus more than once for this date. Keep one row per date + app or move separate bonuses to the Bonuses sheet.` });
      } else {
        day.bonuses.push({ id: `historical_bonus_${date}_${day.bonuses.length + 1}`, app, amount: bonus, source: app === "Octopus" ? "legacy_octopus" : "manual" });
        stats.bonuses += 1;
      }
    }
    const sourceTotal = readNonNegative(row, "source_daily_total", "Source daily total", issues, date);
    if (sourceTotal !== undefined) {
      if (day.sourceTotal === undefined) day.sourceTotal = sourceTotal;
      else if (Math.abs(day.sourceTotal - sourceTotal) > EPSILON) {
        pushIssue(issues, { severity: "error", code: "CONFLICTING_SOURCE_TOTAL", sheet, row: row.rowNumber, date, message: "source_daily_total is different on another row for this date." });
      }
    }
    addDayMetadata(day, row, issues, sheet);
    if (!app && regular === undefined && bonus === undefined && sourceTotal === undefined && !row.values.notes && day.mileage === undefined && day.rideCount === undefined) {
      pushIssue(issues, { severity: "warning", code: "METADATA_ONLY_ROW", sheet, row: row.rowNumber, date, message: "This row has no app or earnings; it is kept only for day metadata." });
    }
    days.set(date, day);
  });
}

function appendDaysMatrixRows(rows: HistoricalImportSheetRow[], days: Map<string, DraftDay>, issues: HistoricalImportIssue[], stats: HistoricalImportStats): void {
  const appColumns: Array<[string, string]> = [
    ["uber_earnings", "Uber"],
    ["lyft_earnings", "Lyft"],
    ["spark_earnings", "Spark Driver"],
    ["spark_driver_earnings", "Spark Driver"],
    ["doordash_earnings", "DoorDash"],
    ["amazonflex_earnings", "Amazon Flex"],
    ["amazon_flex_earnings", "Amazon Flex"],
    ["instacart_earnings", "Instacart"],
    ["shipt_earnings", "Shipt"],
    ["other_app_1_earnings", ""],
    ["other_app_2_earnings", ""],
  ];
  rows.forEach((row) => {
    const date = parseDateOnly(row.values.date);
    stats.dailyRows += 1;
    if (!date) {
      pushIssue(issues, { severity: "error", code: "INVALID_DATE", sheet: "DAYS", row: row.rowNumber, message: "date must be a valid date." });
      return;
    }
    const day = days.get(date) ?? { date, apps: {}, bonuses: [], shifts: [] };
    appColumns.forEach(([field, defaultApp]) => {
      const amount = readNonNegative(row, field, field, issues, date, false, "DAYS");
      if (amount === undefined) return;
      const app = defaultApp || canonicalApp(row.values[field.replace("_earnings", "_name")]);
      if (!app) {
        pushIssue(issues, { severity: "error", code: "CUSTOM_APP_NAME_REQUIRED", sheet: "DAYS", row: row.rowNumber, date, message: `${field} needs its matching app name.` });
        return;
      }
      day.apps[app] = round((day.apps[app] ?? 0) + amount);
    });
    const bonus = readNonNegative(row, "bonus_earnings", "Bonus earnings", issues, date, false, "DAYS");
    const bonusApp = canonicalApp(row.values.bonus_app) ?? "Unattributed";
    if (bonus !== undefined && bonus > 0) {
      day.bonuses.push({ id: `historical_bonus_${date}_${day.bonuses.length + 1}`, app: bonusApp, amount: bonus, source: bonusApp === "Octopus" ? "legacy_octopus" : "manual" });
      stats.bonuses += 1;
    }
    addDayMetadata(day, row, issues, "DAYS");
    days.set(date, day);
  });
}

function appendShiftRows(rows: HistoricalImportSheetRow[], days: Map<string, DraftDay>, pauses: DraftPause[], issues: HistoricalImportIssue[], stats: HistoricalImportStats): void {
  const seen = new Set<string>();
  rows.forEach((row) => {
    stats.shiftRows += 1;
    const date = parseDateOnly(row.values.date);
    if (!date) {
      pushIssue(issues, { severity: "error", code: "INVALID_DATE", sheet: "Optional Shifts", row: row.rowNumber, message: "date must be a valid date." });
      return;
    }
    const key = String(cellValue(row.values.shift_key) ?? row.values.shift ?? `shift-${row.rowNumber}`).trim() || `shift-${row.rowNumber}`;
    const startTime = parseDateTime(row.values.start_datetime ?? row.values.start_time, date);
    const endTime = parseDateTime(row.values.end_datetime ?? row.values.end_time, date);
    if (!startTime || !endTime) {
      pushIssue(issues, { severity: "error", code: "SHIFT_BOUNDARY_REQUIRED", sheet: "Optional Shifts", row: row.rowNumber, date, message: "Historical shifts require valid start_datetime and end_datetime. Leave this sheet blank when timing is unknown." });
      return;
    }
    if (endTime <= startTime) {
      pushIssue(issues, { severity: "error", code: "INVERTED_SHIFT", sheet: "Optional Shifts", row: row.rowNumber, date, message: "end_datetime must follow start_datetime." });
      return;
    }
    const identity = `${date}|${key}`;
    if (seen.has(identity)) {
      pushIssue(issues, { severity: "error", code: "DUPLICATE_SHIFT_KEY", sheet: "Optional Shifts", row: row.rowNumber, date, message: `shift_key '${key}' is duplicated for this date.` });
      return;
    }
    seen.add(identity);
    const draft: DraftShift = {
      date,
      key,
      startTime,
      endTime,
      earnings: readNonNegative(row, "shift_earnings", "Shift earnings", issues, date, false, "Optional Shifts"),
      miles: readNonNegative(row, "shift_miles", "Shift miles", issues, date, false, "Optional Shifts"),
      rides: readNonNegative(row, "shift_rides", "Shift rides", issues, date, true, "Optional Shifts"),
      note: isBlank(row.values.shift_note) ? undefined : String(row.values.shift_note).trim(),
      rowNumber: row.rowNumber,
    };
    const ridesByApp: Record<string, number> = {};
    Object.entries(APP_RIDE_COLUMNS).forEach(([field, app]) => {
      const rides = readNonNegative(row, field, field, issues, date, true, "Optional Shifts");
      if (rides !== undefined) ridesByApp[app] = (ridesByApp[app] ?? 0) + rides;
    });
    if (Object.keys(ridesByApp).length) {
      draft.ridesByApp = ridesByApp;
      const attributed = Object.values(ridesByApp).reduce((sum, value) => sum + value, 0);
      if (draft.rides === undefined) draft.rides = attributed;
      else if (attributed > draft.rides) pushIssue(issues, { severity: "error", code: "RIDES_EXCEED_SHIFT_TOTAL", sheet: "Optional Shifts", row: row.rowNumber, date, message: "App ride counts exceed shift_rides." });
    }
    const day = days.get(date) ?? { date, apps: {}, bonuses: [], shifts: [] };
    day.shifts.push(draft);
    day.logged = true;
    days.set(date, day);
  });

  pauses.forEach((pause) => {
    const day = days.get(pause.date);
    const shift = day?.shifts.find((item) => item.key === pause.key);
    if (!shift) {
      pushIssue(issues, { severity: "error", code: "PAUSE_SHIFT_NOT_FOUND", sheet: "Pauses", row: pause.rowNumber, date: pause.date, message: `Pause ${pause.key} does not match a shift on this date.` });
      return;
    }
    if (pause.startTime < shift.startTime || pause.endTime > shift.endTime || pause.endTime <= pause.startTime) {
      pushIssue(issues, { severity: "error", code: "PAUSE_OUTSIDE_SHIFT", sheet: "Pauses", row: pause.rowNumber, date: pause.date, message: `Pause ${pause.key} must be inside its shift and have a positive duration.` });
    }
  });

  const pausesByShift = new Map<string, DraftPause[]>();
  pauses.forEach((pause) => {
    const key = `${pause.date}|${pause.key}`;
    pausesByShift.set(key, [...(pausesByShift.get(key) ?? []), pause]);
  });
  pausesByShift.forEach((items) => {
    const sortedPauses = [...items].sort((a, b) => a.startTime.localeCompare(b.startTime));
    sortedPauses.forEach((pause, index) => {
      const previous = sortedPauses[index - 1];
      if (previous && pause.startTime < previous.endTime) {
        pushIssue(issues, { severity: "error", code: "OVERLAPPING_PAUSES", sheet: "Pauses", row: pause.rowNumber, date: pause.date, message: "Two pauses overlap for the same shift." });
      }
    });
  });

  for (const day of days.values()) {
    const sorted = [...day.shifts].sort((a, b) => a.startTime.localeCompare(b.startTime));
    for (let index = 0; index < sorted.length; index += 1) {
      for (let next = index + 1; next < sorted.length; next += 1) {
        if (sorted[index].endTime > sorted[next].startTime && sorted[next].endTime > sorted[index].startTime) {
          pushIssue(issues, { severity: "error", code: "OVERLAPPING_SHIFTS", sheet: "Optional Shifts", row: sorted[next].rowNumber, date: day.date, message: "Two shifts overlap on the same day." });
        }
      }
    }
  }
}

function appendBonusRows(rows: HistoricalImportSheetRow[], days: Map<string, DraftDay>, issues: HistoricalImportIssue[], stats: HistoricalImportStats): void {
  rows.forEach((row) => {
    stats.bonusRows += 1;
    const date = parseDateOnly(row.values.date);
    const app = canonicalApp(row.values.app) ?? "Unattributed";
    const amount = readNonNegative(row, "amount", "Bonus amount", issues, date ?? undefined, false, "Bonuses");
    if (!date || amount === undefined) {
      if (!date) pushIssue(issues, { severity: "error", code: "INVALID_DATE", sheet: "Bonuses", row: row.rowNumber, message: "date must be a valid date." });
      return;
    }
    if (amount <= 0) {
      pushIssue(issues, { severity: "warning", code: "ZERO_BONUS_SKIPPED", sheet: "Bonuses", row: row.rowNumber, date, message: "Zero-value bonuses are ignored." });
      return;
    }
    const source = String(cellValue(row.values.source) ?? "manual").trim().toLowerCase() === "legacy_octopus" ? "legacy_octopus" : "manual";
    const day = days.get(date) ?? { date, apps: {}, bonuses: [], shifts: [] };
    const bonus: BonusEntry = { id: `historical_bonus_${date}_${day.bonuses.length + 1}`, app, amount, source };
    day.bonuses.push(bonus);
    stats.bonuses += 1;
    if (!isBlank(row.values.notes)) day.notes = String(row.values.notes).trim();
    days.set(date, day);
  });
}

function finalizeDays(days: Map<string, DraftDay>, pauses: DraftPause[], issues: HistoricalImportIssue[], stats: HistoricalImportStats): void {
  for (const day of days.values()) {
    const regular = Object.values(day.apps).reduce((sum, value) => sum + value, 0);
    const bonuses = day.bonuses.reduce((sum, bonus) => sum + bonus.amount, 0);
    const known = round(regular + bonuses);
    if (day.sourceTotal !== undefined && Math.abs(day.sourceTotal - known) > EPSILON) {
      if (day.sourceTotal > known) {
        const delta = round(day.sourceTotal - known);
        day.apps.Unattributed = round((day.apps.Unattributed ?? 0) + delta);
        pushIssue(issues, { severity: "warning", code: "UNATTRIBUTED_EARNINGS_CREATED", sheet: "Daily Earnings", row: 0, date: day.date, message: `${delta.toFixed(2)} was placed in Unattributed so the imported daily total matches source_daily_total.` });
      } else {
        pushIssue(issues, { severity: "error", code: "SOURCE_TOTAL_BELOW_DETAIL", sheet: "Daily Earnings", row: 0, date: day.date, message: "source_daily_total is lower than the sum of app and bonus detail; no amount was removed." });
      }
    }
    if (day.shifts.length) {
      const shiftRides = day.shifts.reduce((sum, shift) => sum + (shift.rides ?? 0), 0);
      if (day.rideCount !== undefined && shiftRides > 0 && Math.abs(day.rideCount - shiftRides) > EPSILON) {
        pushIssue(issues, { severity: "warning", code: "DAY_SHIFT_RIDE_MISMATCH", sheet: "Optional Shifts", row: 0, date: day.date, message: "daily_rides differs from the sum of shift_rides; shift counts will drive operational metrics." });
      }
      if (day.workedHours !== undefined) {
        const shiftHours = day.shifts.reduce((sum, shift) => sum + (buildBlocks(shift, pauses) ?? []).reduce((blockSum, block) => blockSum + (Date.parse(block.endTime ?? block.startTime) - Date.parse(block.startTime)) / 3_600_000, 0), 0);
        if (Math.abs(day.workedHours - shiftHours) > 0.05) pushIssue(issues, { severity: "warning", code: "DAY_SHIFT_HOURS_MISMATCH", sheet: "Optional Shifts", row: 0, date: day.date, message: "worked_hours differs from timed shifts; the precise shift boundaries will drive operational timing." });
      }
    }
    stats.days += 1;
  }
}

export type HistoricalImportSource = File | Blob | ArrayBuffer | Uint8Array;

async function sourceArrayBuffer(source: HistoricalImportSource): Promise<ArrayBuffer> {
  if (source instanceof ArrayBuffer) return source;
  if (source instanceof Uint8Array) return source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength) as ArrayBuffer;
  if (typeof source.arrayBuffer === "function") return source.arrayBuffer();
  throw new Error("This file could not be read in the current browser.");
}

export async function parseHistoricalWorkbook(file: HistoricalImportSource, defaultWeeklyGoal = 0): Promise<HistoricalImportPreview> {
  const excelModule = await import("exceljs");
  const ExcelJS = excelModule.default ?? excelModule;
  const workbook = new ExcelJS.Workbook();
  const fileName = "name" in Object(file) ? String((file as File).name ?? "") : "";
  if (fileName.toLowerCase().endsWith(".csv")) {
    const text = "text" in Object(file) && typeof (file as Blob).text === "function"
      ? await (file as Blob).text()
      : new TextDecoder().decode(await sourceArrayBuffer(file));
    const sheet = workbook.addWorksheet("Daily Earnings");
    parseCsvRows(text).forEach((values) => sheet.addRow(values));
  } else {
    await workbook.xlsx.load(await sourceArrayBuffer(file));
  }
  const issues: HistoricalImportIssue[] = [];
  const days = new Map<string, DraftDay>();
  const stats: HistoricalImportStats = { sourceMode: "daily-earnings", dailyRows: 0, shiftRows: 0, pauseRows: 0, bonusRows: 0, days: 0, weeks: 0, shifts: 0, bonuses: 0 };

  const daysSheet = findSheet(workbook, ["DAYS", "Days"]);
  const dailySheet = findSheet(workbook, ["Daily Earnings", "Daily", "Earnings"]);
  const dailyRows = worksheetRows(daysSheet ?? dailySheet);
  const pauses: DraftPause[] = [];
  const pauseRows = worksheetRows(findSheet(workbook, ["Pauses", "PAUSES"]));
  pauseRows.forEach((row) => {
    stats.pauseRows += 1;
    const date = parseDateOnly(row.values.date);
    const key = String(cellValue(row.values.shift_key) ?? row.values.shift ?? "shift-1").trim();
    const startTime = date ? parseDateTime(row.values.pause_start_datetime ?? row.values.pause_start, date) : null;
    const endTime = date ? parseDateTime(row.values.pause_end_datetime ?? row.values.pause_end, date) : null;
    if (!date || !startTime || !endTime) {
      pushIssue(issues, { severity: "error", code: "INVALID_PAUSE", sheet: "Pauses", row: row.rowNumber, date: date ?? undefined, message: "Pause rows require date, shift_key, pause_start_datetime, and pause_end_datetime." });
      return;
    }
    pauses.push({ date, key, startTime, endTime, rowNumber: row.rowNumber });
  });

  const shiftRows = worksheetRows(findSheet(workbook, ["Optional Shifts", "Shifts", "SHIFTS"]));
  const bonusRows = worksheetRows(findSheet(workbook, ["Bonuses", "BONUSES"]));
  const hasNonDailyRows = shiftRows.length > 0 || pauseRows.length > 0 || bonusRows.length > 0;
  if (!dailyRows.length) {
    if (hasNonDailyRows) {
      pushIssue(issues, { severity: "warning", code: "DAILY_SHEET_OMITTED", sheet: daysSheet ? "DAYS" : "Daily Earnings", row: 1, message: "No daily earnings rows were provided; the importer will add only shifts, pauses, or bonuses to matching History weeks." });
    } else {
      pushIssue(issues, { severity: "error", code: "DAILY_SHEET_REQUIRED", sheet: daysSheet ? "DAYS" : "Daily Earnings", row: 1, message: "Add data to the Daily Earnings sheet (or DAYS for the compact format), or provide Optional Shifts/Bonuses rows." });
    }
  } else if (daysSheet) {
    stats.sourceMode = "days";
    appendDaysMatrixRows(dailyRows, days, issues, stats);
  } else {
    appendDateRows(dailyRows, days, issues, "Daily Earnings", stats);
  }

  appendShiftRows(shiftRows, days, pauses, issues, stats);
  stats.shifts = [...days.values()].reduce((sum, day) => sum + day.shifts.length, 0);
  appendBonusRows(bonusRows, days, issues, stats);
  finalizeDays(days, pauses, issues, stats);

  const now = new Date().toISOString();
  const weekStarts = [...days.keys()].map(mondayForDate).sort();
  const uniqueStarts = [...new Set(weekStarts)];
  const weeks = uniqueStarts.map((startDate) => createWeekDraft(startDate, new Map([...days.entries()].filter(([date]) => mondayForDate(date) === startDate)), pauses, defaultWeeklyGoal, now));
  stats.weeks = weeks.length;
  return { weeks, issues, stats };
}

function sameNumber(a: number | undefined, b: number | undefined): boolean {
  return a === undefined || b === undefined ? a === b : Math.abs(a - b) <= EPSILON;
}

function mergeScalar<T>(
  existing: T | undefined,
  imported: T | undefined,
  onConflict: () => void,
): T | undefined {
  if (imported === undefined) return existing;
  if (existing === undefined) return imported;
  if (typeof existing === "number" && typeof imported === "number") {
    if (sameNumber(existing, imported)) return existing;
  } else if (existing === imported) return existing;
  onConflict();
  return existing;
}

function mergeHistoricalDay(existing: DayEntry, imported: DayEntry, conflicts: HistoricalImportConflict[], weekId: string): DayEntry {
  const next: DayEntry = { ...existing, apps: { ...existing.apps } };
  Object.entries(imported.apps).forEach(([app, amount]) => {
    const current = next.apps[app];
    if (current === undefined || Math.abs(current) <= EPSILON) next.apps[app] = amount;
    else if (!sameNumber(current, amount)) conflicts.push({ weekId, date: imported.date, field: `apps.${app}`, message: `Existing ${app} earnings (${current.toFixed(2)}) differ from imported ${amount.toFixed(2)}.` });
  });
  const bonusBySignature = new Set((next.bonuses ?? []).map(signatureForBonus));
  const nextBonuses = [...(next.bonuses ?? [])];
  imported.bonuses?.forEach((bonus) => {
    const signature = signatureForBonus(bonus);
    if (!bonusBySignature.has(signature)) {
      bonusBySignature.add(signature);
      nextBonuses.push(bonus);
    }
  });
  if (nextBonuses.length) next.bonuses = nextBonuses;
  next.mileage = mergeScalar(existing.mileage, imported.mileage, () => conflicts.push({ weekId, date: imported.date, field: "mileage", message: "Existing mileage differs from imported mileage." }));
  next.rideCount = mergeScalar(existing.rideCount, imported.rideCount, () => conflicts.push({ weekId, date: imported.date, field: "rideCount", message: "Existing day rides differ from imported day rides." }));
  next.workedHours = mergeScalar(existing.workedHours, imported.workedHours, () => conflicts.push({ weekId, date: imported.date, field: "workedHours", message: "Existing worked hours differ from imported worked hours." }));
  if (imported.notes) {
    if (!existing.notes) next.notes = imported.notes;
    else if (existing.notes !== imported.notes) conflicts.push({ weekId, date: imported.date, field: "notes", message: "Existing notes differ from imported notes." });
  }
  if (imported.logged !== undefined && existing.logged === undefined) next.logged = imported.logged;
  if (imported.dayClosed !== undefined && existing.dayClosed === undefined) next.dayClosed = imported.dayClosed;

  const existingShifts = [...(next.shifts ?? [])];
  const existingByBoundary = new Map(existingShifts.map((shift) => [`${shift.startTime}|${shift.endTime ?? ""}`, shift]));
  imported.shifts?.forEach((shift) => {
    const boundary = `${shift.startTime}|${shift.endTime ?? ""}`;
    const match = existingByBoundary.get(boundary);
    if (!match) {
      existingShifts.push(shift);
      existingByBoundary.set(boundary, shift);
    } else if (shiftSignature(match) !== shiftSignature(shift)) {
      conflicts.push({ weekId, date: imported.date, field: "shifts", message: `A shift already exists at ${shift.startTime} with different details.` });
    }
  });
  if (existingShifts.length) next.shifts = existingShifts;
  return next;
}

export function mergeHistoricalImport(
  preview: HistoricalImportPreview,
  existingWeeks: WeekRecord[],
  defaultWeeklyGoal = 0,
  now = new Date().toISOString(),
): HistoricalImportMergeResult {
  const conflicts: HistoricalImportConflict[] = [];
  const nextWeeks = [...existingWeeks];
  const changedWeekIds: string[] = [];
  const newWeekIds: string[] = [];

  preview.weeks.forEach((imported) => {
    const existing = nextWeeks.find((week) => week.startDate === imported.startDate);
    if (!existing) {
      nextWeeks.push({ ...imported, weeklyGoal: imported.weeklyGoal || defaultWeeklyGoal, createdAt: now, updatedAt: now });
      newWeekIds.push(imported.id);
      changedWeekIds.push(imported.id);
      return;
    }
    let changed = false;
    const mergedEntries = existing.entries.map((day) => {
      const importedDay = imported.entries.find((candidate) => candidate.date === day.date);
      if (!importedDay) return day;
      const merged = mergeHistoricalDay(day, importedDay, conflicts, existing.id);
      if (JSON.stringify(merged) !== JSON.stringify(day)) changed = true;
      return merged;
    });
    const weeklyGoal = mergeScalar(existing.weeklyGoal, imported.weeklyGoal || undefined, () => conflicts.push({ weekId: existing.id, field: "weeklyGoal", message: "Existing weekly goal differs from imported weekly goal." }));
    const weeklyHoursGoal = mergeScalar(existing.weeklyHoursGoal, imported.weeklyHoursGoal, () => conflicts.push({ weekId: existing.id, field: "weeklyHoursGoal", message: "Existing weekly hours goal differs from imported weekly hours goal." }));
    if (changed || weeklyGoal !== existing.weeklyGoal || weeklyHoursGoal !== existing.weeklyHoursGoal) {
      changedWeekIds.push(existing.id);
      nextWeeks[nextWeeks.indexOf(existing)] = { ...existing, entries: mergedEntries, weeklyGoal: weeklyGoal ?? existing.weeklyGoal, weeklyHoursGoal, updatedAt: now };
    }
  });

  return { weeks: nextWeeks.sort((a, b) => b.startDate.localeCompare(a.startDate)), conflicts, changedWeekIds: [...new Set(changedWeekIds)], newWeekIds };
}

export function issueCounts(issues: HistoricalImportIssue[]): { errors: number; warnings: number } {
  return issues.reduce((counts, issue) => {
    if (issue.severity === "error") counts.errors += 1;
    else counts.warnings += 1;
    return counts;
  }, { errors: 0, warnings: 0 });
}

export function historicalImportTemplateUrl(): string {
  return "/templates/streex-historical-import-template.xlsx";
}

export const historicalImportApps = [...DEFAULT_APPS, "Octopus", "Unattributed"];
