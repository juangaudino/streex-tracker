import type { DeepInsightsFilters } from "./deepInsights";
import type { OperationalExplorerData, OperationalExplorerFilters } from "./operationalExplorer";

function csvCell(value: string | number | null) {
  const raw = value == null ? "" : String(value);
  return /[",\n\r]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
}

function decimal(value: number | null) {
  return value == null ? "" : Number(value.toFixed(2)).toString();
}

function selectedDays(filters: DeepInsightsFilters) {
  return filters.weekdays.length ? filters.weekdays.join(" | ") : "All days";
}

export function buildOperationalExplorerCsv(args: {
  data: OperationalExplorerData;
  globalFilters: DeepInsightsFilters;
  operationalFilters: OperationalExplorerFilters;
  exportedAt?: Date;
}) {
  const { data, globalFilters, operationalFilters, exportedAt = new Date() } = args;
  const rows: Array<Array<string | number | null>> = [
    ["STREEX Operational Explorer export", ""],
    ["exported_at", exportedAt.toISOString()],
    ["evidence_source", data.source],
    ["sample_label", data.sampleLabel],
    ["timestamp_observed_coverage_percent", data.coverage],
    ["time_range", globalFilters.timePreset],
    ["app", globalFilters.app],
    ["weekdays", selectedDays(globalFilters)],
    ["operational_window", data.windowLabel],
    ["custom_window_start", operationalFilters.windowPreset === "custom" ? operationalFilters.windowStart ?? "" : ""],
    ["custom_window_end", operationalFilters.windowPreset === "custom" ? operationalFilters.windowEnd ?? "" : ""],
    [],
    ["SUMMARY"],
    ["earnings", data.totals.earnings],
    ["worked_hours", data.totals.hours],
    ["rides", data.totals.rides],
    ["miles", data.totals.miles],
    ["earnings_per_hour", data.totals.earningsPerHour],
    ["rides_per_hour", data.totals.ridesPerHour],
    ["miles_per_hour", data.totals.milesPerHour],
    ["earnings_per_mile", data.totals.earningsPerMile],
    ["earnings_per_ride", data.totals.earningsPerRide],
    ["miles_per_ride", data.totals.milesPerRide],
    ["minutes_per_ride", data.totals.minutesPerRide],
    ["shifts", data.totals.shifts],
    ["days", data.totals.days],
    [],
    ["HOURLY PROFILE"],
    ["hour", "label", "worked_hours", "earnings", "rides", "miles", "earnings_per_hour", "rides_per_hour", "miles_per_hour", "evidence_source"],
    ...data.hourly.map((row) => [row.hour, row.label, row.hours, row.earnings, row.rides, row.miles, row.earningsPerHour, row.ridesPerHour, row.milesPerHour, row.source]),
    [],
    ["WEEKDAY PROFILE"],
    ["weekday", "sample_days", "worked_hours", "earnings", "earnings_per_hour"],
    ...data.weekdays.map((row) => [row.dayName, row.days, row.hours, row.earnings, row.rate]),
  ];
  return rows.map((row) => row.map((value) => typeof value === "number" ? csvCell(decimal(value)) : csvCell(value)).join(",")).join("\n");
}

export function downloadOperationalExplorerCsv(contents: string, now = new Date()) {
  const stamp = now.toISOString().slice(0, 10);
  const blob = new Blob([contents], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `streex-operational-explorer-${stamp}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
