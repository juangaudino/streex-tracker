import { useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
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
import { DAY_NAMES } from "@/lib/types";
import type { StoreContext } from "./types";
import { CalendarPlus, Save, Lock, Trash2, AlertTriangle, CheckCircle2, History } from "lucide-react";
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

export default function WeeklyEntryPage() {
  const { openWeek, weeks, settings, addWeek, updateWeek } =
    useOutletContext<StoreContext>();
  const { toast } = useToast();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [selectedDayIdx, setSelectedDayIdx] = useState<number | null>(null);
  const [justClosed, setJustClosed] = useState(false);
  const [editWeek, setEditWeek] = useState(openWeek);
  const [goalInput, setGoalInput] = useState(
    openWeek?.weeklyGoal?.toString() || settings.defaultWeeklyGoal.toString()
  );
  const [startDate, setStartDate] = useState<Date>(
    openWeek ? new Date(openWeek.startDate + "T00:00:00") : getMondayOfWeek()
  );
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);

  // Sync when openWeek changes externally
  if (openWeek && (!editWeek || editWeek.id !== openWeek.id)) {
    setEditWeek(openWeek);
    setGoalInput(openWeek.weeklyGoal.toString());
    setStartDate(new Date(openWeek.startDate + "T00:00:00"));
  }

  const sym = settings.currencySymbol;
  const apps = settings.activeApps;

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
      if (existing.status === "closed") {
        updateWeek({ ...existing, status: "open" });
      }
      setEditWeek(existing.status === "closed" ? { ...existing, status: "open" } : existing);
      setGoalInput(existing.weeklyGoal.toString());
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
      if (existing.status === "closed") {
        updateWeek({ ...existing, status: "open" });
      }
      setEditWeek(existing.status === "closed" ? { ...existing, status: "open" } : existing);
      setGoalInput(existing.weeklyGoal.toString());
      return;
    }

    if (openWeek) {
      updateWeek({ ...openWeek, status: "closed" });
    }

    const w = createWeek(
      getMondayOfWeek(startDate),
      Number(goalInput) || settings.defaultWeeklyGoal,
      apps
    );
    addWeek(w);
    setEditWeek(w);
    toast({ title: "Historical week created!" });
  }

  function handleSave() {
    if (!editWeek) return;
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
      return;
    }
    updateWeek({ ...editWeek, weeklyGoal: Number(goalInput) || 0 });
    toast({ title: "Week saved." });
  }

  function handleClose() {
    if (!editWeek) return;
    setCloseDialogOpen(true);
  }

  function performClose() {
    if (!editWeek) return;
    const closed = { ...editWeek, status: "closed" as const, weeklyGoal: Number(goalInput) || 0 };
    updateWeek(closed);
    setEditWeek(closed);
    setJustClosed(true);
    setCloseDialogOpen(false);
    toast({ title: "Week closed." });
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
                  if (duplicateWeek.status === "closed") {
                    updateWeek({ ...duplicateWeek, status: "open" });
                  }
                  setEditWeek(duplicateWeek.status === "closed" ? { ...duplicateWeek, status: "open" } : duplicateWeek);
                  setGoalInput(duplicateWeek.weeklyGoal.toString());
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
        onSave={() => {
          handleSave();
          setSelectedDayIdx(null);
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
          <h1 className="text-xl md:text-2xl font-bold">Weekly Entry</h1>
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
        <Button variant="outline" onClick={handleStartNew}>
          <CalendarPlus className="h-4 w-4 mr-1" /> New Week
        </Button>
        <Button variant="destructive" onClick={handleClear}>
          <Trash2 className="h-4 w-4 mr-1" /> Clear
        </Button>
      </div>
    </div>
  );
}