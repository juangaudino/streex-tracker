import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CloudFog, CloudLightning, CloudRain, CloudSun, Gift, Minus, Plus, Snowflake, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { TrafficUtilityData, WeatherUtilityData } from "@/lib/driverUtility";
import { cn } from "@/lib/utils";
import { adjustOctopusPoints, octopusRewardProgress } from "@/lib/octopusRewards";

export type FocusUtilityEvent = { id: number; type: "octopus" };

interface FocusUtilitySlotProps {
  weather?: WeatherUtilityData;
  traffic?: TrafficUtilityData;
  utilityState: string;
  octopusPoints: number;
  octopusUpdatedAt?: string;
  event?: FocusUtilityEvent | null;
  onOpenConditions: () => void;
  onSaveOctopusPoints: (points: number) => Promise<boolean>;
}

type UtilityView = "conditions" | "octopus";
const MINIMUM_VISIBILITY_MS = 90 * 1000;

function weatherIcon(condition?: string) {
  const value = (condition ?? "").toLowerCase();
  if (value.includes("storm") || value.includes("thunder")) return CloudLightning;
  if (value.includes("rain") || value.includes("drizzle")) return CloudRain;
  if (value.includes("snow") || value.includes("ice")) return Snowflake;
  if (value.includes("fog") || value.includes("mist") || value.includes("haze")) return CloudFog;
  if (value.includes("clear") || value.includes("sun")) return Sun;
  return CloudSun;
}

