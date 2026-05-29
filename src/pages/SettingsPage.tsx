import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { StoreContext } from "./types";
import { useToast } from "@/hooks/use-toast";
import { Download, FileJson, Gamepad2, Monitor, Moon, Palette, Plus, Save, Sun, Table, X } from "lucide-react";
import { useTheme, ClassicVariant } from "@/contexts/ThemeContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { buildJsonBackup, downloadEarningsCsv, downloadJsonBackup } from "@/lib/dataExport";

export default function SettingsPage() {
  const { weeks, settings, updateSettings } = useOutletContext<StoreContext>();
  const { toast } = useToast();
  const { user } = useAuth();
  const { mode, classicVariant, setMode, setClassicVariant } = useTheme();
  const [goal, setGoal] = useState(settings.defaultWeeklyGoal.toString());
  const [symbol, setSymbol] = useState(settings.currencySymbol);
  const [apps, setApps] = useState([...settings.activeApps]);
  const [newApp, setNewApp] = useState("");
  const [exporting, setExporting] = useState<"json" | "csv" | null>(null);

  function handleSave() {
    updateSettings({
      defaultWeeklyGoal: Number(goal) || 0,
      currencySymbol: symbol || "$",
      activeApps: apps,
    });
    toast({ title: "Settings saved." });
  }

  function addApp() {
    const name = newApp.trim();
    if (!name || apps.includes(name)) return;
    setApps([...apps, name]);
    setNewApp("");
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
        {/* Theme */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Theme
          </label>
          <div className="flex gap-2">
            <Button
              variant={mode === "classic" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("classic")}
              className="flex-1"
            >
              Classic
            </Button>
            <Button
              variant={mode === "rpg" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("rpg")}
              className="flex-1"
            >
              <Gamepad2 className="h-4 w-4 mr-1" />
              RPG
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
            Currency Symbol
          </label>
          <Input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="w-20"
          />
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
