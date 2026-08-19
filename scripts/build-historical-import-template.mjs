import fs from "node:fs/promises";
import path from "node:path";
import ExcelJS from "exceljs";

const repo = process.cwd();
const outputDir = path.join(repo, "outputs", "019f1b4a-0116-70c2-9c84-9a6e7f6c3720");
const publicDir = path.join(repo, "public", "templates");
const outputPath = path.join(outputDir, "streex-historical-import-template.xlsx");
const publicPath = path.join(publicDir, "streex-historical-import-template.xlsx");

const colors = {
  ink: "0B0B0B",
  body: "111827",
  muted: "667085",
  yellow: "E6CE20",
  paleYellow: "FFF8CC",
  border: "D1D5DB",
  white: "FFFFFF",
  blue: "EAF2FF",
  green: "E9F8EF",
};

const dailyHeaders = [
  "date", "app", "regular_earnings", "bonus_earnings", "source_daily_total", "daily_miles", "daily_rides", "worked_hours", "notes", "day_closed", "day_status", "weekly_goal", "weekly_hours_goal",
];
const shiftHeaders = [
  "date", "shift_key", "start_datetime", "end_datetime", "timezone", "shift_earnings", "shift_miles", "shift_rides", "uber_rides", "lyft_rides", "spark_driver_rides", "doordash_rides", "amazon_flex_rides", "instacart_rides", "shipt_rides", "shift_note",
];
const pauseHeaders = ["date", "shift_key", "pause_number", "pause_start_datetime", "pause_end_datetime"];
const bonusHeaders = ["date", "app", "amount", "source", "notes"];

function styleTitle(sheet, title, subtitle, lastColumn) {
  sheet.mergeCells(`A1:${lastColumn}1`);
  sheet.getCell("A1").value = title;
  sheet.getCell("A1").font = { name: "Aptos Display", size: 18, bold: true, color: { argb: colors.white } };
  sheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: colors.ink } };
  sheet.getCell("A1").alignment = { vertical: "middle" };
  sheet.getRow(1).height = 30;
  sheet.mergeCells(`A2:${lastColumn}2`);
  sheet.getCell("A2").value = subtitle;
  sheet.getCell("A2").font = { name: "Aptos", size: 10, color: { argb: colors.yellow }, italic: true };
  sheet.getCell("A2").fill = { type: "pattern", pattern: "solid", fgColor: { argb: colors.ink } };
  sheet.getCell("A2").alignment = { wrapText: true, vertical: "middle" };
  sheet.getRow(2).height = 25;
}

function styleHeader(sheet, rowNumber, headers) {
  const row = sheet.getRow(rowNumber);
  headers.forEach((header, index) => {
    const cell = row.getCell(index + 1);
    cell.value = header;
    cell.font = { name: "Aptos", size: 9, bold: true, color: { argb: colors.ink } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colors.yellow } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = { top: { style: "thin", color: { argb: colors.ink } }, bottom: { style: "thin", color: { argb: colors.ink } } };
  });
  row.height = 28;
}

function styleInputGrid(sheet, headers, startRow = 5, rowCount = 100) {
  for (let rowNumber = startRow; rowNumber < startRow + rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    headers.forEach((_, index) => {
      const cell = row.getCell(index + 1);
      cell.font = { name: "Aptos", size: 10, color: { argb: colors.body } };
      cell.border = { top: { style: "thin", color: { argb: colors.border } }, left: { style: "thin", color: { argb: colors.border } } };
      cell.alignment = { vertical: "middle" };
      if (rowNumber % 2 === 0) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F8FAFC" } };
    });
    row.height = 20;
  }
  const lastRow = startRow + rowCount - 1;
  sheet.getRow(lastRow).eachCell((cell) => { cell.border = { ...cell.border, bottom: { style: "thin", color: { argb: colors.border } } }; });
  sheet.getColumn(1).numFmt = "yyyy-mm-dd";
}

function setWidths(sheet, widths) {
  widths.forEach((width, index) => { sheet.getColumn(index + 1).width = width; });
}

