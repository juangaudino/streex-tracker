import { AlertTriangle, CloudRain, CloudSun, Gauge, LocateFixed, MapPinned, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { driverReadinessCopy, utilityStatusLabel, type DriverUtilityData, type TrafficLevel } from "@/lib/driverUtility";
import { useDriverUtility } from "@/hooks/useDriverUtility";

function trafficTone(level?: TrafficLevel) {
  if (level === "heavy" || level === "closed") return "text-warning";
  if (level === "moderate") return "text-primary";
  if (level === "light") return "text-success";
  return "text-muted-foreground";
}

function providerTitle(kind: "Weather" | "Traffic", status?: string) {
  if (status === "not_configured") return "Provider setup needed";
  if (status === "unavailable") return `${kind} unavailable`;
  return "Provider pending";
}

function WeatherPanel({ data }: { data: DriverUtilityData | null }) {
  const weather = data?.weather;
  const live = weather?.status === "live";
  const Icon = live && (weather.condition || "").toLowerCase().includes("rain") ? CloudRain : CloudSun;

  return (
    <div className="min-w-0 rounded-lg border border-border/70 bg-background/55 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Weather
        </p>
        <span className={`text-[9px] font-bold uppercase tracking-wider ${live ? "text-success" : "text-muted-foreground"}`}>
          {utilityStatusLabel(weather?.status || "unavailable")}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <Icon className={`h-5 w-5 shrink-0 ${live ? "text-primary" : "text-muted-foreground"}`} />
        <div className="min-w-0">
          <p className="text-sm font-bold truncate">
            {live ? `${weather.temperature}°F · ${weather.condition}` : providerTitle("Weather", weather?.status)}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {live ? `${weather.precipitationChance ?? 0}% rain risk` : weather?.copy || "Enable live weather."}
          </p>
        </div>
      </div>
      {live && weather.nextHours && weather.nextHours.length > 0 && (
        <div className="grid grid-cols-3 gap-1.5">
          {weather.nextHours.slice(0, 3).map((hour) => (
            <div key={hour.time} className="rounded-md bg-muted/45 px-2 py-1">
              <p className="text-[9px] font-mono text-muted-foreground">
                {new Date(hour.time).toLocaleTimeString([], { hour: "numeric" })}
              </p>
              <p className="text-xs font-bold">{hour.temperature}°</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TrafficPanel({ data }: { data: DriverUtilityData | null }) {
  const traffic = data?.traffic;
  const live = traffic?.status === "live";

  return (
    <div className="min-w-0 rounded-lg border border-border/70 bg-background/55 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Traffic
        </p>
        <span className={`text-[9px] font-bold uppercase tracking-wider ${live ? "text-success" : "text-muted-foreground"}`}>
          {utilityStatusLabel(traffic?.status || "unavailable")}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <Gauge className={`h-5 w-5 shrink-0 ${trafficTone(traffic?.level)}`} />
        <div className="min-w-0">
          <p className="text-sm font-bold capitalize truncate">
            {live ? `${traffic.level || "unknown"} flow nearby` : providerTitle("Traffic", traffic?.status)}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {live && traffic.currentSpeed && traffic.freeFlowSpeed
              ? `${traffic.currentSpeed}/${traffic.freeFlowSpeed} mph flow`
              : traffic?.copy || "Enable live traffic."}
          </p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground line-clamp-2">
        {traffic?.copy || "Traffic insights will appear after live provider connection."}
      </p>
    </div>
  );
}

export default function DailyCommandCenter() {
  const { state, data, error, enable, refresh } = useDriverUtility();
  const loading = state === "requesting-location" || state === "loading";
  const needsLocation = state === "idle" || state === "denied" || state === "unsupported" || state === "error";

  return (
    <section className="rounded-xl border border-border bg-card/95 p-3 sm:p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary flex items-center gap-1.5">
            <MapPinned className="h-3.5 w-3.5" />
            Daily Command Center
          </p>
          <p className="text-sm font-semibold mt-1">{driverReadinessCopy(data)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Live weather and traffic use your current location only for this request.
          </p>
        </div>
        {needsLocation ? (
          <Button size="sm" variant="secondary" onClick={enable} disabled={loading} className="shrink-0">
            <LocateFixed className="h-4 w-4 mr-1" />
            Enable
          </Button>
        ) : (
          <Button size="icon" variant="ghost" onClick={refresh} disabled={loading} className="shrink-0" aria-label="Refresh live utility">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        )}
      </div>

      {state === "denied" && (
        <div className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          Location permission is off. Enable it in your browser to use live weather and traffic.
        </div>
      )}
      {state === "unsupported" && (
        <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Live location is not supported in this browser.
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <WeatherPanel data={data} />
        <TrafficPanel data={data} />
      </div>

      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 text-success" />
        {data ? `Updated ${new Date(data.generatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "No live data loaded yet"}
      </div>
    </section>
  );
}
