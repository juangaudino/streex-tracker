import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "./pages/NotFound.tsx";
import AppShell from "./pages/AppShell";
import DashboardPage from "./pages/DashboardPage";
import WeeklyEntryPage from "./pages/WeeklyEntryPage";
import ComparisonsPage from "./pages/ComparisonsPage";
import HistoryPage from "./pages/HistoryPage";
import SettingsPage from "./pages/SettingsPage";
import AchievementsPage from "./pages/AchievementsPage";
import CareerPage from "./pages/CareerPage";
import JourneyPage from "./pages/JourneyPage";
import MonthlyRecapPage from "./pages/MonthlyRecapPage";
import LettersPage from "./pages/LettersPage";
import AuthPage from "./pages/AuthPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import { useAuth } from "./hooks/useAuth";
import { useWeekStore } from "./hooks/useWeekStore";
import { ThemeProvider } from "./contexts/ThemeContext";
import streexLogo from "./assets/streex-logo.png";

const App = () => {
  const { user, loading: authLoading, signIn, signUp, signOut } = useAuth();
  const store = useWeekStore(user);

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-6 px-6">
        <img
          src={streexLogo}
          alt="Streex"
          className="w-44 sm:w-52 h-auto object-contain select-none animate-in fade-in duration-700"
          draggable={false}
        />
        <p className="text-xs sm:text-sm uppercase tracking-[0.3em] text-muted-foreground/70 font-medium">
          Gig Earnings Tracker
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="*" element={<AuthPage signIn={signIn} signUp={signUp} />} />
          </Routes>
        </BrowserRouter>
      </>
    );
  }

  return (
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route element={<AppShell store={store} onSignOut={signOut} />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/entry" element={<WeeklyEntryPage />} />
              <Route path="/compare" element={<ComparisonsPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/achievements" element={<AchievementsPage />} />
              <Route path="/career" element={<CareerPage />} />
              <Route path="/journey" element={<JourneyPage />} />
              <Route path="/recap" element={<MonthlyRecapPage />} />
              <Route path="/letters" element={<LettersPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  );
};

export default App;
