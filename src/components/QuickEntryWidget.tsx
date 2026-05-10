import { useState } from "react";
import { Zap, MoonStar, Lock } from "lucide-react";
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

interface QuickEntryWidgetProps {  
  openWeek: WeekRecord;
  apps: string[];
  currencySymbol: string;
  onSave: (updatedWeek: WeekRecord) => void;
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
  if (idx >= 0) return idx;
  // Fallback: match by day name
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const todayName = dayNames[today.getDay()];
  return week.entries.findIndex((d) => d.dayName === todayName);
}

export default function QuickEntryWidget({ openWeek, apps, currencySymbol, onSave, weeks, onEndDay }: QuickEntryWidgetProps) {
  const [open, setOpen] = useState(false);
  const todayIdx = getTodayDayIdx(openWeek);
  const today = todayIdx >= 0 ? openWeek.entries[todayIdx] : null;

  const [localApps, setLocalApps] = useState<Record<string, number>>({});
  const [localLogged, setLocalLogged] = useState(false);
  const [localMileage, setLocalMileage] = useState(0);
  // Store the resolved index at open time so save always targets the same day
  const [resolvedIdx, setResolvedIdx] = useState(todayIdx);

  function handleOpen(isOpen: boolean) {
    if (isOpen && today) {
      setLocalApps({ ...today.apps });
      setLocalLogged(today.logged !== undefined ? today.logged : dayTotal(today) > 0);
      setResolvedIdx(todayIdx);
      setLocalMileage(today.mileage || 0);
    }
    setOpen(isOpen);
  }

  function handleSave() {
    if (!today || resolvedIdx < 0) return;
    const dt = Object.values(localApps).reduce((s, v) => s + (v || 0), 0);
    const prevTotal = dayTotal(today);
    const entries = openWeek.entries.map((d, i) => {
      if (i !== resolvedIdx) return d;
      return { ...d, apps: { ...localApps }, logged: dt > 0 ? true : localLogged, mileage: localMileage || d.mileage };
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
    onSave({ ...openWeek, entries });
    setOpen(false);
  }

  if (!today || todayIdx < 0) return null;

  const todayTotal = dayTotal(today);
  const now = new Date();
  const dayLabel = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const isClosed = !!today.dayClosed;

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
            <SheetTitle className="text-left">{dayLabel}</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 mt-4">
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
                  value={localMileage || ""}
                  onChange={(e) => setLocalMileage(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
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