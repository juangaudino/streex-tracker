import type { DayEntry, ShiftSession } from "./types";

function miles(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? +parsed.toFixed(2) : 0;
}

function approximatelyEqual(a: number, b: number): boolean {
  return Math.abs(a - b) <= 0.02;
}

export function getEffectiveShiftMiles(day: DayEntry): number[] {
  const shifts = day.shifts ?? [];
  const raw = shifts.map((shift) => miles(shift.miles));
  const dayTotal = day.mileage === undefined ? null : miles(day.mileage);
  if (dayTotal === null || raw.length <= 1) return raw;

  const nonZero = raw
    .map((value, index) => ({ value, index }))
    .filter(({ value }) => value > 0);
  const rawSum = raw.reduce((sum, value) => sum + value, 0);
  const last = nonZero.at(-1);
  const looksCumulative = rawSum > dayTotal + 0.02
    && last !== undefined
    && approximatelyEqual(last.value, dayTotal)
    && nonZero.every(({ value }, index) => index === 0 || value >= nonZero[index - 1].value);

  if (!looksCumulative) return raw;

  const effective = [...raw];
  let previousCumulative = 0;
  for (const { value, index } of nonZero) {
    effective[index] = +(value - previousCumulative).toFixed(2);
    previousCumulative = value;
  }
  return effective;
}

export function getEffectiveShiftMileage(day: DayEntry, shift: ShiftSession): number {
  const index = (day.shifts ?? []).findIndex((candidate) => candidate.id === shift.id);
  return index >= 0 ? getEffectiveShiftMiles(day)[index] ?? 0 : miles(shift.miles);
}

export function getAccumulatedDayMileage(day: DayEntry): number {
  if (day.mileage !== undefined) return miles(day.mileage);
  return +getEffectiveShiftMiles(day).reduce((sum, value) => sum + value, 0).toFixed(2);
}

function normalizeStoredShiftMiles(day: DayEntry): ShiftSession[] {
  const effective = getEffectiveShiftMiles(day);
  return (day.shifts ?? []).map((shift, index) => ({ ...shift, miles: effective[index] ?? 0 }));
}

export function applyAccumulatedDayMileage(
  day: DayEntry,
  activeShiftId: string,
  nextAccumulatedMileage: number,
): DayEntry {
  const nextTotal = miles(nextAccumulatedMileage);
  const previousTotal = getAccumulatedDayMileage(day);
  const shifts = normalizeStoredShiftMiles(day);
  const activeIndex = shifts.findIndex((shift) => shift.id === activeShiftId);
  if (activeIndex < 0) return { ...day, mileage: nextTotal, shifts };

  const difference = +(nextTotal - previousTotal).toFixed(2);
  if (difference >= 0) {
    shifts[activeIndex] = {
      ...shifts[activeIndex],
      miles: +(miles(shifts[activeIndex].miles) + difference).toFixed(2),
    };
  } else {
    let remainingReduction = Math.abs(difference);
    for (let index = activeIndex; index >= 0 && remainingReduction > 0; index -= 1) {
      const current = miles(shifts[index].miles);
      const reduction = Math.min(current, remainingReduction);
      shifts[index] = { ...shifts[index], miles: +(current - reduction).toFixed(2) };
      remainingReduction = +(remainingReduction - reduction).toFixed(2);
    }
  }

  return { ...day, mileage: nextTotal, shifts };
}

export function replaceShiftMileage(day: DayEntry, shiftId: string, nextMiles: number): DayEntry {
  const shifts = normalizeStoredShiftMiles(day);
  const index = shifts.findIndex((shift) => shift.id === shiftId);
  if (index < 0) return day;
  const previous = miles(shifts[index].miles);
  const next = miles(nextMiles);
  shifts[index] = { ...shifts[index], miles: next };
  return {
    ...day,
    mileage: Math.max(0, +(getAccumulatedDayMileage(day) + next - previous).toFixed(2)),
    shifts,
  };
}
