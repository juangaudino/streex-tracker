import { useMemo, useState } from "react";
import { Navigation, Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { captureForegroundZone } from "@/lib/movementCapture";
import type { RideEvent, WeekRecord } from "@/lib/types";
import { getActiveShift, hasActiveShift } from "@/lib/shiftIntelligence";

interface RideCaptureControlProps {
  openWeek: WeekRecord;
  apps: string[];
  rideEvents: RideEvent[];
  onStart: (draft: { weekId: string; dayDate: string; shiftId?: string | null; app?: string | null; startedAt: string; capture: Awaited<ReturnType<typeof captureForegroundZone>> }) => Promise<RideEvent | null>;
  onFinish: (id: string, endedAt: string, capture: Awaited<ReturnType<typeof captureForegroundZone>>) => Promise<RideEvent | null>;
  onUpdateTotals?: (app?: string | null) => void;
  compact?: boolean;
}

function localToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export default function RideCaptureControl({ openWeek, apps, rideEvents, onStart, onFinish, onUpdateTotals, compact = false }: RideCaptureControlProps) {
  const today = openWeek.entries.find((day) => day.date === localToday()) ?? null;
  const activeShift = today ? getActiveShift(today) : undefined;
  const activeRide = useMemo(() => rideEvents.find((event) => event.status === "active") ?? null, [rideEvents]);
  const completedPending = useMemo(() => rideEvents.filter((event) => event.status === "completed" && event.dayDate === today?.date).length, [rideEvents, today?.date]);
  const [app, setApp] = useState(() => apps.includes("Uber") ? "Uber" : apps[0] ?? "");
  const [capturing, setCapturing] = useState<"start" | "finish" | null>(null);

  async function startRide() {
    if (!today || !activeShift || capturing) return;
    const startedAt = new Date().toISOString();
    setCapturing("start");
    const capture = await captureForegroundZone();
    await onStart({ weekId: openWeek.id, dayDate: today.date, shiftId: activeShift.id, app: app || null, startedAt, capture });
    setCapturing(null);
  }

  async function finishRide() {
    if (!activeRide || capturing) return;
    const endedAt = new Date().toISOString();
    setCapturing("finish");
    const capture = await captureForegroundZone();
    await onFinish(activeRide.id, endedAt, capture);
    setCapturing(null);
  }

  const minutes = activeRide ? Math.max(0, Math.floor((Date.now() - Date.parse(activeRide.startedAt)) / 60_000)) : 0;
  const hasShift = Boolean(today && activeShift && hasActiveShift(today));

  return (
    <section className={cn("rounded-xl border border-primary/25 bg-primary/5 p-3", compact && "p-2.5")} aria-label="Movement ride capture">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-background/70">
          <Navigation className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Movement</p>
          {activeRide ? (
            <>
              <p className="mt-0.5 text-sm font-bold">{activeRide.app || "Ride"} · In progress</p>
              <p className="text-[11px] text-muted-foreground">{activeRide.startCaptureStatus === "captured" ? "Start zone saved" : "Start zone unavailable"} · {minutes} min</p>
            </>
          ) : (
            <>
              <p className="mt-0.5 text-sm font-bold">No active ride</p>
              <p className="text-[11px] text-muted-foreground">{completedPending ? `${completedPending} completed ride${completedPending === 1 ? "" : "s"} pending` : hasShift ? "Capture ride zones while working" : "Start a shift in Quick Actions first"}</p>
            </>
          )}
        </div>
      </div>
      {!activeRide && (
        <div className="mt-3 flex gap-2">
          <Select value={app} onValueChange={setApp}>
            <SelectTrigger className="h-10 min-w-0 flex-1 bg-background/75"><SelectValue placeholder="App" /></SelectTrigger>
            <SelectContent>{apps.map((item) => <SelectItem value={item} key={item}>{item}</SelectItem>)}</SelectContent>
          </Select>
          <Button type="button" className="h-10 shrink-0" disabled={!hasShift || Boolean(capturing)} onClick={startRide}>
            <Play className="mr-1.5 h-4 w-4" />{capturing === "start" ? "Starting…" : "Start ride"}
          </Button>
        </div>
      )}
      {activeRide && <Button type="button" className="mt-3 h-10 w-full" disabled={Boolean(capturing)} onClick={finishRide}><Square className="mr-1.5 h-4 w-4" />{capturing === "finish" ? "Finishing…" : "Finish ride"}</Button>}
      {!activeRide && completedPending > 0 && onUpdateTotals && <Button type="button" variant="outline" className="mt-2 h-9 w-full" onClick={() => onUpdateTotals(rideEvents.filter((event) => event.status === "completed" && event.dayDate === today?.date).at(-1)?.app)}>
        Update totals in Quick Actions
      </Button>}
    </section>
  );
}
