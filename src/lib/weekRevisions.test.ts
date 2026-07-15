import { describe, expect, it } from "vitest";
import { parseWeekRevision } from "./weekRevisions";

describe("parseWeekRevision", () => {
  it("preserves a stored week snapshot and normalizes numeric values", () => {
    const revision = parseWeekRevision({
      id: "revision-1",
      source_updated_at: "2026-07-10T12:00:00.000Z",
      start_date: "2026-07-05",
      end_date: "2026-07-11",
      weekly_goal: "1200",
      weekly_hours_goal: "45",
      status: "closed",
      entries: JSON.stringify([{ dayName: "Monday", date: "2026-07-05", apps: { Uber: 100 } }]),
      reason: "before_restore",
      created_at: "2026-07-10T12:01:00.000Z",
    });

    expect(revision.weeklyGoal).toBe(1200);
    expect(revision.weeklyHoursGoal).toBe(45);
    expect(revision.status).toBe("closed");
    expect(revision.reason).toBe("before_restore");
    expect(revision.entries[0]?.apps.Uber).toBe(100);
  });

  it("fails closed for malformed revision entries", () => {
    const revision = parseWeekRevision({
      id: "revision-2",
      source_updated_at: "2026-07-10T12:00:00.000Z",
      start_date: "2026-07-05",
      end_date: "2026-07-11",
      weekly_goal: 1200,
      weekly_hours_goal: null,
      status: "unexpected",
      entries: "not-json",
      reason: "unexpected",
      created_at: "2026-07-10T12:01:00.000Z",
    });

    expect(revision.entries).toEqual([]);
    expect(revision.status).toBe("open");
    expect(revision.reason).toBe("before_update");
  });
});
