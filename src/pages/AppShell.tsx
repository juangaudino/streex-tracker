import { NavLink, Outlet, useLocation } from "react-router-dom";
import { AchievementToastContainer } from "@/components/AchievementToast";
import { CelebrationContainer } from "@/components/RecordCelebration";
import {
  LayoutDashboard,
  CalendarDays,
  BarChart3,
  History,
  Settings,
  LogOut,
  Trophy,
  User,
  Crown,
  Sparkles,
  Map,
  CalendarRange,
  Medal,
  BookOpen,
  FlaskConical,
  Gauge,
  Play,
  Pause,
  Square,
  MessageSquare,
} from "lucide-react";
import { useState } from "react";
import { NavLink as RouterNavLink } from "react-router-dom";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { StoreContext } from "./types";
import ChangelogDialog from "@/components/ChangelogDialog";
import StreexLogo from "@/components/StreexLogo";
import { useDashboardExperience } from "@/hooks/useDashboardExperience";
import { cn } from "@/lib/utils";
import { createShift, endActiveShift, getActiveShift, hasActiveShift, isShiftPaused, pauseActiveShift, resumePausedShift } from "@/lib/shiftIntelligence";
import { formatDate } from "@/lib/store";
import FeedbackDialog from "@/components/FeedbackDialog";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/entry", icon: CalendarDays, label: "Entry" },
  { to: "/career", icon: Crown, label: "Career" },
  { to: "/assistant", icon: FlaskConical, label: "Ask AI" },
];

const progressItems = [
  { to: "/journey", icon: Map, label: "Journey" },
  { to: "/recap", icon: CalendarRange, label: "Monthly Recap" },
  { to: "/letters", icon: BookOpen, label: "Letters" },
  { to: "/achievements", icon: Trophy, label: "Achievements" },
  { to: "/history", icon: History, label: "History" },
  { to: "/compare", icon: BarChart3, label: "Compare" },
  { to: "/deep-insights", icon: BarChart3, label: "Deep Insights" },
];

const progressRoutes = new Set(progressItems.map((item) => item.to));

interface AppShellProps {
  store: StoreContext;
  user: SupabaseUser;
  onSignOut: () => void;
}