function addDataValidation(sheet, range, formulae) {
  sheet.dataValidations.add(range, { type: "list", allowBlank: true, formulae: [formulae] });
}

function createTable(sheet, headers, ref, name) {
  sheet.addTable({
    name,
    ref,
    headerRow: true,
    style: { theme: "TableStyleMedium2", showRowStripes: true },
    columns: headers.map((name) => ({ name })),
    rows: [],
  });
}

const workbook = new ExcelJS.Workbook();
workbook.creator = "STREEX";
workbook.lastModifiedBy = "STREEX";
workbook.created = new Date();
workbook.modified = new Date();
workbook.properties.date1904 = false;

const instructions = workbook.addWorksheet("Instructions");
instructions.views = [{ showGridLines: false }];
styleTitle(instructions, "STREEX HISTORICAL IMPORT", "Preview-first workbook for History → Import historical data. This file is an input template, not a report.", "F");
instructions.getColumn(1).width = 25;
instructions.getColumn(2).width = 72;
instructions.getColumn(3).width = 22;
instructions.getColumn(4).width = 22;
instructions.getColumn(5).width = 22;
instructions.getColumn(6).width = 22;
instructions.getCell("A4").value = "Rule";
instructions.getCell("B4").value = "What to do";
instructions.getCell("C4").value = "Why it matters";
instructions.getRow(4).eachCell({ includeEmpty: false }, (cell) => {
  cell.font = { bold: true, color: { argb: colors.ink } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colors.yellow } };
  cell.alignment = { wrapText: true, vertical: "middle" };
});
const rules = [
  ["One row per date + app", "Use one Daily Earnings row for each app/date. Day-level fields may be entered once or repeated identically.", "Keeps app attribution and day totals auditable."],
  ["Unknown data", "Leave a cell blank. Use 0 only when zero is genuinely known.", "Blank values stay out of denominators and avoid fabricated metrics."],
  ["Money", "Enter plain numbers such as 125.50. Do not type currency symbols or thousands separators.", "The importer stores raw numeric values."],
  ["Dates and times", "Use YYYY-MM-DD and YYYY-MM-DD HH:MM (or typed Excel date/time cells).", "Stable date keys prevent timezone and week-boundary drift."],
  ["Source daily total", "Optional. If detail is lower than this total, Streex places only the gap in Unattributed and shows a warning.", "Money is preserved without silently assigning it to an app."],
  ["Daily miles / rides / hours", "Enter the day total once. Rides and miles remain day-level when no shift breakdown exists.", "These values are not added once per app row."],
  ["Optional Shifts", "Only add a row when the real start and end are known. Add shift_key for multiple shifts on a date.", "No synthetic timing is created for old history."],
  ["Pauses", "Use the same date and shift_key. Pauses split a shift into active work blocks.", "Breaks are excluded from worked hours."],
  ["Bonuses", "Use this sheet for separate bonus/reward records. source may be manual or legacy_octopus.", "Bonuses count in money totals but are excluded from operational efficiency."],
  ["Existing history", "The importer preserves existing non-empty values. Conflicting values stop the import for review.", "A spreadsheet cannot silently overwrite trusted data."],
  ["Snapshots", "Historical imports do not create earnings snapshots or observations.", "Old data must not look like it was entered today."],
  ["Workflow", "Open History → Import historical data → choose this file → review preview → correct errors → import.", "The preview is the final checkpoint before writes."],
];
rules.forEach((rule, index) => {
  const row = instructions.getRow(5 + index);
  rule.forEach((value, column) => {
    const cell = row.getCell(column + 1);
    cell.value = value;
    cell.font = { name: "Aptos", size: 10, color: { argb: colors.body } };
    cell.alignment = { wrapText: true, vertical: "top" };
    cell.border = { top: { style: "thin", color: { argb: colors.border } } };
    if (index % 2 === 0) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F8FAFC" } };
  });
  row.height = 38;
});
instructions.freezePanes = { ySplit: 4 };

