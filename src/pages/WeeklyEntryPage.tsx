import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createWeek,
  getMondayOfWeek,
  formatCurrency,
  dayTotal,
  weekTotal,
  appTotal,
} from "@/lib/store";
import type { StoreContext } from "./types";
import { CalendarPlus, Save, Lock, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function WeeklyEntryPage() {
  const { openWeek, settings, addWeek, updateWeek } =
    useOutletContext<StoreContext>();
  const { toast } = useToast();
  const [editWeek, setEditWeek] = useState(openWeek);
  const [goalInput, setGoalInput] = useState(
    openWeek?.weeklyGoal?.toString() || settings.defaultWeeklyGoal.toString()
  );

  // Sync when openWeek changes externally
  if (openWeek && (!editWeek || editWeek.id !== openWeek.id)) {
    setEditWeek(openWeek);
    setGoalInput(openWeek.weeklyGoal.toString());
  }

  const sym = settings.currencySymbol;
  const apps = settings.activeApps;

  function handleStartNew() {
    if (openWeek) {
      if (
        !confirm(
          "You have an open week. Save and close it before starting a new one?"
        )
      )
        return;
      updateWeek({ ...openWeek, status: "closed" });
    }
    const w = createWeek(
      getMondayOfWeek(),
      Number(goalInput) || settings.defaultWeeklyGoal,
      apps
    );
    addWeek(w);
    setEditWeek(w);
    toast({ title: "New week started!" });
  }

  function handleSave() {
    if (!editWeek) return;
    updateWeek({ ...editWeek, weeklyGoal: Number(goalInput) || 0 });
    toast({ title: "Week saved." });
  }

  function handleClose() {
    if (!editWeek) return;
    if (!confirm("Close this week? You can still edit it later from History."))
      return;
    const closed = { ...editWeek, status: "closed" as const, weeklyGoal: Number(goalInput) || 0 };
    updateWeek(closed);
    setEditWeek(null);
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
    const entries = editWeek.entries.map((d, i) => {
      if (i !== dayIdx) return d;
      return { ...d, apps: { ...d.apps, [app]: parseFloat(val) || 0 } };
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
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Goal:</span>
          <Input
            type="number"
            className="w-28 font-mono"
            value={goalInput}
            onChange={(e) => setGoalInput(e.target.value)}
          />
        </div>
        <Button size="lg" onClick={handleStartNew}>
          <CalendarPlus className="h-5 w-5 mr-2" />
          Start New Week
        </Button>
      </div>
    );
  }

  const wt = weekTotal(editWeek);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Weekly Entry</h1>
          <p className="text-sm text-muted-foreground">
            {editWeek.startDate} → {editWeek.endDate}
          </p>
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

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-secondary/50">
              <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground sticky left-0 bg-secondary/50 z-10 min-w-[90px]">
                Day
              </th>
              {apps.map((app) => (
                <th
                  key={app}
                  className="text-right px-2 py-2.5 font-semibold text-muted-foreground whitespace-nowrap min-w-[80px]"
                >
                  {app}
                </th>
              ))}
              <th className="text-right px-3 py-2.5 font-bold text-foreground min-w-[90px]">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {editWeek.entries.map((day, dayIdx) => {
              const dt = dayTotal(day);
              return (
                <tr key={day.dayName} className="border-t border-border hover:bg-accent/30">
                  <td className="px-3 py-2 font-medium sticky left-0 bg-card z-10">
                    <div>{day.dayName.slice(0, 3)}</div>
                    <div className="text-[10px] text-muted-foreground">{day.date}</div>
                  </td>
                  {apps.map((app) => (
                    <td key={app} className="px-1 py-1">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        className="w-full text-right font-mono text-sm h-8 bg-transparent border-border/50"
                        value={day.apps[app] || ""}
                        placeholder="0"
                        onChange={(e) =>
                          handleCellChange(dayIdx, app, e.target.value)
                        }
                      />
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right font-mono font-bold">
                    {formatCurrency(dt, sym)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border bg-secondary/30">
              <td className="px-3 py-2.5 font-bold sticky left-0 bg-secondary/30 z-10">
                Total
              </td>
              {apps.map((app) => (
                <td key={app} className="px-2 py-2.5 text-right font-mono font-semibold">
                  {formatCurrency(appTotal(editWeek, app), sym)}
                </td>
              ))}
              <td className="px-3 py-2.5 text-right font-mono font-bold text-primary text-base">
                {formatCurrency(wt, sym)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-1" /> Save
        </Button>
        <Button variant="secondary" onClick={handleClose}>
          <Lock className="h-4 w-4 mr-1" /> Close Week
        </Button>
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