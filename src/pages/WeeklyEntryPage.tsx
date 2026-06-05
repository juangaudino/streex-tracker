import { useEffect, useState } from "react";
import { useOutletContext, useNavigate, useSearchParams } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  createWeek,
  getMondayOfWeek,
  formatCurrency,
  formatDate,
  dayTotal,
  weekTotal,
  appTotal,
} from "@/lib/store";
import { DAY_NAMES, type DayEntry, type ShiftSession, type WeekRecord } from "@/lib/types";
import type { StoreContext } from "./types";
import { CalendarPlus, Save, Lock, Trash2, AlertTriangle, CheckCircle2, History, ChevronDown, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import MobileWeekOverview from "@/components/MobileWeekOverview";
import MobileDayDetail from "@/components/MobileDayDetail";
import WeekClosingDialog from "@/components/WeekClosingDialog";
import { createShift, endActiveShift, getDayMiles, getDayShiftHours, getWeekMiles, getWeekShiftHours, hasActiveShift, shiftDurationHours } from "@/lib/shiftIntelligence";

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

function liveShiftDurationHours(shift: ShiftSession): number {
  const start = Date.parse(shift.startTime);
  if (Number.isNaN(start)) return 0;
  return Math.max(0, (Date.now() - start) / 3600000);
}

function formatShiftTime(value?: string): string {
  if (!value) return "active";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "active";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function WeeklyEntryPage() {
  const { openWeek, weeks, settings, addWeek, updateWeek } =
    useOutletContext<StoreContext>();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const requestedWeekId = searchParams.get("weekId");
  const requestedWeek = requestedWeekId ? weeks.find((w) => w.id === requestedWeekId) ?? null : null;
  const [selectedDayIdx, setSelectedDayIdx] = useState<number | null>(null);
  const [justClosed, setJustClosed] = useState(false);
  const [editWeek, setEditWeek] = useState(requestedWeek ?? openWeek);
  const [goalInput, setGoalInput] = useState(
    openWeek?.weeklyGoal?.toString() || settings.defaultWeeklyGoal.toString()
  );
  const [startDate, setStartDate] = useState<Date>(
    openWeek ? new Date(openWeek.startDate + "T00:00:00") : getMondayOfWeek()
  );
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [expandedShiftIds, setExpandedShiftIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const target = requestedWeekId ? requestedWeek : openWeek;
    if (!target) {
      if (!requestedWeekId) setEditWeek(null);
      return;
    }
    if (editWeek?.id === target.id) return;
    setEditWeek(target);
    setGoalInput(target.weeklyGoal.toString());
    setStartDate(new Date(target.startDate + "T00:00:00"));
    setSelectedDayIdx(null);
    setJustClosed(false);
  }, [requestedWeekId, requestedWeek, openWeek, editWeek?.id]);

  const sym = settings.currencySymbol;
  const apps = settings.activeApps;
  const isHistoricalEdit = Boolean(requestedWeekId && editWeek?.id === requestedWeekId && editWeek.status === "closed");

  // Check for duplicate week
  const selectedMonday = getMondayOfWeek(startDate);
  const selectedMondayStr = formatDate(selectedMonday);
  const duplicateWeek = weeks.find(
    (w) => w.startDate === selectedMondayStr && w.id !== editWeek?.id
  );

  function handleDateSelect(date: Date | undefined) {
    if (!date) return;
    const monday = getMondayOfWeek(date);
    setStartDate(monday);
    setDatePopoverOpen(false);

    // If we have an open week being edited, update its dates
    if (editWeek) {
      const mondayStr = formatDate(monday);
      const end = new Date(monday);
      end.setDate(end.getDate() + 6);
      const updatedEntries = editWeek.entries.map((d, i) => {
        const dayDate = new Date(monday);
        dayDate.setDate(dayDate.getDate() + i);
        return { ...d, dayName: DAY_NAMES[i], date: formatDate(dayDate) };
      });
      setEditWeek({
        ...editWeek,
        startDate: mondayStr,
        endDate: formatDate(end),
        entries: updatedEntries,
      });
    }
  }

  function handleStartNew() {
    // Check for duplicate
    const mondayStr = formatDate(getMondayOfWeek(startDate));
    const existing = weeks.find((w) => w.startDate === mondayStr);
    if (existing) {
      toast({
        title: "Week already exists",
        description: "Opening the existing week instead.",
        variant: "destructive",
      });
      setEditWeek(existing);
      setGoalInput(existing.weeklyGoal.toString());
      if (existing.status === "closed") setSearchParams({ weekId: existing.id });
      return;
    }

    if (openWeek && openWeek.id !== editWeek?.id) {
      if (
        !confirm(
          "You have an open week. Save and close it before starting a new one?"
        )
      )
        return;
      updateWeek({ ...openWeek, status: "closed" });
    }
    // Close current editWeek if it's open and different
    if (editWeek && openWeek && editWeek.id === openWeek.id) {
      updateWeek({ ...editWeek, status: "closed" });
    }

    const w = createWeek(
      getMondayOfWeek(startDate),
      Number(goalInput) || settings.defaultWeeklyGoal,
      apps
    );
    addWeek(w);
    setEditWeek(w);
    setSearchParams({});
    toast({ title: "New week started!" });
  }

  function handleStartHistorical() {
    const mondayStr = formatDate(getMondayOfWeek(startDate));
    const existing = weeks.find((w) => w.startDate === mondayStr);
    if (existing) {
      toast({
        title: "Week already exists",
        description: "Opening the existing week instead.",
        variant: "destructive",
      });
      setEditWeek(existing);
      setGoalInput(existing.weeklyGoal.toString());
      if (existing.status === "closed") setSearchParams({ weekId: existing.id });
      return;
    }

    const w = {
      ...createWeek(
        getMondayOfWeek(startDate),
        Number(goalInput) || settings.defaultWeeklyGoal,
        apps,
      ),
      status: "closed" as const,
    };
    addWeek(w);
    setEditWeek(w);
    setSearchParams({ weekId: w.id });
    toast({ title: "Historical week created!" });
  }

  async function handleSave(): Promise<boolean> {
    if (!editWeek) return false;
    // Check duplicate on save if dates changed
    const dup = weeks.find(
      (w) => w.startDate === editWeek.startDate && w.id !== editWeek.id
    );
    if (dup) {
      toast({
        title: "Duplicate week",
        description: "A week with this start date already exists.",
        variant: "destructive",
      });
      return false;
    }
    const saved = await updateWeek({ ...editWeek, weeklyGoal: Number(goalInput) || 0 });
    if (saved) toast({ title: "Week saved." });
    return saved;
  }

  function handleClose() {
    if (!editWeek) return;
    setCloseDialogOpen(true);
  }

  async function performClose() {
    if (!editWeek) return;
    const closed = { ...editWeek, status: "closed" as const, weeklyGoal: Number(goalInput) || 0 };
    const saved = await updateWeek(closed);
    if (saved) {
      setEditWeek(closed);
      setJustClosed(true);
      setCloseDialogOpen(false);
      toast({ title: "Week closed." });
    }
  }

  function handleClear() {
    if (!editWeek) return;
    if (!confirm("Clear all earnings for this week? This cannot be undone."))
      return;
    const cleared = {
      ...editWeek,
      entries: editWeek.entries.map((d) => ({
        ...d,
        apps: Object.fromEntries(Object.keys(d.apps).map((a) => [a, 0])),
      })),
    };
    setEditWeek(cleared);
    updateWeek(cleared);
    toast({ title: "Week cleared." });
  }

  function handleCellChange(dayIdx: number, app: string, val: string) {
    if (!editWeek) return;
    const numVal = parseFloat(val) || 0;
    const entries = editWeek.entries.map((d, i) => {
      if (i !== dayIdx) return d;
      const newApps = { ...d.apps, [app]: numVal };
      const newDayTotal = Object.values(newApps).reduce((s, v) => s + (v || 0), 0);
      // Auto-set logged if any earnings > 0
      return { ...d, apps: newApps, logged: newDayTotal > 0 ? true : d.logged };
    });
    setEditWeek({ ...editWeek, entries });
  }

  function handleLoggedToggle(dayIdx: number, checked: boolean) {
    if (!editWeek) return;
    const entries = editWeek.entries.map((d, i) => {
      if (i !== dayIdx) return d;
      // Can't unlog a day with earnings
      if (!checked && dayTotal(d) > 0) return d;
      return { ...d, logged: checked };
    });
    setEditWeek({ ...editWeek, entries });
  }

  function handleMileageUpdate(dayIdx: number, val: number) {
    if (!editWeek) return;
    const entries = editWeek.entries.map((d, i) => {
      if (i !== dayIdx) return d;
      return { ...d, mileage: val };
    });
    setEditWeek({ ...editWeek, entries });
  }

  async function persistShiftState(updatedWeek: WeekRecord) {
    const previousWeek = editWeek;
    setEditWeek(updatedWeek);
    const saved = await updateWeek(updatedWeek);
    if (!saved && previousWeek) setEditWeek(previousWeek);
  }

  function handleStartShift(dayIdx: number) {
    if (!editWeek) return;
    if (editWeek.entries.some(hasActiveShift)) return;
    const entries = editWeek.entries.map((d, i) => {
      if (i !== dayIdx) return d;
      return { ...d, shifts: [...(d.shifts ?? []), createShift(d.date)] };
    });
    persistShiftState({ ...editWeek, entries });
  }

  function handleEndShift(dayIdx: number) {
    if (!editWeek) return;
    const entries = editWeek.entries.map((d, i) => i === dayIdx ? endActiveShift(d) : d);
    persistShiftState({ ...editWeek, entries });
  }

  function handleShiftMilesUpdate(dayIdx: number, shiftId: string, val: string) {
    if (!editWeek) return;
    const miles = parseFloat(val) || 0;
    const entries = editWeek.entries.map((d, i) => {
      if (i !== dayIdx) return d;
      return {
        ...d,
        shifts: (d.shifts ?? []).map((shift) => shift.id === shiftId ? { ...shift, miles } : shift),
      };
    });
    persistShiftState({ ...editWeek, entries });
  }

  function handleShiftTimeUpdate(dayIdx: number, shiftId: string, field: "startTime" | "endTime", val: string) {
    if (!editWeek) return;
    const entries = editWeek.entries.map((d, i) => {
      if (i !== dayIdx) return d;
      return {
        ...d,
        shifts: (d.shifts ?? []).map((shift) => {
          if (shift.id !== shiftId) return shift;
          const next = { ...shift, [field]: applyTimeToShiftDate(d.date, val) };
          if (next.endTime && Date.parse(next.endTime) <= Date.parse(next.startTime)) {
            return field === "startTime" ? { ...next, endTime: undefined } : shift;
          }
          return next;
        }),
      };
    });
    persistShiftState({ ...editWeek, entries });
  }

  function handleDeleteShift(dayIdx: number, shiftId: string) {
    if (!editWeek) return;
    if (!confirm("Delete this shift block? This cannot be undone.")) return;
    const entries = editWeek.entries.map((d, i) => {
      if (i !== dayIdx) return d;
      return { ...d, shifts: (d.shifts ?? []).filter((shift) => shift.id !== shiftId) };
    });
    persistShiftState({ ...editWeek, entries });
  }

  function toggleShiftExpanded(shiftId: string) {
    setExpandedShiftIds((current) => {
      const next = new Set(current);
      if (next.has(shiftId)) next.delete(shiftId);
      else next.add(shiftId);
      return next;
    });
  }

  if (!editWeek) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4 text-center">
        <h2 className="text-2xl font-bold">No open week</h2>
        <p className="text-muted-foreground max-w-md">
          Start your first week and begin tracking your gig earnings.
        </p>
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Start Date:</span>
            <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-44 justify-start text-left font-mono text-sm">
                  <CalendarIcon className="h-4 w-4 mr-2 opacity-50" />
                  {format(startDate, "yyyy-MM-dd")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={handleDateSelect}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Goal:</span>
            <Input
              type="number"
              className="w-28 font-mono"
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
            />
          </div>
          {duplicateWeek && (
            <div className="flex items-center gap-2 text-warning text-sm">
              <AlertTriangle className="h-4 w-4" />
              <span>Week {selectedMondayStr} already exists.</span>
              <Button
                size="sm"
                variant="link"
                className="text-primary p-0 h-auto"
                onClick={() => {
                  setEditWeek(duplicateWeek);
                  setGoalInput(duplicateWeek.weeklyGoal.toString());
                  if (duplicateWeek.status === "closed") setSearchParams({ weekId: duplicateWeek.id });
                }}
              >
                Open it
              </Button>
            </div>
          )}
        </div>
        <div className="flex gap-2 flex-wrap justify-center">
          <Button size="lg" onClick={handleStartNew} disabled={!!duplicateWeek}>
            <CalendarPlus className="h-5 w-5 mr-2" />
            Start New Week
          </Button>
        </div>
      </div>
    );
  }

  const wt = weekTotal(editWeek);
  const isClosedView = editWeek.status === "closed" && justClosed;
  const weekHours = getWeekShiftHours(editWeek);
  const weekMiles = getWeekMiles(editWeek);
  const weekEarningsPerHour = weekHours > 0 ? wt / weekHours : null;
  const weekEarningsPerMile = weekMiles > 0 ? wt / weekMiles : null;
  const currentLocalDate = formatDate(new Date());
  const todayIndex = editWeek.entries.findIndex((day) => day.date === currentLocalDate);
  const shiftControlIndex = todayIndex;
  const shiftControlDay = shiftControlIndex >= 0 ? editWeek.entries[shiftControlIndex] : null;
  const activeShift = shiftControlDay ? hasActiveShift(shiftControlDay) : false;
  const allShifts = editWeek.entries.flatMap((day, dayIdx) =>
    (day.shifts ?? []).map((shift) => ({ day, dayIdx, shift })),
  );
  const activeShiftBlock = allShifts.find(({ shift }) => !shift.endTime) ?? null;
  const historicalShifts = allShifts.filter(({ shift }) => shift.endTime);
  const shiftRate = (day: DayEntry, shift: ShiftSession) => {
    const completedShiftsForDay = (day.shifts ?? []).filter((item) => item.endTime).length;
    if (completedShiftsForDay !== 1) return null;
    const hours = shiftDurationHours(shift);
    if (hours <= 0) return null;
    return dayTotal(day) / hours;
  };

  // Mobile day detail view
  if (isMobile && selectedDayIdx !== null && editWeek) {
    return (
      <MobileDayDetail
        day={editWeek.entries[selectedDayIdx]}
        dayIdx={selectedDayIdx}
        apps={apps}
        currencySymbol={sym}
        onBack={() => setSelectedDayIdx(null)}
        onUpdate={handleCellChange}
        onLoggedToggle={handleLoggedToggle}
        onMileageUpdate={handleMileageUpdate}
        onStartShift={handleStartShift}
        onEndShift={handleEndShift}
        onShiftMilesUpdate={handleShiftMilesUpdate}
        onShiftTimeUpdate={handleShiftTimeUpdate}
        onDeleteShift={handleDeleteShift}
        onSave={async () => {
          const saved = await handleSave();
          if (saved) setSelectedDayIdx(null);
        }}
      />
    );
  }

  if (isClosedView) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4 text-center">
        <CheckCircle2 className="h-12 w-12 text-success" />
        <h2 className="text-2xl font-bold">Week closed successfully</h2>
        <p className="text-muted-foreground">
          {editWeek.startDate} → {editWeek.endDate} • {formatCurrency(wt, sym)}
        </p>
        <div className="flex gap-3 flex-wrap justify-center">
          <Button size="lg" onClick={() => { setEditWeek(null); setJustClosed(false); }}>
            <CalendarPlus className="h-5 w-5 mr-2" />
            Start New Week
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate("/history")}>
            <History className="h-5 w-5 mr-2" />
            View History
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl md:text-2xl font-bold">Weekly Entry</h1>
            {isHistoricalEdit && (
              <span className="text-[10px] font-bold uppercase tracking-wider rounded-full bg-muted text-muted-foreground px-2 py-0.5">
                Historical edit
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="font-mono text-sm text-muted-foreground hover:text-foreground h-auto py-1 px-2">
                  <CalendarIcon className="h-3.5 w-3.5 mr-1.5 opacity-50" />
                  {editWeek.startDate} → {editWeek.endDate}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={new Date(editWeek.startDate + "T00:00:00")}
                  onSelect={handleDateSelect}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
          {duplicateWeek && (
            <div className="flex items-center gap-2 text-warning text-xs mt-1">
              <AlertTriangle className="h-3 w-3" />
              <span>Conflicts with existing week.</span>
              <Button
                size="sm"
                variant="link"
                className="text-primary p-0 h-auto text-xs"
                onClick={() => {
                  setEditWeek(duplicateWeek);
                  setGoalInput(duplicateWeek.weeklyGoal.toString());
                  if (duplicateWeek.status === "closed") setSearchParams({ weekId: duplicateWeek.id });
                  else setSearchParams({});
                }}
              >
                Switch to it
              </Button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Goal:</span>
          <Input
            type="number"
            className="w-24 font-mono text-sm"
            value={goalInput}
            onChange={(e) => setGoalInput(e.target.value)}
          />
        </div>
      </div>

      <section className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Shift + Mileage</p>
            <p className="text-sm font-semibold mt-0.5">
              {shiftControlDay ? `${shiftControlDay.dayName} · ${shiftControlDay.date}` : `Today · ${currentLocalDate}`}
            </p>
          </div>
          <Button
            size="sm"
            variant={activeShift ? "secondary" : "default"}
            disabled={!shiftControlDay}
            onClick={() => activeShift ? handleEndShift(shiftControlIndex) : handleStartShift(shiftControlIndex)}
          >
            {activeShift ? "End Shift" : "Start Shift"}
          </Button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="rounded-lg bg-background/60 border border-border px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Hours</p>
            <p className="text-sm font-bold font-mono">{weekHours.toFixed(1)}h</p>
          </div>
          <div className="rounded-lg bg-background/60 border border-border px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Miles</p>
            <p className="text-sm font-bold font-mono">{weekMiles.toFixed(1)}</p>
          </div>
          <div className="rounded-lg bg-background/60 border border-border px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Per Hour</p>
            <p className="text-sm font-bold font-mono">{weekEarningsPerHour ? formatCurrency(weekEarningsPerHour, sym) : "—"}</p>
          </div>
          <div className="rounded-lg bg-background/60 border border-border px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Per Mile</p>
            <p className="text-sm font-bold font-mono">{weekEarningsPerMile ? formatCurrency(weekEarningsPerMile, sym) : "—"}</p>
          </div>
        </div>
        <div className="space-y-2">
          {!shiftControlDay && (
            <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
              Today is outside this week. Open a specific day below to edit historical shift blocks.
            </p>
          )}
          {activeShiftBlock && (
            <div className="rounded-xl border border-success/25 bg-success/5 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-success">Active Shift</p>
                  <p className="mt-1 text-sm font-semibold">
                    Started: {formatShiftTime(activeShiftBlock.shift.startTime)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {activeShiftBlock.day.dayName} · {liveShiftDurationHours(activeShiftBlock.shift).toFixed(1)}h running
                  </p>
                </div>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  className="h-9 w-24 shrink-0 text-right font-mono text-xs"
                  value={activeShiftBlock.shift.miles || ""}
                  placeholder="mi"
                  onChange={(e) => handleShiftMilesUpdate(activeShiftBlock.dayIdx, activeShiftBlock.shift.id, e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="pt-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              This Week&apos;s Shifts ({allShifts.length})
            </p>
          </div>

          {historicalShifts.length === 0 && !activeShiftBlock && (
            <p className="rounded-lg border border-border bg-background/50 px-3 py-2 text-xs text-muted-foreground">
              No shift blocks logged yet.
            </p>
          )}

          {historicalShifts.map(({ day, dayIdx, shift }) => {
            const expanded = expandedShiftIds.has(shift.id);
            const hours = shiftDurationHours(shift);
            const rate = shiftRate(day, shift);
            return (
              <div key={shift.id} className="rounded-lg border border-border bg-background/50 px-3 py-2">
                <button
                  type="button"
                  className="flex w-full items-start gap-2 text-left"
                  onClick={() => toggleShiftExpanded(shift.id)}
                  aria-expanded={expanded}
                >
                  {expanded ? (
                    <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {day.dayName} · {formatShiftTime(shift.startTime)} → {formatShiftTime(shift.endTime)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {hours.toFixed(1)}h · {rate ? `${formatCurrency(rate, sym)}/hr` : "—/hr"} · {(shift.miles ?? 0).toFixed(1)} mi
                    </p>
                  </div>
                </button>

                {expanded && (
                  <div className="mt-3 grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-[minmax(0,7rem)_minmax(0,7rem)_minmax(0,1fr)_auto] sm:items-end">
                    <label className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Start</span>
                      <Input
                        key={`${shift.id}-start-${shift.startTime}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={5}
                        placeholder="HH:mm"
                        className="h-10 min-w-0 w-full appearance-none rounded-lg text-center font-mono text-sm sm:h-9 sm:text-xs"
                        defaultValue={timeInputValue(shift.startTime)}
                        onBlur={(e) => {
                          const value = e.currentTarget.value.trim();
                          if (!isValidTimeInput(value)) {
                            e.currentTarget.value = timeInputValue(shift.startTime);
                            return;
                          }
                          handleShiftTimeUpdate(dayIdx, shift.id, "startTime", value);
                        }}
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">End</span>
                      <Input
                        key={`${shift.id}-end-${shift.endTime ?? "active"}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={5}
                        placeholder="HH:mm"
                        className="h-10 min-w-0 w-full appearance-none rounded-lg text-center font-mono text-sm sm:h-9 sm:text-xs"
                        defaultValue={timeInputValue(shift.endTime)}
                        disabled={!shift.endTime}
                        onBlur={(e) => {
                          const value = e.currentTarget.value.trim();
                          if (!isValidTimeInput(value)) {
                            e.currentTarget.value = timeInputValue(shift.endTime);
                            return;
                          }
                          handleShiftTimeUpdate(dayIdx, shift.id, "endTime", value);
                        }}
                      />
                    </label>
                    <label className="col-span-2 space-y-1 sm:col-span-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Miles</span>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        className="h-10 min-w-0 w-full text-right font-mono text-sm sm:h-9 sm:text-xs"
                        value={shift.miles || ""}
                        placeholder="mi"
                        onChange={(e) => handleShiftMilesUpdate(dayIdx, shift.id, e.target.value)}
                      />
                    </label>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="col-span-2 h-10 w-10 justify-self-end text-destructive hover:bg-destructive/10 hover:text-destructive sm:col-span-1 sm:h-9 sm:w-9"
                      onClick={() => handleDeleteShift(dayIdx, shift.id)}
                      aria-label="Delete shift block"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Mobile: Week Overview with tappable days */}
      {isMobile ? (
        <MobileWeekOverview
          week={editWeek}
          currencySymbol={sym}
          onDayTap={setSelectedDayIdx}
        />
      ) : (
        /* Desktop Table */
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary/50">
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground sticky left-0 bg-secondary/50 z-10 min-w-[100px]">
                  Day
                </th>
                <th className="px-3 py-3 font-semibold text-muted-foreground text-center min-w-[50px]">
                  Log
                </th>
                {apps.map((app) => (
                  <th
                    key={app}
                    className="text-right px-3 py-3 font-semibold text-muted-foreground whitespace-nowrap min-w-[90px]"
                  >
                    {app}
                  </th>
                ))}
                <th className="text-right px-4 py-3 font-bold text-foreground min-w-[100px]">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {editWeek.entries.map((day, dayIdx) => {
                const dt = dayTotal(day);
                const isLogged = day.logged !== undefined ? day.logged : dt > 0;
                const isActive = dt > 0;
                return (
                  <tr
                    key={day.dayName}
                    className={cn(
                      "border-t border-border transition-colors",
                      isLogged ? "bg-card" : "bg-card/50",
                      "hover:bg-accent/30"
                    )}
                  >
                    <td className={cn(
                      "px-4 py-3 font-medium sticky left-0 z-10",
                      isLogged ? "bg-card" : "bg-card/50"
                    )}>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{day.dayName.slice(0, 3)}</span>
                        {isActive && (
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-success" />
                        )}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono">{day.date}</div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <Checkbox
                        checked={isLogged}
                        onCheckedChange={(checked) => handleLoggedToggle(dayIdx, !!checked)}
                        disabled={dt > 0}
                        className="mx-auto"
                      />
                    </td>
                    {apps.map((app) => (
                      <td key={app} className="px-2 py-2">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          className="w-full text-right font-mono text-sm h-9 bg-transparent border-border/50 focus:border-primary"
                          value={day.apps[app] || ""}
                          placeholder="0.00"
                          onChange={(e) =>
                            handleCellChange(dayIdx, app, e.target.value)
                          }
                        />
                      </td>
                    ))}
                    <td className={cn(
                      "px-4 py-3 text-right font-mono font-bold",
                      isActive ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {formatCurrency(dt, sym)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border bg-secondary/30">
                <td className="px-4 py-3 font-bold sticky left-0 bg-secondary/30 z-10">
                  Total
                </td>
                <td></td>
                {apps.map((app) => (
                  <td key={app} className="px-3 py-3 text-right font-mono font-semibold">
                    {formatCurrency(appTotal(editWeek, app), sym)}
                  </td>
                ))}
                <td className="px-4 py-3 text-right font-mono font-bold text-primary text-lg">
                  {formatCurrency(wt, sym)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-1" /> Save
        </Button>
        {editWeek.status === "open" && (
          <Button variant="secondary" onClick={handleClose}>
            <Lock className="h-4 w-4 mr-1" /> Close Week
          </Button>
        )}
        {isHistoricalEdit ? (
          <Button variant="outline" onClick={() => navigate("/history")}>
            <History className="h-4 w-4 mr-1" /> Back to History
          </Button>
        ) : (
          <Button variant="outline" onClick={handleStartNew}>
            <CalendarPlus className="h-4 w-4 mr-1" /> New Week
          </Button>
        )}
        <Button variant="destructive" onClick={handleClear}>
          <Trash2 className="h-4 w-4 mr-1" /> Clear
        </Button>
      </div>
      {editWeek.status === "open" && (
        <WeekClosingDialog
          open={closeDialogOpen}
          onOpenChange={setCloseDialogOpen}
          week={editWeek}
          weeks={weeks}
          currencySymbol={sym}
          onConfirm={performClose}
        />
      )}
    </div>
  );
}
