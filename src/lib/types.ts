export const DEFAULT_APPS = [
  "Uber",
  "Lyft",
  "Spark Driver",
  "DoorDash",
  "Amazon Flex",
  "Instacart",
  "Shipt",
] as const;

export const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export type DayName = (typeof DAY_NAMES)[number];

export interface ShiftWorkBlock {
  id: string;
  startTime: string;
  endTime?: string;
}

export interface ShiftSession {
  id: string;
  startTime: string;
  endTime?: string;
  blocks?: ShiftWorkBlock[];
  earnings?: number;
  miles?: number;
  rideCount?: number;
  note?: string;
}

export interface BonusEntry {
  id: string;
  app: string;
  amount: number;
  createdAt?: string;
  source?: "manual" | "legacy_octopus";
}

export interface DayEntry {
  dayName: DayName;
  date: string;
  apps: Record<string, number>;
  bonuses?: BonusEntry[];
  logged?: boolean;
  /** Day finalized via "End Day". Distinct from `logged` (which auto-flags on any earnings entry). */
  dayClosed?: boolean;
  shifts?: ShiftSession[];
  mileage?: number;
  notes?: string;
}

export interface WeekRecord {
  id: string;
  startDate: string;
  endDate: string;
  weeklyGoal: number;
  weeklyHoursGoal?: number;
  status: "open" | "closed";
  entries: DayEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface EarningsSnapshot {
  id: string;
  userId: string;
  weekId: string;
  dayDate: string;
  app: string;
  previousAmount: number;
  newAmount: number;
  delta: number;
  shiftId?: string | null;
  createdAt: string;
}

export interface AppSettings {
  defaultWeeklyGoal: number;
  defaultWeeklyHoursGoal?: number;
  currencySymbol: string;
  activeApps: string[];
  octopusPoints: number;
  octopusUpdatedAt?: string;
}
