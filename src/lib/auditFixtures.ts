import type { WeekRecord } from "./types";

const emptyApps = { Uber: 0, Lyft: 0, DoorDash: 0 };

export const representativeAuditWeek: WeekRecord = {
  id: "audit-week-partial",
  startDate: "2026-06-29",
  endDate: "2026-07-05",
  weeklyGoal: 1100,
  weeklyHoursGoal: 40,
  status: "open",
  createdAt: "2026-06-29T06:00:00.000Z",
  updatedAt: "2026-07-03T22:00:00.000Z",
  entries: [
    {
      dayName: "Monday", date: "2026-06-29", apps: { Uber: 120.5, Lyft: 21.25, DoorDash: 0 }, logged: true, dayClosed: true, mileage: 48.5,
      bonuses: [{ id: "bonus-1", app: "Uber", amount: 15, source: "manual", createdAt: "2026-06-29T18:00:00.000Z" }],
      shifts: [{ id: "shift-1", startTime: "2026-06-29T08:00:00.000Z", endTime: "2026-06-29T12:00:00.000Z", earnings: 141.75, miles: 48.5, rideCount: 6, ridesByApp: { Uber: 5, Lyft: 1 }, blocks: [
        { id: "block-1", startTime: "2026-06-29T08:00:00.000Z", endTime: "2026-06-29T10:00:00.000Z" },
        { id: "block-2", startTime: "2026-06-29T10:30:00.000Z", endTime: "2026-06-29T12:00:00.000Z" },
      ] }],
    },
    { dayName: "Tuesday", date: "2026-06-30", apps: { ...emptyApps }, logged: true, dayClosed: true, mileage: 0, shifts: [] },
    { dayName: "Wednesday", date: "2026-07-01", apps: { Uber: 80, Lyft: 0, DoorDash: 35 }, logged: true, dayClosed: true, mileage: 62, shifts: [
      { id: "shift-2", startTime: "2026-07-01T09:00:00.000Z", endTime: "2026-07-01T11:00:00.000Z", miles: 22, rideCount: 3, ridesByApp: { Uber: 3 } },
      { id: "shift-3", startTime: "2026-07-01T14:00:00.000Z", endTime: "2026-07-01T17:00:00.000Z", miles: 40, rideCount: 4, ridesByApp: { DoorDash: 4 } },
    ] },
    { dayName: "Thursday", date: "2026-07-02", apps: { ...emptyApps } },
    { dayName: "Friday", date: "2026-07-03", apps: { ...emptyApps } },
    { dayName: "Saturday", date: "2026-07-04", apps: { ...emptyApps } },
    { dayName: "Sunday", date: "2026-07-05", apps: { ...emptyApps } },
  ],
};
