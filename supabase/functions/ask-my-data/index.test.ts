// Pure-function tests for Ask My Data weekday-pair logic and routing.
// Run with: deno test --allow-env --allow-net supabase/functions/ask-my-data/index.test.ts

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  consecutiveDayOffAnalysis,
  detectIntent,
  detectScope,
  restPairMode,
} from "./index.ts";

const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

type DayTotal = { day: string; date: string; total: number };

function makeWeek(id: string, startDate: string, dayTotals: DayTotal[]) {
  const total = dayTotals.reduce((s, d) => s + d.total, 0);
  return {
    id,
    startDate,
    endDate: startDate,
    status: "closed" as const,
    goal: 0,
    total,
    daysWorked: dayTotals.filter((d) => d.total > 0).length,
    appTotals: {},
    dayTotals,
  };
}

// Build N weeks. For each week, every weekday gets the value from `perDay`
// (a map of weekday -> earnings). Missing entries are treated as days off.
function buildHistory(
  weeksCount: number,
  perDay: Partial<Record<typeof WEEKDAYS[number], number>>,
) {
  const weeks = [];
  for (let i = 0; i < weeksCount; i++) {
    const startDate = `2025-01-${String(6 + i * 7).padStart(2, "0")}`;
    const dayTotals: DayTotal[] = WEEKDAYS.map((day, idx) => ({
      day,
      date: `${startDate}-d${idx}`,
      total: perDay[day] ?? 0,
    }));
    weeks.push(makeWeek(`w${i}`, startDate, dayTotals));
  }
  return weeks;
}

// ---------- restPairMode routing ----------

Deno.test("restPairMode: English take_off phrasing", () => {
  assertEquals(
    restPairMode("If I wanted to take two days off in a row, which should they be?"),
    "take_off",
  );
  assertEquals(restPairMode("two back-to-back days off"), "take_off");
  assertEquals(restPairMode("two consecutive days off"), "take_off");
});

Deno.test("restPairMode: English protect phrasing", () => {
  assertEquals(
    restPairMode("Which two days should I not rest?"),
    "protect",
  );
  assertEquals(
    restPairMode("which two days shouldn't I rest"),
    "protect",
  );
});

Deno.test("restPairMode: Spanish take_off phrasing", () => {
  assertEquals(
    restPairMode("Si quisiera descansar dos días seguidos, cuáles deberían ser?"),
    "take_off",
  );
  assertEquals(restPairMode("dos días libres seguidos"), "take_off");
});

Deno.test("restPairMode: Spanish protect phrasing", () => {
  assertEquals(
    restPairMode("Y los dos días que no debería descansar?"),
    "protect",
  );
});

Deno.test("restPairMode: negative routing (best-day questions)", () => {
  assertEquals(restPairMode("What was my best day ever?"), null);
  assertEquals(restPairMode("What is my best weekday?"), null);
  assertEquals(restPairMode("Which weekday makes me the most money?"), null);
  assertEquals(restPairMode("What was my strongest month?"), null);
});

// ---------- consecutiveDayOffAnalysis ----------

Deno.test("consecutiveDayOffAnalysis: returns null when not a rest-pair prompt", () => {
  const weeks = buildHistory(4, { Monday: 100, Tuesday: 200 });
  assertEquals(
    consecutiveDayOffAnalysis(weeks, "What was my best day ever?"),
    null,
  );
});

Deno.test("consecutiveDayOffAnalysis: all 7 consecutive pairs including Sunday→Monday", () => {
  // Distinct values per weekday so every pair gets a unique combined average.
  const weeks = buildHistory(4, {
    Monday: 100,
    Tuesday: 110,
    Wednesday: 120,
    Thursday: 130,
    Friday: 140,
    Saturday: 200,
    Sunday: 180,
  });
  const result = consecutiveDayOffAnalysis(
    weeks,
    "Si quisiera descansar dos días seguidos, cuáles deberían ser?",
  )!;
  assert(result, "result should be present");
  assertEquals(result.pairs.length, 7);
  const days = result.pairs.map((p) => p.days.join("-")).sort();
  assertEquals(days, [
    "Friday-Saturday",
    "Monday-Tuesday",
    "Saturday-Sunday",
    "Sunday-Monday",
    "Thursday-Friday",
    "Tuesday-Wednesday",
    "Wednesday-Thursday",
  ]);
  const sunMon = result.pairs.find((p) => p.days[0] === "Sunday" && p.days[1] === "Monday");
  assert(sunMon, "Sunday→Monday pair must exist");
  assertEquals(sunMon!.crossesWeekBoundary, true);
});

Deno.test("consecutiveDayOffAnalysis: take_off recommends lowest combined pair", () => {
  const weeks = buildHistory(5, {
    Monday: 50, // weakest weekday
    Tuesday: 60, // next weakest
    Wednesday: 200,
    Thursday: 210,
    Friday: 220,
    Saturday: 300,
    Sunday: 290,
  });
  const result = consecutiveDayOffAnalysis(
    weeks,
    "If I wanted to take two days off in a row, which should they be?",
  )!;
  assertEquals(result.mode, "take_off");
  assertEquals(result.recommendation?.days, ["Monday", "Tuesday"]);
  // Pairs are sorted ascending — first is lowest.
  assertEquals(result.pairs[0].days, ["Monday", "Tuesday"]);
});

Deno.test("consecutiveDayOffAnalysis: protect recommends highest combined pair", () => {
  const weeks = buildHistory(5, {
    Monday: 50,
    Tuesday: 60,
    Wednesday: 200,
    Thursday: 210,
    Friday: 220,
    Saturday: 300, // strongest
    Sunday: 290, // strongest
  });
  const result = consecutiveDayOffAnalysis(
    weeks,
    "Which two days should I not rest?",
  )!;
  assertEquals(result.mode, "protect");
  assertEquals(result.recommendation?.days, ["Saturday", "Sunday"]);
});