const daily = workbook.addWorksheet("Daily Earnings");
daily.views = [{ showGridLines: false }];
styleTitle(daily, "DAILY EARNINGS", "One row per date + app. Put daily miles, rides, hours, notes, and closed state once per date or repeat exactly.", "M");
styleHeader(daily, 4, dailyHeaders);
styleInputGrid(daily, dailyHeaders);
setWidths(daily, [14, 20, 18, 16, 19, 14, 14, 15, 34, 13, 13, 15, 19]);
daily.getColumn(1).numFmt = "yyyy-mm-dd";
for (const column of [3, 4, 5, 11, 12, 13]) daily.getColumn(column).numFmt = "0.00";
daily.getColumn(6).numFmt = "0.0";
daily.getColumn(7).numFmt = "0";
daily.getColumn(8).numFmt = "0.00";
addDataValidation(daily, "J5:J104", '"TRUE,FALSE"');
addDataValidation(daily, "K5:K104", '"worked,rest,unknown"');
createTable(daily, dailyHeaders, "A4:M104", "HistoricalDailyEarnings");
daily.freezePanes = { xSplit: 2, ySplit: 4 };

const shifts = workbook.addWorksheet("Optional Shifts");
shifts.views = [{ showGridLines: false }];
styleTitle(shifts, "OPTIONAL SHIFTS", "Use only when real start/end times are known. Leave blank when a historical day has no precise shift timing.", "P");
styleHeader(shifts, 4, shiftHeaders);
styleInputGrid(shifts, shiftHeaders);
setWidths(shifts, [14, 15, 21, 21, 12, 16, 14, 14, 12, 12, 17, 15, 17, 15, 12, 34]);
for (const column of [1]) shifts.getColumn(column).numFmt = "yyyy-mm-dd";
for (const column of [6, 7]) shifts.getColumn(column).numFmt = "0.00";
for (const column of [8, 9, 10, 11, 12, 13, 14, 15]) shifts.getColumn(column).numFmt = "0";
createTable(shifts, shiftHeaders, "A4:P104", "HistoricalShifts");
shifts.freezePanes = { xSplit: 2, ySplit: 4 };

const pauses = workbook.addWorksheet("Pauses");
pauses.views = [{ showGridLines: false }];
styleTitle(pauses, "PAUSES", "Optional. Each pause must sit inside its shift and use the same date + shift_key.", "E");
styleHeader(pauses, 4, pauseHeaders);
styleInputGrid(pauses, pauseHeaders);
setWidths(pauses, [14, 15, 14, 24, 24]);
pauses.getColumn(1).numFmt = "yyyy-mm-dd";
pauses.getColumn(3).numFmt = "0";
createTable(pauses, pauseHeaders, "A4:E104", "HistoricalPauses");
pauses.freezePanes = { xSplit: 2, ySplit: 4 };

const bonuses = workbook.addWorksheet("Bonuses");
bonuses.views = [{ showGridLines: false }];
styleTitle(bonuses, "BONUSES", "Optional. Use for separate reward/bonus entries that should count in money totals but not operational efficiency.", "E");
styleHeader(bonuses, 4, bonusHeaders);
styleInputGrid(bonuses, bonusHeaders);
setWidths(bonuses, [14, 20, 14, 18, 38]);
bonuses.getColumn(1).numFmt = "yyyy-mm-dd";
bonuses.getColumn(3).numFmt = "0.00";
addDataValidation(bonuses, "D5:D104", '"manual,legacy_octopus"');
createTable(bonuses, bonusHeaders, "A4:E104", "HistoricalBonuses");
bonuses.freezePanes = { xSplit: 2, ySplit: 4 };

