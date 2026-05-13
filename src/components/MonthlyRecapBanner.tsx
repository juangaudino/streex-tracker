import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { WeekRecord } from "@/lib/types";
import { listMonthsWithData, getMonthSummary, shouldShowFreshChapter } from "@/lib/monthly";
import { formatCurrency } from "@/lib/store";
import { Sparkles, X, ArrowRight } from "lucide-react";

interface Props {
  weeks: WeekRecord[];
  currencySymbol: string;
}

/**
 * Soft, dismissable banner shown at the top of the dashboard right after
 * a calendar month transition — invites the user to see the previous
 * month recap. Uses localStorage to persist dismissal per month key.
 */
export default function MonthlyRecapBanner({ weeks, currencySymbol }: Props) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);
  const fresh = shouldShowFreshChapter(weeks);

  const lastMonthKey = fresh.show && fresh.lastMonth
    ? `${fresh.lastMonth.year}-${String(fresh.lastMonth.month + 1).padStart(2, "0")}`
    : null;

  useEffect(() => {
    if (!lastMonthKey) return;
    const dis = localStorage.getItem(`streex_recap_dismissed_${lastMonthKey}`);
    if (dis) setDismissed(true);
  }, [lastMonthKey]);

  if (!fresh.show || !fresh.lastMonth || !lastMonthKey) return null;
  if (dismissed) return null;
  // Make sure that month actually exists in data
  const months = listMonthsWithData(weeks);
  if (!months.includes(lastMonthKey)) return null;

  const s = getMonthSummary(weeks, fresh.lastMonth.year, fresh.lastMonth.month);
  if (s.totalEarned <= 0) return null;

  function handleDismiss(e: React.MouseEvent) {
    e.stopPropagation();
    localStorage.setItem(`streex_recap_dismissed_${lastMonthKey}`, "1");
    setDismissed(true);
  }

  return (
    <button
      onClick={() => navigate(`/recap?m=${lastMonthKey}`)}
      className="w-full bg-gradient-to-r from-primary/10 via-card to-gold/10 border border-primary/20 rounded-xl px-4 py-3 flex items-center gap-3 text-left hover:border-primary/40 transition-colors group"
    >
      <div className="h-9 w-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
        <Sparkles className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">
          Your {s.monthName} recap is ready
        </p>
        <p className="text-[11px] text-muted-foreground font-mono truncate">
          {formatCurrency(s.totalEarned, currencySymbol)} · {s.daysWorked} days · {s.longestStreak}d streak
        </p>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
      <span
        role="button"
        onClick={handleDismiss}
        className="ml-1 p-1 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-accent transition-colors shrink-0"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </span>
    </button>
  );
}