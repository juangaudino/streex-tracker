import { useOutletContext, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  weekTotal,
  bestDay,
  bestApp,
  formatCurrency,
  getRecordWeek,
  createWeek,
} from "@/lib/store";
import type { StoreContext } from "./types";
import { Eye, Pencil, Copy, Trash2, Trophy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function HistoryPage() {
  const { weeks, settings, deleteWeek, addWeek } =
    useOutletContext<StoreContext>();
  const { toast } = useToast();
  const navigate = useNavigate();
  const sym = settings.currencySymbol;

  const sorted = [...weeks].sort(
    (a, b) => b.startDate.localeCompare(a.startDate)
  );

  const record = weeks.length > 0
    ? weeks.reduce((best, w) => (weekTotal(w) > weekTotal(best) ? w : best))
    : null;

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
                    navigate(w.status === "open" ? "/entry" : `/entry?weekId=${w.id}`);
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