const apps = workbook.addWorksheet("App Names");
apps.views = [{ showGridLines: false }];
styleTitle(apps, "APP NAMES", "Use canonical names when possible. Custom names are allowed when spelled consistently.", "C");
styleHeader(apps, 4, ["canonical_app", "accepted_alias", "income_treatment"]);
const appRows = [
  ["Uber", "Uber", "Regular or bonus"],
  ["Lyft", "Lyft", "Regular or bonus"],
  ["Spark Driver", "Spark / Spark Driver", "Regular or bonus"],
  ["DoorDash", "DoorDash / Door Dash", "Regular or bonus"],
  ["Amazon Flex", "Amazon Flex / AmazonFlex", "Regular or bonus"],
  ["Instacart", "Instacart", "Regular or bonus"],
  ["Shipt", "Shipt", "Regular or bonus"],
  ["Octopus", "Octopus", "Legacy reward bonus"],
  ["Unattributed", "Unattributed", "Only for an unexplained source-total gap"],
];
appRows.forEach((values, index) => {
  values.forEach((value, col) => {
    const cell = apps.getRow(5 + index).getCell(col + 1);
    cell.value = value;
    cell.font = { name: "Aptos", size: 10, color: { argb: colors.body } };
    cell.alignment = { wrapText: true, vertical: "top" };
    cell.border = { top: { style: "thin", color: { argb: colors.border } } };
    if (index % 2 === 0) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F8FAFC" } };
  });
  apps.getRow(5 + index).height = 24;
});
setWidths(apps, [22, 30, 42]);
apps.freezePanes = { ySplit: 4 };

const examples = workbook.addWorksheet("Example Rows");
examples.views = [{ showGridLines: false }];
styleTitle(examples, "EXAMPLE ROWS", "Reference only — the importer ignores this sheet. Copy the shape, then enter your own values in the input sheets.", "P");
styleHeader(examples, 4, dailyHeaders);
const exampleRows = [
  ["2026-01-05", "Uber", 125.5, null, 167.75, 94.2, 11, 6.5, "Strong airport day", true, "worked", 1200, 40],
  ["2026-01-05", "Lyft", 42.25, null, null, null, null, null, null, null, null, null, null],
  ["2026-01-06", "Octopus", null, 25, 25, 0, 0, null, "Reward redeemed", true, "rest", null, null],
];
exampleRows.forEach((values, index) => {
  values.forEach((value, col) => {
    const cell = examples.getRow(5 + index).getCell(col + 1);
    cell.value = value;
    cell.font = { name: "Aptos", size: 10, color: { argb: colors.body } };
    cell.alignment = { wrapText: true, vertical: "top" };
    cell.border = { top: { style: "thin", color: { argb: colors.border } } };
  });
});
examples.getRow(9).getCell(1).value = "Optional Shifts example";
examples.getRow(10).values = ["2026-01-05", "morning", "2026-01-05 09:00", "2026-01-05 15:30", "America/Denver", 167.75, 94.2, 11, 11, null, null, null, null, null, null, "6.5h shift"];
examples.getRow(11).values = ["2026-01-05", "morning", 1, "2026-01-05 12:00", "2026-01-05 12:30"];
examples.getRow(12).values = ["2026-01-06", "Octopus", 25, "legacy_octopus", "Reward redeemed"];
examples.getRow(9).font = { bold: true, color: { argb: colors.yellow } };
examples.getRow(10).font = { italic: true, color: { argb: colors.muted } };
examples.getRow(11).font = { italic: true, color: { argb: colors.muted } };
examples.getRow(12).font = { italic: true, color: { argb: colors.muted } };
setWidths(examples, [14, 18, 18, 16, 20, 14, 14, 15, 30, 13, 13, 15, 18, 20, 20, 28]);
examples.getColumn(1).numFmt = "yyyy-mm-dd";
examples.freezePanes = { ySplit: 4 };

for (const sheet of workbook.worksheets) {
  sheet.pageSetup = {
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    paperSize: 9,
    horizontalDpi: 300,
    verticalDpi: 300,
  };
}

await fs.mkdir(outputDir, { recursive: true });
await fs.mkdir(publicDir, { recursive: true });
await workbook.xlsx.writeFile(outputPath);
await fs.copyFile(outputPath, publicPath);
console.log(outputPath);
console.log(publicPath);
