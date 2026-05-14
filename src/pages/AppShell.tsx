import { NavLink, Outlet } from "react-router-dom";
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
} from "lucide-react";
import { useState } from "react";
import { NavLink as RouterNavLink } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import type { StoreContext } from "./types";
import ChangelogDialog from "@/components/ChangelogDialog";
import streexLogo from "@/assets/streex-logo.png";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/entry", icon: CalendarDays, label: "Entry" },
  { to: "/career", icon: Crown, label: "Career" },
  { to: "/compare", icon: BarChart3, label: "Compare" },
];

interface AppShellProps {
  store: StoreContext;
  onSignOut: () => void;
}

export default function AppShell({ store, onSignOut }: AppShellProps) {  
  const { user } = useAuth();
  const [mobileMenu, setMobileMenu] = useState(false);
  const [progressMenu, setProgressMenu] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <AchievementToastContainer />
      <CelebrationContainer />
      <header className="border-b border-border px-4 py-2 flex items-center gap-3">
        <img
          src={streexLogo}
          alt="Streex"
          className="h-24 sm:h-28 md:h-32 w-auto object-contain select-none -my-4"
          draggable={false}
        />
        <span className="text-sm text-muted-foreground hidden sm:inline">Earnings Tracker</span>
        {/* Right side: Progress hub + Profile hub (always visible) + desktop nav inline */}
        <nav className="hidden md:flex ml-auto gap-1 items-center">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
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
          {/* Progress Hub */}
          <div className="relative">
            <button
              onClick={() => { setProgressMenu((v) => !v); setMobileMenu(false); }}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
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
                    to="/achievements"
                    onClick={() => setProgressMenu(false)}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-accent transition-colors"
                  >
                    <Trophy className="h-4 w-4" /> Achievements
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
                    to="/history"
                    onClick={() => setMobileMenu(false)}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-accent transition-colors"
                  >
                    <History className="h-4 w-4" /> History
                  </RouterNavLink>
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
              `flex-1 flex flex-col items-center py-2 text-[10px] font-medium transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`
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