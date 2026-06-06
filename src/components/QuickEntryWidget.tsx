import { useState } from "react";
import { Zap, MoonStar, Lock, Clock, Route } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { dayTotal, formatCurrency } from "@/lib/store";
import type { WeekRecord, DayEntry } from "@/lib/types";
import { cn } from "@/lib/utils";
import { getDayOfWeekRecord } from "@/components/ActiveMomentum";
import { triggerCelebration } from "@/components/RecordCelebration";
import { createShift, endActiveShift, getActiveShift, getDayShiftHours, hasActiveShift, shiftDurationHours } from "@/lib/shiftIntelligence";

interface QuickEntryWidgetProps {  
  openWeek: WeekRecord;
  apps: string[];
  currencySymbol: string;
  onSave: (updatedWeek: WeekRecord) => void | Promise<boolean>;
  weeks?: WeekRecord[];
  /** Optional End Day handler — when provided, renders End Day next to Quick Add. */
  onEndDay?: () => void;
}

function getTodayDayIdx(week: WeekRecord): number {
  const today = new Date();
  // Use local date parts to avoid timezone offset issues
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  const todayStr = `${y}-${m}-${d}`;
  const idx = week.entries.findIndex((d) => d.date === todayStr);
  return idx;
}

export default function QuickEntryWidget({ openWeek, apps, currencySymbol, onSave, weeks, onEndDay }: QuickEntryWidgetProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"quick" | "full">("quick");
  const [quickApp, setQuickApp] = useState<string | null>(null);
  const todayIdx = getTodayDayIdx(openWeek);
  const today = todayIdx >= 0 ? openWeek.entries[todayIdx] : null;

  const [localApps, setLocalApps] = useState<Record<string, number>>({});
  const [localLogged, setLocalLogged] = useState(false);
  const [localMileage, setLocalMileage] = useState("");
  const [localRideCount, setLocalRideCount] = useState("");
  // Store the resolved index at open time so save always targets the same day
  const [resolvedIdx, setResolvedIdx] = useState(todayIdx);

  function handleOpen(isOpen: boolean) {
    if (isOpen && today) {
      const active = getActiveShift(today);
      setLocalApps({ ...today.apps });
      setLocalLogged(today.logged !== undefined ? today.logged : dayTotal(today) > 0);
      setResolvedIdx(todayIdx);
      setLocalMileage(active?.miles ? String(active.miles) : today.mileage ? String(today.mileage) : "");
      setLocalRideCount(active?.rideCount ? String(active.rideCount) : "");
      setMode("quick");
      setQuickApp(null);
    }
    setOpen(isOpen);
  }

  async function persistQuickWeek(updatedWeek: WeekRecord): Promise<boolean> {
    try {
      const result = await onSave(updatedWeek);
      return result !== false;
    } catch (error) {
      console.error("[QuickEntryWidget] week update failed", { weekId: updatedWeek.id, error });
      return false;
    }
  }

  async function handleSave() {
    if (!today || resolvedIdx < 0) return;
    const dt = Object.values(localApps).reduce((s, v) => s + (v || 0), 0);
    const prevTotal = dayTotal(today);
    const mileage = parseFloat(localMileage);
    const entries = openWeek.entries.map((d, i) => {
      if (i !== resolvedIdx) return d;
      return { ...d, apps: { ...localApps }, logged: dt > 0 ? true : localLogged, mileage: Number.isFinite(mileage) ? mileage : d.mileage };
    });
    // Check if this save breaks a record
    if (weeks && today && dt > prevTotal) {
      const dayRec = getDayOfWeekRecord(weeks, today.dayName);
      const dayRecExcluding = getDayOfWeekRecord(weeks, today.dayName, today.date);
      if (dt > dayRecExcluding.record && dayRecExcluding.record > 0) {
        triggerCelebration({
          id: `day-record-${Date.now()}`,
          type: "weekday-record",
          title: `New ${today.dayName} Record`,
          value: formatCurrency(dt, currencySymbol),
          icon: "🏆",
          subtitle: `Previous best: ${formatCurrency(dayRec.record, currencySymbol)}`,
        });
      }
    }
    const saved = await persistQuickWeek({ ...openWeek, entries });
    if (saved) setOpen(false);
  }

  async function handleQuickSave(app: string) {
    if (!today || resolvedIdx < 0) return;
    const appTotal = Number(localApps[app]) || 0;
    const prevTotal = dayTotal(today);
    const mileage = localMileage.trim() === "" ? null : Math.max(0, parseFloat(localMileage) || 0);
    const rides = localRideCount.trim() === "" ? null : Math.max(0, Math.trunc(Number(localRideCount) || 0));
    const activeShift = getActiveShift(today);
    const entries = openWeek.entries.map((d, i) => {
      if (i !== resolvedIdx) return d;
      const nextApps = { ...d.apps, [app]: appTotal };
      const shifts = (d.shifts ?? []).map((shift) => {
        if (!activeShift || shift.id !== activeShift.id) return shift;
        return {
          ...shift,
          ...(mileage !== null ? { miles: mileage } : {}),
          ...(rides !== null ? { rideCount: rides } : {}),
        };
      });
      return {
        ...d,
        apps: nextApps,
        logged: Object.values(nextApps).some((value) => (Number(value) || 0) > 0) ? true : d.logged,
        ...(mileage !== null ? { mileage } : {}),
        shifts,
      };
    });
    const nextDay = entries[resolvedIdx];
    const nextTotal = nextDay ? dayTotal(nextDay) : appTotal;
    if (weeks && nextDay && nextTotal > prevTotal) {
      const dayRec = getDayOfWeekRecord(weeks, nextDay.dayName);
      const dayRecExcluding = getDayOfWeekRecord(weeks, nextDay.dayName, nextDay.date);
      if (nextTotal > dayRecExcluding.record && dayRecExcluding.record > 0) {
        triggerCelebration({
          id: `day-record-${Date.now()}`,
          type: "weekday-record",
          title: `New ${nextDay.dayName} Record`,
          value: formatCurrency(nextTotal, currencySymbol),
          icon: "🏆",
          subtitle: `Previous best: ${formatCurrency(dayRec.record, currencySymbol)}`,
        });
      }
    }
    const saved = await persistQuickWeek({ ...openWeek, entries });
    if (saved) setOpen(false);
  }

  async function handleStartShift() {
    const targetIdx = resolvedIdx >= 0 ? resolvedIdx : todayIdx;
    if (targetIdx < 0 || openWeek.entries.some(hasActiveShift)) return;
    const entries = openWeek.entries.map((d, i) => {
      if (i !== targetIdx) return d;
      return { ...d, shifts: [...(d.shifts ?? []), createShift(d.date)] };
    });
    await persistQuickWeek({ ...openWeek, entries });
  }

  async function handleEndShift() {
    const targetIdx = resolvedIdx >= 0 ? resolvedIdx : todayIdx;
    if (targetIdx < 0) return;
    const entries = openWeek.entries.map((d, i) => i === targetIdx ? endActiveShift(d) : d);
    await persistQuickWeek({ ...openWeek, entries });
  }

  if (!today || todayIdx < 0) return null;

  const todayTotal = dayTotal(today);
  const now = new Date();
  const dayLabel = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const isClosed = !!today.dayClosed;
  const todayHasActiveShift = hasActiveShift(today);
  const weekHasActiveShift = openWeek.entries.some(hasActiveShift);
  const shiftHours = getDayShiftHours(today);
  const preferredApps = ["Uber", "Lyft"].filter((app) => apps.includes(app));
  const primaryApps = [
    ...preferredApps,
    ...apps.filter((app) => !preferredApps.includes(app)),
  ].slice(0, 2);
  const activeShift = getActiveShift(today);

  return (
    <div className="bg-card rounded-xl border border-primary/20 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Today</p>
          <p className="text-sm font-semibold">{dayLabel}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-xl font-bold font-mono text-primary">
            {formatCurrency(todayTotal, currencySymbol)}
          </span>
          {isClosed && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gold/15 text-gold border border-gold/30">
              <Lock className="h-3 w-3" /> Day Closed
            </span>
          )}
        </div>
      </div>
      {isClosed ? (
        <p className="text-xs text-muted-foreground/80 leading-relaxed">
          Day finalized. Edit entries from the Entry screen if needed.
        </p>
      ) : (
      <div className={cn("grid gap-2", onEndDay ? "grid-cols-[1fr_auto]" : "grid-cols-1")}>
      <Sheet open={open} onOpenChange={handleOpen}>
        <SheetTrigger asChild>
          <Button size="sm" className="w-full gap-2">
            <Zap className="h-4 w-4" />
            Quick Add
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-left">
              {mode === "quick" ? "Quick Update" : dayLabel}
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-3 mt-4">
            {mode === "quick" ? (
              <>
                {!quickApp ? (
                  <div className="space-y-2">
                    {primaryApps.map((app) => (
                      <Button
                        key={app}
                        type="button"
                        variant="outline"
                        className="h-16 w-full justify-between rounded-xl px-4"
                        onClick={() => setQuickApp(app)}
                      >
                        <span className="text-base font-semibold">{app}</span>
                        <span className="font-mono text-lg text-primary">
                          {formatCurrency(localApps[app] || 0, currencySymbol)}
                        </span>
                      </Button>
                    ))}
                    <Button type="button" variant="secondary" className="w-full" onClick={() => setMode("full")}>
                      More Apps
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-border bg-background/60 p-4">
                      <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                        {quickApp} total today
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        className="mt-2 h-16 text-right font-mono text-4xl font-bold"
                        placeholder="0.00"
                        value={localApps[quickApp] || ""}
                        onChange={(e) =>
                          setLocalApps((prev) => ({ ...prev, [quickApp]: parseFloat(e.target.value) || 0 }))
                        }
                      />
                      <p className="mt-2 text-xs text-muted-foreground">
                        Enter the current accumulated total, not an amount to add.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="rounded-xl border border-border bg-background/60 p-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Miles</span>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          className="mt-1 h-10 text-right font-mono"
                          placeholder={activeShift ? "optional" : "optional"}
                          value={localMileage}
                          onChange={(e) => setLocalMileage(e.target.value)}
                        />
                      </label>
                      <label className="rounded-xl border border-border bg-background/60 p-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Rides</span>
                        <Input
                          type="number"
                          step="1"
                          min="0"
                          className="mt-1 h-10 text-right font-mono"
                          placeholder={activeShift ? "optional" : "needs shift"}
                          value={localRideCount}
                          onChange={(e) => setLocalRideCount(e.target.value)}
                          disabled={!activeShift}
                        />
                      </label>
                    </div>
                    {!activeShift && (
                      <p className="text-xs text-muted-foreground">
                        Rides are saved to the active shift. Start a shift to track ride count.
                      </p>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <Button type="button" variant="outline" onClick={() => setQuickApp(null)}>
                        Back
                      </Button>
                      <Button type="button" onClick={() => handleQuickSave(quickApp)}>
                        Save Update
                      </Button>
                    </div>
                    <Button type="button" variant="ghost" className="w-full" onClick={() => setMode("full")}>
                      More Apps
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <>
                {apps.map((app) => (
                  <div key={app} className="flex items-center justify-between gap-3">
                    <label className="text-sm font-medium min-w-0 truncate flex-1">{app}</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-28 text-right font-mono"
                      placeholder="0.00"
                      value={localApps[app] || ""}
                      onChange={(e) =>
                        setLocalApps((prev) => ({ ...prev, [app]: parseFloat(e.target.value) || 0 }))
                      }
                    />
                  </div>
                ))}
                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  <div className="flex items-center justify-between w-full gap-3 pb-2">
                    <label className="text-sm text-muted-foreground">Miles</label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      className="w-20 text-right font-mono text-sm"
                      placeholder="0.0"
                      value={localMileage}
                      onChange={(e) => setLocalMileage(e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}
            {mode === "full" && (
            <div className="border-t border-border pt-3 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    Shift Blocks
                  </p>
                  <p className="text-xs text-muted-foreground">{shiftHours.toFixed(1)}h logged today</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={todayHasActiveShift ? "secondary" : "default"}
                  disabled={!todayHasActiveShift && weekHasActiveShift}
                  onClick={todayHasActiveShift ? handleEndShift : handleStartShift}
                >
                  {todayHasActiveShift ? "End" : "Start"}
                </Button>
              </div>
              {(today.shifts ?? []).map((shift) => (
                <div key={shift.id} className="rounded-lg border border-border bg-background/60 px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate">
                        {new Date(shift.startTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                        {shift.endTime ? ` → ${new Date(shift.endTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : " → active"}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {shift.endTime ? `${shiftDurationHours(shift).toFixed(1)}h` : "running"}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Route className="h-3.5 w-3.5" />
                      {Number(shift.miles || 0).toFixed(1)} mi
                    </span>
                  </div>
                </div>
              ))}
              {!todayHasActiveShift && weekHasActiveShift && (
                <p className="text-xs text-muted-foreground">
                  Another shift is already active. End it from Entry before starting a new one.
                </p>
              )}
            </div>
            )}
            {mode === "full" && (
            <>
            <div className="flex items-center gap-2 border-t border-border pt-2">
              <Checkbox
                id="quick-logged"
                checked={localLogged || Object.values(localApps).some((v) => v > 0)}
                onCheckedChange={(checked) => setLocalLogged(!!checked)}
                disabled={Object.values(localApps).some((v) => v > 0)}
              />
              <label htmlFor="quick-logged" className="text-sm text-muted-foreground">
                Mark as logged
              </label>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Total: <span className="font-bold font-mono text-foreground">
                  {formatCurrency(Object.values(localApps).reduce((s, v) => s + (v || 0), 0), currencySymbol)}
                </span>
              </span>
              <Button onClick={handleSave}>Save Today</Button>
            </div>
            </>
            )}
          </div>
        </SheetContent>
      </Sheet>
        {onEndDay && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onEndDay}
            className="gap-2 border-gold/30 text-gold hover:bg-gold/10 hover:text-gold whitespace-nowrap"
          >
            <MoonStar className="h-4 w-4" />
            End Day
          </Button>
        )}
      </div>
      )}
    </div>
  );
}
