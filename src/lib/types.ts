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

export interface DayEntry {
  dayName: DayName;
  date: string;
  apps: Record<string, number>;
  logged?: boolean;
  mileage?: number;
}

export interface WeekRecord {
  id: string;
  startDate: string;
  endDate: string;
  weeklyGoal: number;
  status: "open" | "closed";
  entries: DayEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  defaultWeeklyGoal: number;
  currencySymbol: string;
  activeApps: string[];
}