export default function AppShell({ store, user, onSignOut }: AppShellProps) {
  const { isFullFocus, setDashboardExperience } = useDashboardExperience();
  const location = useLocation();
  const [mobileMenu, setMobileMenu] = useState(false);
  const [progressMenu, setProgressMenu] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const onDashboard = location.pathname === "/";
  const fullFocusShell = onDashboard && isFullFocus;
  const openWeek = store.openWeek;
  const activeShiftDayIdx = openWeek?.entries.findIndex(hasActiveShift) ?? -1;
  const hasActiveGlobalShift = activeShiftDayIdx >= 0;
  const activeShift = hasActiveGlobalShift && openWeek ? getActiveShift(openWeek.entries[activeShiftDayIdx]) : null;
  const activeShiftPaused = activeShift ? isShiftPaused(activeShift) : false;
  const progressActive = progressRoutes.has(location.pathname);
  const currentLocalDate = formatDate(new Date());
  const currentDayIdx = openWeek?.entries.findIndex((day) => day.date === currentLocalDate) ?? -1;
  const canStartShift = Boolean(openWeek && currentDayIdx >= 0 && !hasActiveGlobalShift);
  const canUseShiftControl = Boolean(openWeek && (hasActiveGlobalShift || canStartShift));

  async function handleShiftToggle() {
    if (!openWeek || !canUseShiftControl) return;
    const targetIdx = hasActiveGlobalShift ? activeShiftDayIdx : currentDayIdx;
    if (targetIdx < 0) return;
    const entries = openWeek.entries.map((day, idx) => {
      if (idx !== targetIdx) return day;
      if (!hasActiveGlobalShift) return { ...day, shifts: [...(day.shifts ?? []), createShift(day.date)] };
      return activeShiftPaused ? resumePausedShift(day) : pauseActiveShift(day);
    });
    await store.updateWeek({ ...openWeek, entries });
  }

  async function handleEndShift() {
    if (!openWeek || !hasActiveGlobalShift || activeShiftDayIdx < 0) return;
    const entries = openWeek.entries.map((day, idx) => idx === activeShiftDayIdx ? endActiveShift(day) : day);
    await store.updateWeek({ ...openWeek, entries });
  }

  return (
    <div className="streex-app-shell flex flex-col overflow-hidden">
      <AchievementToastContainer />
      <CelebrationContainer />
      <header className={cn(
        "relative z-30 shrink-0 border-b border-border bg-background px-4 flex items-center gap-3 transition-all",
        fullFocusShell ? "py-1" : "py-1.5",
      )}>
        <StreexLogo
          className={cn(
            "transition-all",
            fullFocusShell ? "h-4 sm:h-5 md:h-6" : "h-5 sm:h-6 md:h-7",
          )}
        />
        <span className={cn(
          "text-sm text-muted-foreground hidden sm:inline transition-opacity",
          fullFocusShell && "opacity-60",
        )}>Earnings Tracker</span>
        {/* Right side: desktop nav inline + operation/profile controls */}
        <nav className="hidden md:flex ml-auto gap-1 items-center">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? fullFocusShell ? "bg-primary/10 text-primary px-2.5 py-1.5" : "bg-primary/10 text-primary px-3 py-2"
                    : fullFocusShell ? "text-muted-foreground/70 hover:text-foreground hover:bg-accent px-2.5 py-1.5" : "text-muted-foreground hover:text-foreground hover:bg-accent px-3 py-2"
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Hubs (always at the right, both mobile + desktop) */}
        <div className="ml-auto md:ml-2 flex min-w-0 items-center gap-1">
          <button
            type="button"
            onClick={handleShiftToggle}
            disabled={!canUseShiftControl}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors disabled:pointer-events-none disabled:opacity-45 sm:px-2.5",
              activeShiftPaused
                ? "border-success bg-success text-success-foreground shadow-[0_0_0_3px_hsl(var(--success)/0.14),0_10px_22px_hsl(var(--success)/0.18)] hover:bg-success/90"
                : hasActiveGlobalShift
                  ? "border-success/35 bg-success/10 text-success shadow-sm hover:bg-success/15"
                  : "border-primary/25 bg-primary/5 text-primary hover:bg-primary/10",
            )}
            aria-label={hasActiveGlobalShift ? (activeShiftPaused ? "Resume active shift" : "Pause active shift") : "Start shift"}
            title={!openWeek ? "Start a week before starting a shift" : currentDayIdx < 0 && !hasActiveGlobalShift ? "Today is outside the open week" : undefined}
          >
            {hasActiveGlobalShift ? activeShiftPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            <span className="md:hidden">{hasActiveGlobalShift ? activeShiftPaused ? "Resume" : "Pause" : "Start"}</span>
            <span className="hidden md:inline">{hasActiveGlobalShift ? activeShiftPaused ? "Resume Shift" : "Pause Shift" : "Start Shift"}</span>
          </button>
          {hasActiveGlobalShift && (
            <button
              type="button"
              onClick={handleEndShift}
              className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-success/35 bg-success/10 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-success shadow-sm transition-colors hover:bg-success/15 sm:px-2.5"
              aria-label="End active shift"
            >
              <Square className="h-3.5 w-3.5" />
              <span className="hidden min-[520px]:inline">End Shift</span>
              <span className="min-[520px]:hidden">End</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setDashboardExperience(isFullFocus ? "standard" : "full-focus")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors",
              isFullFocus
                ? "border-primary/35 bg-primary/10 text-primary shadow-sm"
                : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-accent",
            )}
            aria-label={isFullFocus ? "Switch to Standard dashboard" : "Switch to Full Focus dashboard"}
          >
            <Gauge className="h-3.5 w-3.5" />
            <span className="hidden min-[470px]:inline">{isFullFocus ? "Full Focus" : "Standard"}</span>
            <span className="min-[470px]:hidden">{isFullFocus ? "Focus" : "Std"}</span>
          </button>
          {/* Profile Hub */}
          <div className="relative">
            <button
              onClick={() => { setMobileMenu((v) => !v); setProgressMenu(false); }}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label="Account"
            >
              <User className="h-5 w-5" />
            </button>
            {mobileMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMobileMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-xl shadow-lg p-3 min-w-[220px] space-y-1">
                  {user?.email && (
                    <p className="text-xs text-muted-foreground truncate px-1 pb-1">{user.email}</p>
                  )}
                  <RouterNavLink
                    to="/settings"
                    onClick={() => setMobileMenu(false)}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-accent transition-colors"
                  >
                    <Settings className="h-4 w-4" /> Settings
                  </RouterNavLink>
                  <button
                    onClick={() => { setMobileMenu(false); setChangelogOpen(true); }}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-accent transition-colors"
                  >
                    <Sparkles className="h-4 w-4" /> What's New
                  </button>
                  <button
                    onClick={() => { setMobileMenu(false); setFeedbackOpen(true); }}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-accent transition-colors"
                  >
                    <MessageSquare className="h-4 w-4" /> Feedback
                  </button>
                  <button
                    onClick={() => { setMobileMenu(false); onSignOut(); }}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut className="h-4 w-4" /> Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>
      <ChangelogDialog open={changelogOpen} onOpenChange={setChangelogOpen} />
      <FeedbackDialog
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        userId={user?.id}
        userEmail={user?.email}
      />
      <main className="flex-1 overflow-y-auto pb-20 md:pb-6">
        <Outlet context={store as any} />
      </main>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border flex z-50">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center text-[10px] font-medium transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground"
              } ${fullFocusShell ? "py-1.5" : "py-2"}`
            }
          >
            <item.icon className="h-5 w-5 mb-0.5" />
            {item.label}
          </NavLink>
        ))}
        <button
          type="button"
          onClick={() => { setProgressMenu((v) => !v); setMobileMenu(false); }}
          className={cn(
            "flex-1 flex flex-col items-center text-[10px] font-medium transition-colors",
            progressActive ? "text-primary" : "text-muted-foreground",
            fullFocusShell ? "py-1.5" : "py-2",
          )}
          aria-label="Progress"
          aria-expanded={progressMenu}
        >
          <Medal className="h-5 w-5 mb-0.5" />
          Progress
        </button>
      </nav>
      {progressMenu && (
        <>
          <div className="fixed inset-0 z-40 bg-background/10 md:hidden" onClick={() => setProgressMenu(false)} />
          <div className="fixed bottom-16 left-3 right-3 z-50 rounded-2xl border border-border bg-card p-3 shadow-2xl md:hidden">
            <p className="px-1 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Progress</p>
            <div className="grid grid-cols-2 gap-1">
              {progressItems.map((item) => (
                <RouterNavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setProgressMenu(false)}
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                >
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                  {item.label}
                </RouterNavLink>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
