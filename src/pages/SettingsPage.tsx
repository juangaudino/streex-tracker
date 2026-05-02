import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEFAULT_APPS } from "@/lib/types";
import type { StoreContext } from "./types";
import { useToast } from "@/hooks/use-toast";
import { Save, Plus, X } from "lucide-react";

export default function SettingsPage() {
  const { settings, updateSettings } = useOutletContext<StoreContext>();
  const { toast } = useToast();
  const [goal, setGoal] = useState(settings.defaultWeeklyGoal.toString());
  const [symbol, setSymbol] = useState(settings.currencySymbol);
  const [apps, setApps] = useState([...settings.activeApps]);
  const [newApp, setNewApp] = useState("");

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

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <div className="space-y-4">
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
      </div>

      <Button onClick={handleSave}>
        <Save className="h-4 w-4 mr-1" /> Save Settings
      </Button>
    </div>
  );
}