function relativeAge(value?: string): string {
  if (!value) return "waiting";
  const elapsed = Date.now() - Date.parse(value);
  if (!Number.isFinite(elapsed) || elapsed < 60_000) return "now";
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h`;
}

function displayPoints(points: number): string {
  return Number.isInteger(points) ? String(points) : points.toFixed(1);
}

export default function FocusUtilitySlot({
  weather,
  traffic,
  utilityState,
  octopusPoints,
  octopusUpdatedAt,
  event,
  onOpenConditions,
  onSaveOctopusPoints,
}: FocusUtilitySlotProps) {
  const weatherLive = weather?.status === "live";
  const trafficLive = traffic?.status === "live";
  const [activeView, setActiveView] = useState<UtilityView>(weatherLive || trafficLive ? "conditions" : "octopus");
  const [octopusOpen, setOctopusOpen] = useState(false);
  const [exactDraft, setExactDraft] = useState("");
  const [rideDraft, setRideDraft] = useState("1");
  const [saving, setSaving] = useState(false);
  const fallbackTimer = useRef<number | null>(null);
  const queuedConditionsTimer = useRef<number | null>(null);
  const octopusHoldUntil = useRef(0);

  const WeatherIcon = useMemo(() => weatherIcon(weather?.condition), [weather?.condition]);
  const { points, rewardsReady, ridesRemaining, progressPercent: progress } = octopusRewardProgress(octopusPoints);
  const trafficTone = traffic?.level === "heavy" || traffic?.level === "closed"
    ? "text-destructive"
    : traffic?.level === "moderate"
      ? "text-warning"
      : "text-success";
  const trafficAnimationDuration = traffic?.level === "light" ? "2.8s" : traffic?.level === "heavy" ? "7s" : "4.5s";

  const clearTimers = useCallback(() => {
    if (fallbackTimer.current) window.clearTimeout(fallbackTimer.current);
    if (queuedConditionsTimer.current) window.clearTimeout(queuedConditionsTimer.current);
    fallbackTimer.current = null;
    queuedConditionsTimer.current = null;
  }, []);

  const showConditions = useCallback(() => {
    clearTimers();
    setActiveView("conditions");
    fallbackTimer.current = window.setTimeout(() => setActiveView("octopus"), MINIMUM_VISIBILITY_MS);
  }, [clearTimers]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  useEffect(() => {
    if (!event || event.type !== "octopus") return;
    clearTimers();
    octopusHoldUntil.current = Date.now() + MINIMUM_VISIBILITY_MS;
    setActiveView("octopus");
  }, [clearTimers, event]);

  useEffect(() => {
    if (!weather?.observedAt && !traffic?.observedAt) return;
    const wait = Math.max(0, octopusHoldUntil.current - Date.now());
    if (wait > 0) {
      if (queuedConditionsTimer.current) window.clearTimeout(queuedConditionsTimer.current);
      queuedConditionsTimer.current = window.setTimeout(showConditions, wait);
      return;
    }
    showConditions();
  }, [showConditions, traffic?.observedAt, weather?.observedAt]);

  function chooseView(view: UtilityView) {
    clearTimers();
    setActiveView(view);
  }

  function openOctopus() {
    setExactDraft(displayPoints(points));
    setRideDraft("1");
    setOctopusOpen(true);
  }

  async function savePoints(nextPoints: number) {
    setSaving(true);
    const saved = await onSaveOctopusPoints(Math.max(0, Math.round(nextPoints * 2) / 2));
    setSaving(false);
    if (saved) setExactDraft(displayPoints(Math.max(0, Math.round(nextPoints * 2) / 2)));
  }

  async function handleExactSave() {
    const parsed = Number(exactDraft.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed < 0) return;
    await savePoints(parsed);
  }

  async function handleRideAdjustment(direction = 1) {
    const rides = Math.trunc(Number(rideDraft) || 0) * direction;
    if (rides === 0) return;
    await savePoints(adjustOctopusPoints(points, rides));
  }

  return (
    <>
      <div className="relative min-h-[112px] overflow-hidden rounded-xl border border-primary/25 bg-primary/5 p-3">
        <div className="absolute right-2 top-2 z-20 flex rounded-lg border border-border/70 bg-background/75 p-0.5 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Show conditions"
            title="Conditions"
            onClick={() => chooseView("conditions")}
            className={cn("rounded-md p-1.5 transition-colors", activeView === "conditions" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            <CloudSun className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="Show Octopus rewards"
            title="Octopus rewards"
            onClick={() => chooseView("octopus")}
            className={cn("rounded-md p-1.5 transition-colors", activeView === "octopus" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            <Gift className="h-3.5 w-3.5" />
          </button>
        </div>

        {activeView === "conditions" ? (
          <button type="button" onClick={onOpenConditions} className="relative z-10 block w-full pr-16 text-left focus:outline-none">
            <div className="flex items-start gap-3">
              <div className="relative mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-background/65">
                <WeatherIcon className="h-7 w-7 text-primary" />
                <span className="absolute -bottom-1 -right-1 rounded-md border border-border bg-card px-1 text-[9px] font-bold font-mono">
                  {weatherLive ? `${weather.temperature}°` : "—"}
                </span>
              </div>
              <div className="min-w-0 pt-0.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Conditions</p>
                <p className="mt-1 truncate text-lg font-bold font-mono">
                  {weatherLive || trafficLive
                    ? [weatherLive ? weather.condition : null, trafficLive ? `${traffic.level} flow` : null].filter(Boolean).join(" / ")
                    : utilityState === "idle" || utilityState === "denied" ? "Enable live context" : "Updating context"}
                </p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Weather {relativeAge(weather?.observedAt)} · Traffic {relativeAge(traffic?.observedAt)}
                </p>
              </div>
            </div>
            <div className="utility-road mt-3" aria-hidden="true">
              <span
                className={cn("utility-road-flow", trafficTone, traffic?.level === "closed" && "[animation-play-state:paused]")}
                style={{ animationDuration: trafficAnimationDuration }}
              />
            </div>
          </button>
        ) : (
          <button type="button" onClick={openOctopus} className="relative z-10 block w-full pr-16 text-left focus:outline-none">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Octopus Reward</p>
                <p className="mt-1 text-2xl font-bold font-mono">{displayPoints(points)} <span className="text-sm text-muted-foreground">/ 250 pts</span></p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {rewardsReady > 0 ? `${rewardsReady} $25 reward${rewardsReady === 1 ? "" : "s"} ready` : `~${ridesRemaining} eligible Uber rides to $25`}
                </p>
              </div>
              <Gift className="h-9 w-9 shrink-0 text-primary/70" />
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${progress}%` }} />
            </div>
            {octopusUpdatedAt && <p className="mt-1 text-[10px] text-muted-foreground">Synced {relativeAge(octopusUpdatedAt)}</p>}
          </button>
        )}
      </div>

      <Sheet open={octopusOpen} onOpenChange={setOctopusOpen}>
        <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-2xl pb-[max(env(safe-area-inset-bottom),1rem)]">
          <div className="mx-auto max-w-lg space-y-5">
            <SheetHeader>
              <SheetTitle>Octopus Reward</SheetTitle>
            </SheetHeader>
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Current balance</p>
              <p className="mt-1 text-3xl font-bold font-mono">{displayPoints(points)} points</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {rewardsReady > 0 ? "$25 reward ready to redeem." : `${ridesRemaining} eligible Uber rides estimated to the next $25 reward.`}
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="octopus-exact-points" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Sync exact points</label>
              <div className="flex gap-2">
                <Input id="octopus-exact-points" type="number" inputMode="decimal" min="0" step="0.5" value={exactDraft} onChange={(event) => setExactDraft(event.target.value)} />
                <Button type="button" onClick={handleExactSave} disabled={saving}>Sync</Button>
              </div>
              <p className="text-xs text-muted-foreground">Use the exact balance shown in Octopus to correct any drift.</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="octopus-ride-adjustment" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Eligible Uber rides</label>
              <Input id="octopus-ride-adjustment" type="number" inputMode="numeric" min="1" step="1" value={rideDraft} onChange={(event) => setRideDraft(event.target.value)} />
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="outline" onClick={() => handleRideAdjustment(-1)} disabled={saving}>
                  <Minus className="mr-1.5 h-4 w-4" /> Remove rides
                </Button>
                <Button type="button" onClick={() => handleRideAdjustment(1)} disabled={saving}>
                  <Plus className="mr-1.5 h-4 w-4" /> Add rides
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Each eligible Uber ride changes the balance by 1.5 points.</p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