Deno.test("consecutiveDayOffAnalysis: deterministic tie-breaks (sample size, then natural order)", () => {
  // Two pairs with identical combined averages but different sample sizes:
  // Build a custom history per weekday count.
  const days = (n: number, v: number) =>
    Array.from({ length: n }, () => v);

  // We want Monday=Tuesday=100 with n=2 (so Mon-Tue avg=100+100=200, minSample=2)
  // and Friday=Saturday=100 with n=6 (so Fri-Sat avg=200, minSample=6).
  // Mon-Tue and Fri-Sat tie on combinedAverage; Fri-Sat should sort first
  // because it has the larger minimum sample size.
  const weeks: ReturnType<typeof makeWeek>[] = [];
  let id = 0;
  const push = (perDay: Partial<Record<typeof WEEKDAYS[number], number>>) => {
    id += 1;
    const startDate = `2025-02-${String(id).padStart(2, "0")}`;
    weeks.push(
      makeWeek(
        `w${id}`,
        startDate,
        WEEKDAYS.map((d, i) => ({
          day: d,
          date: `${startDate}-${i}`,
          total: perDay[d] ?? 0,
        })),
      ),
    );
  };

  for (const _ of days(2, 0)) push({ Monday: 100, Tuesday: 100 });
  for (const _ of days(6, 0)) push({ Friday: 100, Saturday: 100 });

  const result = consecutiveDayOffAnalysis(
    weeks,
    "If I wanted to take two days off in a row, which should they be?",
  )!;
  // Only Mon-Tue and Fri-Sat have data for both halves.
  const tiedPairs = result.pairs.filter((p) => p.combinedAverage === 200);
  assertEquals(tiedPairs.length, 2);
  assertEquals(tiedPairs[0].days, ["Friday", "Saturday"]); // larger min sample
  assertEquals(tiedPairs[1].days, ["Monday", "Tuesday"]);
  assertEquals(result.recommendation?.days, ["Friday", "Saturday"]);
});

Deno.test("consecutiveDayOffAnalysis: deterministic tie-breaks (natural order when all tied)", () => {
  // All weekdays equal → every pair ties on average and sample size → natural
  // order wins (Monday-Tuesday recommended for take_off).
  const weeks = buildHistory(4, {
    Monday: 100,
    Tuesday: 100,
    Wednesday: 100,
    Thursday: 100,
    Friday: 100,
    Saturday: 100,
    Sunday: 100,
  });
  const result = consecutiveDayOffAnalysis(weeks, "two consecutive days off")!;
  assertEquals(result.pairs.length, 7);
  assertEquals(result.pairs[0].days, ["Monday", "Tuesday"]);
  assertEquals(result.recommendation?.days, ["Monday", "Tuesday"]);
});

Deno.test("consecutiveDayOffAnalysis: insufficient data — no pairs when only one weekday tracked", () => {
  const weeks = buildHistory(4, { Monday: 100 });
  const result = consecutiveDayOffAnalysis(weeks, "two consecutive days off")!;
  assertEquals(result.pairs.length, 0);
  assertEquals(result.recommendation, null);
});

Deno.test("consecutiveDayOffAnalysis: asymmetric and small samples surface lowSampleSize caveat", () => {
  // Only 1 sample each for Monday & Tuesday, plenty everywhere else.
  const weeks: ReturnType<typeof makeWeek>[] = [];
  let id = 0;
  const push = (perDay: Partial<Record<typeof WEEKDAYS[number], number>>) => {
    id += 1;
    const startDate = `2025-03-${String(id).padStart(2, "0")}`;
    weeks.push(
      makeWeek(
        `w${id}`,
        startDate,
        WEEKDAYS.map((d, i) => ({
          day: d,
          date: `${startDate}-${i}`,
          total: perDay[d] ?? 0,
        })),
      ),
    );
  };

  // 1 week with Mon+Tue weak, 8 weeks with strong everywhere else.
  push({ Monday: 10, Tuesday: 10 });
  for (let i = 0; i < 8; i++) {
    push({
      Wednesday: 200,
      Thursday: 200,
      Friday: 200,
      Saturday: 200,
      Sunday: 200,
    });
  }

  const result = consecutiveDayOffAnalysis(
    weeks,
    "If I wanted to take two days off in a row, which should they be?",
  )!;
  // Mon-Tue is lowest by far (avg 20) so it wins.
  assertEquals(result.recommendation?.days, ["Monday", "Tuesday"]);
  assertEquals(result.recommendation?.minimumSampleSize, 1);
  assertEquals(result.lowSampleSize, true);
  assert(result.sampleSizeCaveat, "expected a sample-size caveat string");
});

// ---------- intent + scope ----------

Deno.test("detectIntent: weekday questions route to DAY", () => {
  assertEquals(detectIntent("What was my best Saturday?"), "DAY");
  assertEquals(detectIntent("Which weekday makes me the most money?"), "DAY");
});

Deno.test("detectScope: rest-pair questions force ALL_TIME", () => {
  const result = detectScope([
    {
      role: "user",
      content: "Si quisiera descansar dos días seguidos, cuáles deberían ser?",
    },
  ]);
  assertEquals(result.scope, "ALL_TIME");
});

Deno.test("detectScope: unspecified-timeframe questions default to ALL_TIME", () => {
  const result = detectScope([
    { role: "user", content: "What is my best weekday?" },
  ]);
  assertEquals(result.scope, "ALL_TIME");
});