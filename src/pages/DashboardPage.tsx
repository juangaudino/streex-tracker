import { useOutletContext } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import StatCard from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import {
  weekTotal,
  bestDay,
  bestApp,
  formatCurrency,
  getPreviousWeek,
  getRecordWeek,
  getActiveEnteredDays,
  samePointTotal,
} from "@/lib/store";
import type { StoreContext } from "./types";
import { CalendarPlus } from "lucide-react";

function progressLabel(pct: number) {
  if (pct >= 120) return { text: "Beast Mode 🔥", variant: "purple" as const };
  if (pct >= 100) return { text: "Goal Reached ✅", variant: "success" as const };
  if (pct >= 75) return { text: "On Track 💪", variant: "primary" as const };
  if (pct >= 40) return { text: "Building Momentum ⚡", variant: "warning" as const };
  return { text: "Behind Pace — Keep Pushing", variant: "default" as const };
}

export default function DashboardPage() {
  const { openWeek, weeks, settings } = useOutletContext<StoreContext>();
  const navigate = useNavigate();
  const sym = settings.currencySymbol;

  if (!openWeek) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4 text-center">
        <h2 className="text-2xl font-bold">Start your first week</h2>
        <p className="text-muted-foreground max-w-md">
          Begin tracking your gig earnings. Create a new week to get started.
        </p>
        <Button size="lg" onClick={() => navigate("/entry")}>
          <CalendarPlus className="h-5 w-5 mr-2" />
          Start New Week
        </Button>
      </div>
    );
  }

  const total = weekTotal(openWeek);
  const goal = openWeek.weeklyGoal;
  const pct = goal > 0 ? (total / goal) * 100 : 0;
  const remaining = Math.max(0, goal - total);
  const bd = bestDay(openWeek);
  const ba = bestApp(openWeek);
  const prev = getPreviousWeek(weeks, openWeek);
  const record = getRecordWeek(weeks, openWeek);
  const activeDays = getActiveEnteredDays(openWeek);
  const prevSP = prev ? samePointTotal(prev, activeDays) : 0;
  const recSP = record ? samePointTotal(record, activeDays) : 0;
  const { text: statusText, variant: statusVariant } = progressLabel(pct);

  const barColor =
    pct >= 120
      ? "bg-beast-purple"
      : pct >= 100
      ? "bg-success"
      : pct >= 75
      ? "bg-primary"
      : pct >= 40
      ? "bg-warning"
      : "bg-muted-foreground";

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {openWeek.startDate} → {openWeek.endDate}
          </p>
        </div>
        <span
          className={`text-xs font-bold px-3 py-1.5 rounded-full ${
            statusVariant === "purple"
              ? "bg-beast-purple/15 text-beast-purple"
              : statusVariant === "success"
              ? "bg-success/15 text-success"
              : statusVariant === "primary"
              ? "bg-primary/15 text-primary"
              : statusVariant === "warning"
              ? "bg-warning/15 text-warning"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {statusText}
        </span>
      </div>

      {/* Progress bar */}
      <div className="bg-card rounded-xl border border-border p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Progress to Goal</span>
          <span className="font-mono font-bold">{pct.toFixed(1)}%</span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Week Total" value={formatCurrency(total, sym)} variant="primary" />
        <StatCard label="Weekly Goal" value={formatCurrency(goal, sym)} />
        <StatCard label="Remaining" value={formatCurrency(remaining, sym)} variant={remaining === 0 ? "success" : "default"} />
        <StatCard
          label="vs Previous"
          value={prev ? formatCurrency(total - prevSP, sym) : "—"}
          variant={total - prevSP > 0 ? "success" : total - prevSP < 0 ? "warning" : "default"}
          sub={prev ? `Same-point (${activeDays.length} days)` : "No previous week"}
        />
        <StatCard
          label="vs Record"
          value={record ? formatCurrency(total - recSP, sym) : "—"}
          variant={total - recSP > 0 ? "gold" : total - recSP < 0 ? "warning" : "default"}
          sub={record ? `Same-point (${activeDays.length} days)` : "No record yet"}
        />
        <StatCard label="Best Day" value={bd.total > 0 ? formatCurrency(bd.total, sym) : "—"} sub={bd.dayName} />
        <StatCard label="Best App" value={ba.total > 0 ? formatCurrency(ba.total, sym) : "—"} sub={ba.app} />
        <StatCard label="Days Entered" value={`${activeDays.length}/7`} />
      </div>
    </div>
  );
}