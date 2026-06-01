import { CalendarDays, LayoutDashboard, Play, Settings, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { dayTotal, formatCurrency } from "@/lib/store";
import { profileCompleteness, type UserProfile } from "@/lib/userProfile";
import type { DayEntry } from "@/lib/types";
import { cn } from "@/lib/utils";

interface DailyStartHubProps {
  open: boolean;
  profile: UserProfile;
  today: DayEntry;
  todayAverage: number;
  currencySymbol: string;
  onStartShift: () => void;
  onDashboard: () => void;
  onWeeklySetup: () => void;
  onProfile: () => void;
}

function ActionCard({
  title,
  copy,
  icon,
  primary,
  onClick,
}: {
  title: string;
  copy: string;
  icon: React.ReactNode;
  primary?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border p-3 text-left transition-colors",
        primary
          ? "border-primary/35 bg-primary/10 hover:bg-primary/15"
          : "border-border bg-card/80 hover:bg-accent",
      )}
    >
      <div className="flex items-center gap-2">
        <span className={cn("shrink-0", primary ? "text-primary" : "text-muted-foreground")}>{icon}</span>
        <p className="text-sm font-semibold">{title}</p>
      </div>
      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{copy}</p>
    </button>
  );
}

export default function DailyStartHub({
  open,
  profile,
  today,
  todayAverage,
  currencySymbol,
  onStartShift,
  onDashboard,
  onWeeklySetup,
  onProfile,
}: DailyStartHubProps) {
  const firstName = profile.firstName.trim();
  const todayTotal = dayTotal(today);
  const completion = profileCompleteness(profile);
  const dateLabel = new Date(`${today.date}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <Dialog open={open}>
      <DialogContent
        className="max-w-[calc(100vw-2rem)] sm:max-w-lg rounded-2xl p-0 overflow-hidden"
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        <div className="bg-card">
          <div className="border-b border-border px-5 py-4">
            <DialogHeader className="space-y-1 text-left">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary">
                Daily Start Hub
              </p>
              <DialogTitle className="text-2xl">
                {firstName ? `Hi, ${firstName}` : "Welcome back"}
              </DialogTitle>
              <DialogDescription>{dateLabel}</DialogDescription>
            </DialogHeader>
          </div>

          <div className="space-y-4 px-5 py-4">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-border bg-background/60 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Today</p>
                <p className="mt-1 text-sm font-bold font-mono">{formatCurrency(todayTotal, currencySymbol)}</p>
              </div>
              <div className="rounded-xl border border-border bg-background/60 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Average</p>
                <p className="mt-1 text-sm font-bold font-mono">
                  {todayAverage > 0 ? formatCurrency(todayAverage, currencySymbol) : "—"}
                </p>
              </div>
              <div className="rounded-xl border border-primary/25 bg-primary/5 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Shift</p>
                <p className="mt-1 text-sm font-bold text-primary">Not started</p>
              </div>
            </div>

            <p className="rounded-xl border border-border bg-background/60 px-3 py-2 text-sm text-muted-foreground">
              Start clean. Track the work, keep the day yours.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <ActionCard
                primary
                title="Start Shift"
                copy="Begin today’s active work block."
                icon={<Play className="h-4 w-4" />}
                onClick={onStartShift}
              />
              <ActionCard
                title="Go to Dashboard"
                copy="Skip the hub for this session."
                icon={<LayoutDashboard className="h-4 w-4" />}
                onClick={onDashboard}
              />
              <ActionCard
                title="Edit Week"
                copy="Review goals or weekly setup."
                icon={<CalendarDays className="h-4 w-4" />}
                onClick={onWeeklySetup}
              />
              <ActionCard
                title="Profile / Info"
                copy={completion === 2 ? "Profile basics complete." : "Add name, phone, and preferences."}
                icon={completion === 2 ? <User className="h-4 w-4" /> : <Settings className="h-4 w-4" />}
                onClick={onProfile}
              />
            </div>

            <Button variant="ghost" className="w-full" onClick={onDashboard}>
              Not now
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
