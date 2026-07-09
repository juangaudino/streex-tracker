import { useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  weekTotal,
  bestDay,
  bestApp,
  formatCurrency,
} from "@/lib/store";
import type { StoreContext } from "./types";
import type { DayEntry, ShiftSession, WeekRecord } from "@/lib/types";
import { Copy, Eye, Pencil, Plus, Trash2, Trophy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createHistoricalShift, getShiftMiles, shiftDurationHours, updateShiftBoundaryTime } from "@/lib/shiftIntelligence";
import { replaceShiftMileage } from "@/lib/mileageAttribution";
import { replaceShiftTotalRideCount } from "@/lib/rideAttribution";

function timeInputValue(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function isValidTimeInput(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function applyTimeToShiftDate(dayDate: string, value: string): string {
  return `${dayDate}T${value || "00:00"}:00`;
}

function formatShiftTime(value?: string): string {
  if (!value) return "active";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "active";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function HistoryPage() {
  const { weeks, settings, deleteWeek, addWeek, updateWeek } =
    useOutletContext<StoreContext>();
  const { toast } = useToast();
  const navigate = useNavigate();
  const sym = settings.currencySymbol;
  const [editingWeekId, setEditingWeekId] = useState<string | null>(null);
  const [expandedShiftIds, setExpandedShiftIds] = useState<Set<string>>(() => new Set());

  const sorted = [...weeks].sort(
    (a, b) => b.startDate.localeCompare(a.startDate)
  );

  const record = weeks.length > 0
    ? weeks.reduce((best, w) => (weekTotal(w) > weekTotal(best) ? w : best))
    : null;

  async function persistWeek(updatedWeek: WeekRecord) {
    const saved = await updateWeek(updatedWeek);
    if (!saved) toast({ title: "Could not save historical edits.", variant: "destructive" });
  }

  function updateHistoricalDay(week: WeekRecord, dayIdx: number, updater: (day: DayEntry) => DayEntry) {
    const day = week.entries[dayIdx];
    if (!day) return;
    const entries = week.entries.map((entry, index) => index === dayIdx ? updater(entry) : entry);
    persistWeek({ ...week, entries });
  }

  function handleAddShift(week: WeekRecord, dayIdx: number) {
    const day = week.entries[dayIdx];
    if (!day) return;
    const shift = createHistoricalShift(day.date);
    setExpandedShiftIds((current) => new Set(current).add(shift.id));
    updateHistoricalDay(week, dayIdx, (entry) => ({
      ...entry,
      logged: true,
      shifts: [...(entry.shifts ?? []), shift],
    }));
  }

  function handleShiftTimeUpdate(week: WeekRecord, dayIdx: number, shiftId: string, field: "startTime" | "endTime", value: string) {
    updateHistoricalDay(week, dayIdx, (day) => ({
      ...day,
      shifts: (day.shifts ?? []).map((shift) => {
        if (shift.id !== shiftId) return shift;
        const next = updateShiftBoundaryTime(shift, field, applyTimeToShiftDate(day.date, value));
        return next ?? shift;
      }),
    }));
  }

  function handleShiftMilesUpdate(week: WeekRecord, dayIdx: number, shiftId: string, value: string) {
    updateHistoricalDay(week, dayIdx, (day) => replaceShiftMileage(day, shiftId, Number.parseFloat(value) || 0));
  }

  function handleShiftEarningsUpdate(week: WeekRecord, dayIdx: number, shiftId: string, value: string) {
    const trimmed = value.trim();
    const earnings = trimmed === "" ? undefined : Math.max(0, Number.parseFloat(trimmed) || 0);
    updateHistoricalDay(week, dayIdx, (day) => ({
      ...day,
      shifts: (day.shifts ?? []).map((shift) => shift.id === shiftId ? { ...shift, earnings } : shift),
    }));
  }

  function handleShiftRideCountUpdate(week: WeekRecord, dayIdx: number, shiftId: string, value: string) {
    const rideCount = Math.max(0, Math.trunc(Number(value) || 0));
    updateHistoricalDay(week, dayIdx, (day) => ({
      ...day,
      shifts: (day.shifts ?? []).map((shift) => shift.id === shiftId ? replaceShiftTotalRideCount(shift, rideCount) : shift),
    }));
  }

  function handleDeleteShift(week: WeekRecord, dayIdx: number, shiftId: string) {
    if (!confirm("Delete this historical shift? This cannot be undone.")) return;
    updateHistoricalDay(week, dayIdx, (day) => ({
      ...day,
      shifts: (day.shifts ?? []).filter((shift) => shift.id !== shiftId),
    }));
  }

  function toggleShiftExpanded(shiftId: string) {
    setExpandedShiftIds((current) => {
      const next = new Set(current);
      if (next.has(shiftId)) next.delete(shiftId);
      else next.add(shiftId);
      return next;
    });
  }

  if (sorted.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">No saved weeks yet.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">History</h1>
      <div className="space-y-3">
        {sorted.map((w) => {
          const total = weekTotal(w);
          const bd = bestDay(w);
          const ba = bestApp(w);
          const isRecord = record?.id === w.id && total > 0;
          const goalDiff = total - w.weeklyGoal;
          return (
            <div
              key={w.id}
              className={`bg-card rounded-xl border p-4 space-y-2 ${
                isRecord ? "border-gold/50" : "border-border"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">
                    {w.startDate} → {w.endDate}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      w.status === "open"
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {w.status}
                  </span>
                  {isRecord && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-gold/15 text-gold">
                      <Trophy className="h-3 w-3" /> Record Week
                    </span>
                  )}
                </div>
                <span className="font-mono font-bold text-lg text-primary whitespace-nowrap">
                  {formatCurrency(total, sym)}
                </span>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>Goal: {formatCurrency(w.weeklyGoal, sym)}</span>
                <span
                  className={
                    goalDiff >= 0 ? "text-success" : "text-warning"
                  }
                >
                  {goalDiff >= 0 ? "+" : ""}
                  {formatCurrency(goalDiff, sym)} vs goal
                </span>
                <span>Best day: {bd.dayName} ({formatCurrency(bd.total, sym)})</span>
                <span>Best app: {ba.app}</span>
              </div>

              <div className="flex gap-1 pt-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (w.status === "open") navigate("/entry");
                    else setEditingWeekId((current) => current === w.id ? null : w.id);
                  }}
                >
                  {w.status === "open" ? (
                    <Eye className="h-3.5 w-3.5" />
                  ) : (
                    <Pencil className="h-3.5 w-3.5" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const dup = {
                      ...w,
                      id: "week_" + Date.now(),
                      status: "open" as const,
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    };
                    addWeek(dup);
                    toast({ title: "Week duplicated." });
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => {
                    if (!confirm("Delete this week permanently?")) return;
                    deleteWeek(w.id);
                    toast({ title: "Week deleted." });
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              {editingWeekId === w.id && w.status === "closed" && (
                <div className="mt-3 rounded-xl border border-border bg-background/45 p-3">
                  <div className="mb-3">
                    <p className="text-sm font-bold">Historical shift editor</p>
                    <p className="text-xs text-muted-foreground">
                      Add old shifts here, then edit start, end, earnings, miles, and rides from your notes.
                    </p>
                  </div>
                  <div className="space-y-3">
                    {w.entries.map((day, dayIdx) => (
                      <div key={day.date} className="rounded-lg border border-border bg-card/60 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-bold">{day.dayName}</p>
                            <p className="font-mono text-xs text-muted-foreground">{day.date}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-muted-foreground">{day.shifts?.length ?? 0} shifts</span>
                            <Button type="button" size="sm" variant="outline" onClick={() => handleAddShift(w, dayIdx)}>
                              <Plus className="mr-1 h-3.5 w-3.5" />
                              Add shift
                            </Button>
                          </div>
                        </div>

                        {(day.shifts ?? []).length > 0 && (
                          <div className="mt-3 space-y-2">
                            {(day.shifts ?? []).map((shift) => (
                              <HistoricalShiftRow
                                key={shift.id}
                                day={day}
                                shift={shift}
                                currencySymbol={sym}
                                expanded={expandedShiftIds.has(shift.id)}
                                onToggle={() => toggleShiftExpanded(shift.id)}
                                onTimeUpdate={(field, value) => handleShiftTimeUpdate(w, dayIdx, shift.id, field, value)}
                                onMilesUpdate={(value) => handleShiftMilesUpdate(w, dayIdx, shift.id, value)}
                                onEarningsUpdate={(value) => handleShiftEarningsUpdate(w, dayIdx, shift.id, value)}
                                onRideCountUpdate={(value) => handleShiftRideCountUpdate(w, dayIdx, shift.id, value)}
                                onDelete={() => handleDeleteShift(w, dayIdx, shift.id)}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HistoricalShiftRow({
  day,
  shift,
  currencySymbol,
  expanded,
  onToggle,
  onTimeUpdate,
  onMilesUpdate,
  onEarningsUpdate,
  onRideCountUpdate,
  onDelete,
}: {
  day: DayEntry;
  shift: ShiftSession;
  currencySymbol: string;
  expanded: boolean;
  onToggle: () => void;
  onTimeUpdate: (field: "startTime" | "endTime", value: string) => void;
  onMilesUpdate: (value: string) => void;
  onEarningsUpdate: (value: string) => void;
  onRideCountUpdate: (value: string) => void;
  onDelete: () => void;
}) {
  const hours = shiftDurationHours(shift);
  const rate = hours > 0 && shift.earnings ? shift.earnings / hours : null;

  return (
    <div className="rounded-lg border border-border bg-background/60 px-3 py-2">
      <button type="button" className="flex w-full items-start justify-between gap-3 text-left" onClick={onToggle}>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {formatShiftTime(shift.startTime)} → {formatShiftTime(shift.endTime)}
          </p>
          <p className="text-xs text-muted-foreground">
            {hours.toFixed(1)}h · {rate ? `${formatCurrency(rate, currencySymbol)}/hr` : "—/hr"} · {getShiftMiles(day, shift).toFixed(1)} mi · {shift.rideCount ?? 0} rides
          </p>
        </div>
        <span className="shrink-0 text-xs font-bold text-muted-foreground">{expanded ? "Hide" : "Edit"}</span>
      </button>

      {expanded && (
        <div className="mt-3 grid min-w-0 grid-cols-1 gap-2 md:grid-cols-[minmax(0,7rem)_minmax(0,7rem)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
          <label className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Start</span>
            <Input
              key={`${shift.id}-history-start-${shift.startTime}`}
              type="text"
              inputMode="numeric"
              maxLength={5}
              placeholder="HH:mm"
              className="h-10 text-center font-mono text-sm md:h-9 md:text-xs"
              defaultValue={timeInputValue(shift.startTime)}
              onBlur={(event) => {
                const value = event.currentTarget.value.trim();
                if (!isValidTimeInput(value)) {
                  event.currentTarget.value = timeInputValue(shift.startTime);
                  return;
                }
                onTimeUpdate("startTime", value);
              }}
            />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">End</span>
            <Input
              key={`${shift.id}-history-end-${shift.endTime ?? "active"}`}
              type="text"
              inputMode="numeric"
              maxLength={5}
              placeholder="HH:mm"
              className="h-10 text-center font-mono text-sm md:h-9 md:text-xs"
              defaultValue={timeInputValue(shift.endTime)}
              onBlur={(event) => {
                const value = event.currentTarget.value.trim();
                if (!isValidTimeInput(value)) {
                  event.currentTarget.value = timeInputValue(shift.endTime);
                  return;
                }
                onTimeUpdate("endTime", value);
              }}
            />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Earnings</span>
            <Input
              type="number"
              step="0.01"
              min="0"
              className="h-10 text-right font-mono text-sm md:h-9 md:text-xs"
              value={shift.earnings || ""}
              placeholder={currencySymbol}
              onChange={(event) => onEarningsUpdate(event.target.value)}
            />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Miles</span>
            <Input
              type="number"
              step="0.1"
              min="0"
              className="h-10 text-right font-mono text-sm md:h-9 md:text-xs"
              value={getShiftMiles(day, shift) || ""}
              placeholder="mi"
              onChange={(event) => onMilesUpdate(event.target.value)}
            />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total rides</span>
            <Input
              type="number"
              step="1"
              min="0"
              className="h-10 text-right font-mono text-sm md:h-9 md:text-xs"
              value={shift.rideCount || ""}
              placeholder="0"
              onChange={(event) => onRideCountUpdate(event.target.value)}
            />
          </label>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-10 w-10 justify-self-end text-destructive hover:bg-destructive/10 hover:text-destructive md:h-9 md:w-9"
            onClick={onDelete}
            aria-label="Delete historical shift"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
