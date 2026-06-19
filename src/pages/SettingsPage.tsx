import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { StoreContext } from "./types";
import { useToast } from "@/hooks/use-toast";
import { Activity, Download, FileJson, Gamepad2, KeyRound, Monitor, Moon, Palette, Phone, Plus, Route, Save, Sparkles, Sun, Table, User, X } from "lucide-react";
import { useTheme, ClassicVariant } from "@/contexts/ThemeContext";
import { supabase } from "@/integrations/supabase/client";
import { buildJsonBackup, downloadEarningsCsv, downloadJsonBackup } from "@/lib/dataExport";
import { formatCurrencyAmount, getCurrencyCode, getCurrencyConfig, SUPPORTED_CURRENCIES } from "@/lib/currency";
import { usePerformanceMode } from "@/hooks/usePerformanceMode";
import { useDashboardExperience } from "@/hooks/useDashboardExperience";
import { useUserProfile } from "@/hooks/useUserProfile";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function SettingsPage() {
  const { user, weeks, settings, updateSettings } = useOutletContext<StoreContext>();
  const { toast } = useToast();
  const { mode, classicVariant, pulseMode, setMode, setClassicVariant, setPulseMode } = useTheme();
  const { performanceMode, setPerformanceMode } = usePerformanceMode();
  const { dashboardExperience, setDashboardExperience } = useDashboardExperience();
  const { profile, setProfile } = useUserProfile(user?.id);
  const [goal, setGoal] = useState(settings.defaultWeeklyGoal.toString());
  const [hoursGoal, setHoursGoal] = useState(settings.defaultWeeklyHoursGoal?.toString() || "");
  const [currencyCode, setCurrencyCode] = useState(getCurrencyCode(settings.currencySymbol));
  const [apps, setApps] = useState([...settings.activeApps]);
  const [newApp, setNewApp] = useState("");
  const [firstName, setFirstName] = useState(profile.firstName);
  const [phoneNumber, setPhoneNumber] = useState(profile.phoneNumber);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [exporting, setExporting] = useState<"json" | "csv" | null>(null);
  const selectedCurrency = getCurrencyConfig(currencyCode);

  useEffect(() => {
    setFirstName(profile.firstName);
    setPhoneNumber(profile.phoneNumber);
  }, [profile.firstName, profile.phoneNumber]);

  function handleSave() {
    updateSettings({
      defaultWeeklyGoal: Number(goal) || 0,
      defaultWeeklyHoursGoal: Number(hoursGoal) || 0,
      currencySymbol: currencyCode,
      activeApps: apps,
      octopusPoints: settings.octopusPoints,
      octopusUpdatedAt: settings.octopusUpdatedAt,
    });
    toast({ title: "Settings saved." });
  }

  function addApp() {
    const name = newApp.trim();
    if (!name || apps.includes(name)) return;
    setApps([...apps, name]);
    setNewApp("");
  }

  function handleProfileSave() {
    setProfile({ firstName, phoneNumber });
    toast({ title: "Profile saved." });
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();

    if (newPassword.length < 8) {
      toast({
        title: "Use at least 8 characters.",
        description: "A longer password is safer and works better with generated passwords.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords do not match.",
        description: "Confirm the same new password before saving.",
        variant: "destructive",
      });
      return;
    }

    try {
      setUpdatingPassword(true);
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "Password updated." });
    } catch (error) {
      toast({
        title: "Password update failed.",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setUpdatingPassword(false);
    }
  }

  async function handleJsonExport() {
    if (!user) return;

    try {
      setExporting("json");
      const { data, error } = await supabase
        .from("user_achievements")
        .select("*")
        .eq("user_id", user.id)
        .order("unlocked_at", { ascending: true });

      if (error) throw error;

      downloadJsonBackup(buildJsonBackup({
        user,
        weeks,
        settings,
        achievements: data ?? [],
      }));
      toast({ title: "Export ready." });
    } catch {
      toast({
        title: "Export failed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setExporting(null);
    }
  }

  function handleCsvExport() {
    try {
      setExporting("csv");
      downloadEarningsCsv(weeks);
      toast({ title: "Export ready." });
    } catch {
      toast({
        title: "Export failed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Profile
            </label>
            <p className="text-xs text-muted-foreground">
              Optional. Used for greetings and daily start context only.
            </p>
          </div>
          <div className="space-y-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">First Name</label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Juan"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" />
                Phone Number
              </label>
              <Input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <Button type="button" size="sm" onClick={handleProfileSave}>
              <Save className="h-4 w-4 mr-1" />
              Save Profile
            </Button>
          </div>
        </div>

        <form onSubmit={handlePasswordChange} className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" />
              Account Security
            </label>
            <p className="text-xs text-muted-foreground">
              Change your password while signed in. Works well with strong passwords generated by iOS.
            </p>
          </div>
          <div className="space-y-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">New Password</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Use a strong password"
                autoComplete="new-password"
                minLength={8}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Confirm Password</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                autoComplete="new-password"
                minLength={8}
              />
            </div>
            <Button
              type="submit"
              size="sm"
              disabled={updatingPassword || !newPassword || !confirmPassword}
            >
              <KeyRound className="h-4 w-4 mr-1" />
              {updatingPassword ? "Updating..." : "Update Password"}
            </Button>
          </div>
        </form>

        {/* Theme */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Theme
          </label>
          <button
            type="button"
            onClick={() => setMode("signature")}
            className={`relative w-full overflow-hidden rounded-xl border px-4 py-3 text-left transition ${
              mode === "signature"
                ? "border-[hsl(50_92%_52%/0.6)] bg-gradient-to-br from-[#0B0B0B] via-[#101010] to-[#0B0B0B] shadow-[0_0_0_1px_hsl(50_92%_52%/0.25),0_18px_40px_-12px_hsl(50_92%_52%/0.25)]"
                : "border-border bg-card hover:border-[hsl(50_92%_52%/0.4)]"
            }`}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 -left-1/3 w-2/3 bg-gradient-to-r from-transparent via-[hsl(50_92%_52%/0.08)] to-transparent"
            />
            <div className="relative flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[hsl(50_92%_55%)]" />
                  <span className="text-sm font-semibold tracking-wide text-foreground">
                    Signature
                  </span>
                  <span className="rounded-full border border-[hsl(50_92%_52%/0.4)] bg-[hsl(50_92%_52%/0.08)] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[hsl(50_92%_60%)]">
                    Flagship
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  The official STREEX experience.
                </p>
              </div>
            </div>
          </button>
          {/* Velocity theme intentionally hidden — kept in code (ThemeContext + index.css) for future reactivation. */}
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant={mode === "classic" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("classic")}
              className="w-full"
            >
              Classic
            </Button>
            <Button
              variant={mode === "rpg" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("rpg")}
              className="w-full"
            >
              <Gamepad2 className="h-4 w-4 mr-1" />
              RPG
            </Button>
            <Button
              variant={mode === "night-drive" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("night-drive")}
              className="w-full"
            >
              <Route className="h-4 w-4 mr-1" />
              Night
            </Button>
          </div>
          {mode === "classic" && (
            <div className="flex gap-2">
              {([
                { v: "system" as ClassicVariant, icon: Monitor, label: "System" },
                { v: "light" as ClassicVariant, icon: Sun, label: "Light" },
                { v: "dark" as ClassicVariant, icon: Moon, label: "Dark" },
              ] as const).map(({ v, icon: Icon, label }) => (
                <Button
                  key={v}
                  variant={classicVariant === v ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setClassicVariant(v)}
                  className="flex-1"
                >
                  <Icon className="h-3.5 w-3.5 mr-1" />
                  {label}
                </Button>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-3">
            <div className="min-w-0 pr-3">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Pulse Mode
              </label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Let Streex subtly react to your current momentum.
              </p>
            </div>
            <Switch checked={pulseMode} onCheckedChange={setPulseMode} />
          </div>
          <div className="rounded-xl border border-border bg-card p-3 space-y-2">
            <div className="min-w-0">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Dashboard Experience
              </label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Standard keeps the full dashboard. Full Focus turns Dashboard into operational mode.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                size="sm"
                variant={dashboardExperience === "standard" ? "default" : "outline"}
                onClick={() => setDashboardExperience("standard")}
              >
                Standard
              </Button>
              <Button
                type="button"
                size="sm"
                variant={dashboardExperience === "full-focus" ? "default" : "outline"}
                onClick={() => setDashboardExperience("full-focus")}
              >
                Full Focus
              </Button>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 space-y-2">
            <div className="min-w-0">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Performance Mode
              </label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Simple keeps insights calm. Advanced unlocks hour-level patterns.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                size="sm"
                variant={performanceMode === "simple" ? "default" : "outline"}
                onClick={() => setPerformanceMode("simple")}
              >
                Simple
              </Button>
              <Button
                type="button"
                size="sm"
                variant={performanceMode === "advanced" ? "default" : "outline"}
                onClick={() => setPerformanceMode("advanced")}
              >
                Advanced
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">
            Default Weekly Goal
          </label>
          <Input
            type="number"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className="font-mono"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">
            Default Weekly Hours Goal
          </label>
          <Input
            type="number"
            min="0"
            step="0.5"
            value={hoursGoal}
            placeholder="Optional"
            onChange={(e) => setHoursGoal(e.target.value)}
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground">
            Optional. Hours measure commitment; earnings still measure outcome.
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">
            Currency
          </label>
          <Select value={currencyCode} onValueChange={(value) => setCurrencyCode(getCurrencyCode(value))}>
            <SelectTrigger>
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_CURRENCIES.map((currency) => (
                <SelectItem key={currency.code} value={currency.code}>
                  {currency.code} · {currency.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Display only. Streex does not convert historical earnings or change stored amounts.
            Current format: {formatCurrencyAmount(selectedCurrency.fractionDigits === 0 ? 1500000 : 1500, selectedCurrency.code)}
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">
            Week Starts On
          </label>
          <Input value="Monday" disabled className="text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            Fixed to Monday for V1.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Active Apps
          </label>
          <div className="flex flex-wrap gap-2">
            {apps.map((app) => (
              <span
                key={app}
                className="inline-flex items-center gap-1 bg-secondary text-secondary-foreground px-3 py-1.5 rounded-lg text-sm"
              >
                {app}
                <button
                  onClick={() => setApps(apps.filter((a) => a !== app))}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Add custom app..."
              value={newApp}
              onChange={(e) => setNewApp(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addApp()}
              className="flex-1"
            />
            <Button variant="secondary" onClick={addApp}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-border bg-card p-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export My Data
            </label>
            <p className="text-sm text-muted-foreground">
              Download a copy of your Streex data for backup or analysis.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={handleJsonExport}
              disabled={exporting !== null}
              className="h-auto min-h-10 justify-start whitespace-normal text-left"
            >
              <FileJson className="h-4 w-4 mr-2" />
              {exporting === "json" ? "Preparing..." : "Download JSON Backup"}
            </Button>
            <Button
              variant="outline"
              onClick={handleCsvExport}
              disabled={exporting !== null}
              className="h-auto min-h-10 justify-start whitespace-normal text-left"
            >
              <Table className="h-4 w-4 mr-2" />
              {exporting === "csv" ? "Preparing..." : "Download CSV Export"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Your export is generated from your Streex data. Keep it somewhere safe.
          </p>
        </div>
      </div>

      <Button onClick={handleSave}>
        <Save className="h-4 w-4 mr-1" /> Save Settings
      </Button>
    </div>
  );
}
