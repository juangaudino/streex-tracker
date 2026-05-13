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
  { to: "/history", icon: History, label: "History" },
  { to: "/achievements", icon: Trophy, label: "Achieve" },
];

interface AppShellProps {
  store: StoreContext;
  onSignOut: () => void;
}

export default function AppShell({ store, onSignOut }: AppShellProps) {  
  const { user } = useAuth();
  const [mobileMenu, setMobileMenu] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <AchievementToastContainer />
      <CelebrationContainer />
      <header className="border-b border-border px-4 py-2 flex items-center gap-3">
        <img
          src={streexLogo}
          alt="Streex"
          className="h-16 sm:h-20 md:h-24 w-auto object-contain select-none -my-2"
          draggable={false}
        />
        <span className="text-sm text-muted-foreground hidden sm:inline">Earnings Tracker</span>
        {/* Mobile user menu button */}
        <div className="md:hidden ml-auto relative">
          <button
            onClick={() => setMobileMenu((v) => !v)}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label="User menu"
          >
            <User className="h-5 w-5" />
          </button>
          {mobileMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMobileMenu(false)} />
              <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-xl shadow-lg p-3 min-w-[200px] space-y-2">
                {user?.email && (
                  <p className="text-xs text-muted-foreground truncate px-1">{user.email}</p>
                )}
                <RouterNavLink
                  to="/journey"
                  onClick={() => setMobileMenu(false)}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-accent transition-colors"
                >
                  <Map className="h-4 w-4" />
                  Journey
                </RouterNavLink>
                <RouterNavLink
                  to="/settings"
                  onClick={() => setMobileMenu(false)}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-accent transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </RouterNavLink>
                <button
                  onClick={() => { setMobileMenu(false); setChangelogOpen(true); }}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-accent transition-colors"
                >
                  <Sparkles className="h-4 w-4" />
                  What's New
                </button>
                <button
                  onClick={() => { setMobileMenu(false); onSignOut(); }}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
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
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`
            }
            aria-label="Settings"
          >
            <Settings className="h-4 w-4" />
            Settings
          </NavLink>
          <NavLink
            to="/journey"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`
            }
          >
            <Map className="h-4 w-4" />
            Journey
          </NavLink>
          <button
            onClick={() => setChangelogOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <Sparkles className="h-4 w-4" />
            What's New
          </button>
          <button
            onClick={onSignOut}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors ml-2"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </nav>
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