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
import AuthPage from "./pages/AuthPage";
import { useAuth } from "./hooks/useAuth";
import { useWeekStore } from "./hooks/useWeekStore";

const App = () => {
  const { user, loading: authLoading, signIn, signUp, signOut } = useAuth();
  const store = useWeekStore(user);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <span className="text-primary text-xl font-bold animate-pulse">Streex</span>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Toaster />
        <Sonner />
        <AuthPage signIn={signIn} signUp={signUp} />
      </>
    );
  }

  return (
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
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  );
};

export default App;
