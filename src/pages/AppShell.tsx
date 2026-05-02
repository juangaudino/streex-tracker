import { NavLink, Outlet } from "react-router-dom";
import { useWeekStore } from "@/hooks/useWeekStore";
import {
  LayoutDashboard,
  CalendarDays,
  BarChart3,
  History,
  Settings,
} from "lucide-react";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/entry", icon: CalendarDays, label: "Entry" },
  { to: "/compare", icon: BarChart3, label: "Compare" },
  { to: "/history", icon: History, label: "History" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export default function AppShell() {
  const store = useWeekStore();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border px-4 py-3 flex items-center gap-3">
        <span className="text-xl font-bold tracking-tight text-primary">Streex</span>
        <span className="text-sm text-muted-foreground hidden sm:inline">Earnings Tracker</span>
        <nav className="hidden md:flex ml-auto gap-1">
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
      </header>
      <main className="flex-1 overflow-y-auto pb-20 md:pb-6">
        <Outlet context={store} />
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