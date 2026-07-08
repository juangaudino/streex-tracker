import { earningsSnapshotTransitionKey } from "./earningsSnapshots";
import type { EarningsSnapshot, WeekRecord } from "./types";
import { inspectSnapshotIntegrity, inspectWeekIntegrity, type IntegrityIssue, type IntegritySeverity } from "./weekIntegrity";

export type DataHealthStatus = "healthy" | "warning" | "critical";

export interface DataHealthContract {
  id: string;
  label: string;
  status: "pass" | "fail";
  issueCount: number;
  description: string;
}

export interface DataHealthSummary {
  status: DataHealthStatus;
  weeksChecked: number;
  snapshotsChecked: number;
  issueCount: number;
  criticalIssueCount: number;
  warningIssueCount: number;
  countsBySeverity: Record<IntegritySeverity, number>;
  contracts: DataHealthContract[];
  issues: IntegrityIssue[];
  lastCheckedAt: string;
}

const ZERO_COUNTS: Record<IntegritySeverity, number> = { P0: 0, P1: 0, P2: 0, P3: 0 };

function issue(path: string, code: string, message: string, severity: IntegritySeverity = "P1"): IntegrityIssue {
  return { severity, code, path, message };
}

function statusFromIssues(issues: IntegrityIssue[]): DataHealthStatus {
  if (issues.some((item) => item.severity === "P0" || item.severity === "P1")) return "critical";
  if (issues.length) return "warning";
  return "healthy";
}

function contract(
  id: string,
  label: string,
  description: string,
  issues: IntegrityIssue[],
  codes: Set<string>,
): DataHealthContract {
  const issueCount = issues.filter((item) => codes.has(item.code)).length;
  return {
    id,
    label,
    description,
    issueCount,
    status: issueCount ? "fail" : "pass",
  };
}

export function summarizeDataHealth(params: {
  weeks: WeekRecord[];
  snapshots?: EarningsSnapshot[];
  checkedAt?: string;
}): DataHealthSummary {
  const { weeks, snapshots = [] } = params;
  const weekById = new Map(weeks.map((week) => [week.id, week]));
  const issues: IntegrityIssue[] = [];

  for (const week of weeks) {
    const weekIssues = inspectWeekIntegrity(week).map((item) => ({
      ...item,
      path: `week:${week.id}.${item.path}`,
    }));
    issues.push(...weekIssues);
  }

  const snapshotKeys = new Map<string, EarningsSnapshot>();
  for (const snapshot of snapshots) {
    const week = weekById.get(snapshot.weekId);
    issues.push(...inspectSnapshotIntegrity(snapshot, week));

    const key = earningsSnapshotTransitionKey(snapshot);
    const previous = snapshotKeys.get(key);
    if (previous) {
      issues.push(issue(
        `snapshot:${snapshot.id}`,
        "DUPLICATE_SNAPSHOT_TRANSITION",
        "Snapshot repeats an already observed app-total transition.",
      ));
    } else {
      snapshotKeys.set(key, snapshot);
    }
  }

  const countsBySeverity = issues.reduce<Record<IntegritySeverity, number>>((counts, item) => {
    counts[item.severity] += 1;
    return counts;
  }, { ...ZERO_COUNTS });
  const criticalIssueCount = countsBySeverity.P0 + countsBySeverity.P1;
  const warningIssueCount = countsBySeverity.P2 + countsBySeverity.P3;

  const contracts: DataHealthContract[] = [
    contract("week-shape", "Week shape", "Weeks keep seven valid days inside the stored week range.", issues, new Set([
      "WEEK_DATE_RANGE", "DUPLICATE_DAY", "DAY_OUTSIDE_WEEK",
    ])),
    contract("earnings", "Earnings totals", "App earnings and bonuses remain finite non-negative values accepted by the canonical parser.", issues, new Set([
      "SNAPSHOT_DELTA_MISMATCH",
    ])),
    contract("miles", "Miles accumulation", "Day mileage stays authoritative and shift components never exceed it.", issues, new Set([
      "SHIFT_MILES_EXCEED_DAY",
    ])),
    contract("rides", "Ride attribution", "App-specific rides never exceed the shift total.", issues, new Set([
      "RIDES_ATTRIBUTION_EXCEEDS_TOTAL",
    ])),
    contract("shifts", "Shift boundaries", "Shift sessions and work blocks stay inside their edited day/time boundaries.", issues, new Set([
      "SHIFT_OUTSIDE_DAY", "INVERTED_SHIFT", "BLOCK_OUTSIDE_SHIFT", "INVERTED_BLOCK", "OVERLAPPING_SHIFTS",
    ])),
    contract("snapshots", "Snapshot integrity", "Earnings snapshots remain arithmetic-correct, in-range, and non-duplicated.", issues, new Set([
      "SNAPSHOT_DELTA_MISMATCH", "SNAPSHOT_OUTSIDE_WEEK", "DUPLICATE_SNAPSHOT_TRANSITION",
    ])),
  ];

  return {
    status: statusFromIssues(issues),
    weeksChecked: weeks.length,
    snapshotsChecked: snapshots.length,
    issueCount: issues.length,
    criticalIssueCount,
    warningIssueCount,
    countsBySeverity,
    contracts,
    issues,
    lastCheckedAt: params.checkedAt ?? new Date().toISOString(),
  };
}
