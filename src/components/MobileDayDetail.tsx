import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { dayTotal, formatCurrency } from "@/lib/store";
import type { DayEntry } from "@/lib/types";
import { ArrowLeft, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface MobileDayDetailProps {
  day: DayEntry;
  dayIdx: number;
  apps: string[];
  currencySymbol: string;
  onBack: () => void;
  onUpdate: (dayIdx: number, app: string, val: string) => void;
  onLoggedToggle: (dayIdx: number, checked: boolean) => void;
  onMileageUpdate?: (dayIdx: number, val: number) => void;
  onSave: () => void;
}

export default function MobileDayDetail({
  day,
  dayIdx,
  apps,
  currencySymbol,
  onBack,
  onUpdate,
  onLoggedToggle,
  onMileageUpdate,
  onSave,
}: MobileDayDetailProps) {
  const dt = dayTotal(day);
  const isLogged = day.logged !== undefined ? day.logged : dt > 0;
  const [mileage, setMileage] = useState(day.mileage?.toString() || "");

  return (
    <div className="animate-in slide-in-from-right duration-200 space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-9 w-9 shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold">{day.dayName}</h2>
          <p className="text-sm text-muted-foreground font-mono">{day.date}</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold font-mono text-primary">{formatCurrency(dt, currencySymbol)}</p>
        </div>
      </div>

      {/* Logged toggle */}
      <div className="flex items-center justify-between bg-card rounded-xl border border-border p-4">
        <span className="text-sm font-medium">Day Logged</span>
        <Checkbox
          checked={isLogged}
          onCheckedChange={(checked) => onLoggedToggle(dayIdx, !!checked)}
          disabled={dt > 0}
        />
      </div>

      {/* App inputs */}
      <div className="space-y-3">
        {apps.map((app) => (
          <div
            key={app}
            className="flex items-center justify-between bg-card rounded-xl border border-border p-4 gap-4"
          >
            <span className="text-sm font-medium truncate">{app}</span>
            <div className="relative w-28 shrink-0">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                {currencySymbol}
              </span>
              <Input
                type="number"
                step="0.01"
                min="0"
                className="pl-7 text-right font-mono text-base h-10"
                value={day.apps[app] || ""}
                placeholder="0.00"
                onChange={(e) => onUpdate(dayIdx, app, e.target.value)}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Mileage */}
      {onMileageUpdate && (
        <div className="flex items-center justify-between bg-card rounded-xl border border-border p-4 gap-4">
          <span className="text-sm font-medium">Business Miles</span>
          <div className="relative w-28 shrink-0">
            <Input
              type="number"
              step="0.1"
              min="0"
              className="text-right font-mono text-base h-10"
              value={mileage}
              placeholder="0.0"
              onChange={(e) => {
                setMileage(e.target.value);
                onMileageUpdate(dayIdx, parseFloat(e.target.value) || 0);
              }}
            />
          </div>
        </div>
      )}

      {/* Save */}
      <Button onClick={onSave} className="w-full" size="lg">
        <Save className="h-4 w-4 mr-2" />
        Save
      </Button>
    </div>
  );
}