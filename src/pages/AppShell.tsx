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
  Square,
  MessageSquare,
} from "lucide-react";
import { useState } from "react";
import { NavLink as RouterNavLink } from "react-router-dom";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { StoreContext } from "./types";
import ChangelogDialog from "@/components/ChangelogDialog";
import streexLogo from "@/assets/streex-logo.png";
import { useDashboardExperience } from "@/hooks/useDashboardExperience";
import { cn } from "@/lib/utils";
import { createShift, endActiveShift, hasActiveShift } from "@/lib/shiftIntelligence";
import { formatDate } from "@/lib/store";
import FeedbackDialog from "@/components/FeedbackDialog";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/entry", icon: CalendarDays, label: "Entry" },
  { to: "/career", icon: Crown, label: "Career" },
  { to: "/assistant", icon: FlaskConical, label: "Ask AI" },
];

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
      return hasActiveGlobalShift
        ? endActiveShift(day)
        : { ...day, shifts: [...(day.shifts ?? []), createShift(day.date)] };
    });
    await store.updateWeek({ ...openWeek, entries });
  }

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden">
      <AchievementToastContainer />
      <CelebrationContainer />
      <header className={cn(
        "border-b border-border px-4 flex items-center gap-3 transition-all",
        fullFocusShell ? "py-1" : "py-1.5",
      )}>
        <img
          src={streexLogo}
          alt="Streex"
          className={cn(
            "w-auto object-contain select-none transition-all",
            fullFocusShell ? "h-10 sm:h-14 md:h-16 -my-1" : "h-12 sm:h-20 md:h-24 -my-1 sm:-my-2",
          )}
          draggable={false}
        />
        <span className={cn(
          "text-sm text-muted-foreground hidden sm:inline transition-opacity",
          fullFocusShell && "opacity-60",
        )}>Earnings Tracker</span>
        {/* Right side: Progress hub + Profile hub (always visible) + desktop nav inline */}
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
        <div className="ml-auto md:ml-2 flex items-center gap-1">
          <button
            type="button"
            onClick={handleShiftToggle}
            disabled={!canUseShiftControl}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors disabled:opacity-45 disabled:pointer-events-none",
              hasActiveGlobalShift
                ? "border-success/35 bg-success/10 text-success shadow-sm"
                : "border-primary/25 bg-primary/5 text-primary hover:bg-primary/10",
            )}
            aria-label={hasActiveGlobalShift ? "End active shift" : "Start shift"}
            title={!openWeek ? "Start a week before starting a shift" : currentDayIdx < 0 && !hasActiveGlobalShift ? "Today is outside the open week" : undefined}
          >
            {hasActiveGlobalShift ? <Square className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            <span className="hidden min-[420px]:inline">{hasActiveGlobalShift ? "End Shift" : "Start Shift"}</span>
            <span className="min-[420px]:hidden">{hasActiveGlobalShift ? "End" : "Start"}</span>
          </button>
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
          {/* Progress Hub */}
          <div className="relative">
            <button
              onClick={() => { setProgressMenu((v) => !v); setMobileMenu(false); }}
              className="inline-flex p-1.5 sm:p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label="Progress"
            >
              <Medal className="h-5 w-5" />
            </button>
            {progressMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setProgressMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-xl shadow-lg p-3 min-w-[200px] space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 px-1 pb-1">Progress</p>
                  <RouterNavLink
                    to="/journey"
                    onClick={() => setProgressMenu(false)}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-accent transition-colors"
                  >
                    <Map className="h-4 w-4" /> Journey
                  </RouterNavLink>
                  <RouterNavLink
                    to="/recap"
                    onClick={() => setProgressMenu(false)}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-accent transition-colors"
                  >
                    <CalendarRange className="h-4 w-4" /> Monthly Recap
                  </RouterNavLink>
                  <RouterNavLink
                    to="/letters"
                    onClick={() => setProgressMenu(false)}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-accent transition-colors"
                  >
                    <BookOpen className="h-4 w-4" /> Letters
                  </RouterNavLink>
                  <RouterNavLink
                    to="/achievements"
                    onClick={() => setProgressMenu(false)}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-accent transition-colors"
                  >
                    <Trophy className="h-4 w-4" /> Achievements
                  </RouterNavLink>
                  <RouterNavLink
                    to="/history"
                    onClick={() => setProgressMenu(false)}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-accent transition-colors"
                  >
                    <History className="h-4 w-4" /> History
                  </RouterNavLink>
                  <RouterNavLink
                    to="/compare"
                    onClick={() => setProgressMenu(false)}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-accent transition-colors"
                  >
                    <BarChart3 className="h-4 w-4" /> Compare
                  </RouterNavLink>
                </div>
              </>
            )}
          </div>

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
      </nav>
    </div>
  );
}
