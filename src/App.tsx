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
import AssistantPage from "./pages/AssistantPage";
import DeepInsightsPage from "./pages/DeepInsightsPage";
import AdminPage from "./pages/AdminPage";
import AuthPage from "./pages/AuthPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import LegalPage from "./pages/LegalPage";
import { useAuth } from "./hooks/useAuth";
import { useAppRuntime } from "./hooks/useAppRuntime";
import { useWeekStore } from "./hooks/useWeekStore";
import { ThemeProvider } from "./contexts/ThemeContext";
import StreexLogo from "./components/StreexLogo";
import AppUpdateNotice from "./components/AppUpdateNotice";
import { Button } from "./components/ui/button";
import { useAppLifecycle } from "./hooks/useAppLifecycle";
import { lifecycleDebug } from "./lib/appLifecycle";
import { AnimatedStreexLogo, StreexMotionBackground } from "./components/StreexMotionBrand";

const App = () => {
  useAppLifecycle();
  const { user, session, loading: authLoading, signIn, signUp, signOut } = useAuth();
  const store = useWeekStore(user);
  const { access, updateNotice, dismissUpdateNotice } = useAppRuntime(user, session, signOut);

  if (authLoading) {
    lifecycleDebug("splash shown", { reason: "auth session restoration" });
    return (
      <div className="streex-premium-shell min-h-screen flex flex-col items-center justify-center gap-7 px-6 text-center">
        <StreexMotionBackground density="splash" />
        <AnimatedStreexLogo variant="splash" />
        <p className="relative z-10 text-[11px] sm:text-xs uppercase tracking-[0.34em] text-white/50 font-semibold">
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
            <Route path="/privacy" element={<LegalPage type="privacy" />} />
            <Route path="/terms" element={<LegalPage type="terms" />} />
            <Route path="*" element={<AuthPage signIn={signIn} signUp={signUp} />} />
          </Routes>
        </BrowserRouter>
      </>
    );
  }

  if (access.loading) {
    lifecycleDebug("splash shown", { reason: "initial account access validation", userId: user.id });
    return (
      <div className="streex-premium-shell min-h-screen flex flex-col items-center justify-center gap-7 px-6 text-center">
        <StreexMotionBackground density="splash" />
        <AnimatedStreexLogo variant="splash" />
        <p className="relative z-10 text-[11px] sm:text-xs uppercase tracking-[0.34em] text-white/50 font-semibold">
          Preparing Streex
        </p>
      </div>
    );
  }

  if (access.status !== "active") {
    return (
      <ThemeProvider>
        <div className="min-h-screen flex items-center justify-center bg-background px-5">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4 text-center">
            <StreexLogo className="h-10 mx-auto" />
            <div className="space-y-2">
              <h1 className="text-xl font-bold">Account restricted</h1>
              <p className="text-sm text-muted-foreground">
                Your account is currently restricted. Please contact support.
              </p>
            </div>
            <Button type="button" onClick={signOut} className="w-full">
              Sign Out
            </Button>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {updateNotice && (
          <AppUpdateNotice
            latestVersion={updateNotice.latestVersion}
            message={updateNotice.message}
            required={updateNotice.required}
            onLater={dismissUpdateNotice}
            onSignOut={signOut}
          />
        )}
        <BrowserRouter>
          <Routes>
            <Route element={<AppShell store={store} user={user} onSignOut={signOut} />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/entry" element={<WeeklyEntryPage />} />
              <Route path="/compare" element={<ComparisonsPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/achievements" element={<AchievementsPage />} />
              <Route path="/career" element={<CareerPage />} />
              <Route path="/journey" element={<JourneyPage />} />
              <Route path="/recap" element={<MonthlyRecapPage />} />
              <Route path="/letters" element={<LettersPage />} />
              <Route path="/assistant" element={<AssistantPage />} />
              <Route path="/deep-insights" element={<DeepInsightsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/admin" element={<AdminPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  );
};

export default App;
