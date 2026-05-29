export type UtilityProviderStatus = "live" | "not_configured" | "unavailable";
export type TrafficLevel = "light" | "moderate" | "heavy" | "closed" | "unknown";

export interface WeatherHour {
  time: string;
  temperature: number;
  precipitationChance: number;
  condition: string;
}

export interface WeatherUtilityData {
  status: UtilityProviderStatus;
  provider: "OpenWeather";
  observedAt?: string;
  condition?: string;
  temperature?: number;
  precipitationChance?: number;
  nextHours?: WeatherHour[];
  copy: string;
}

export interface TrafficUtilityData {
  status: UtilityProviderStatus;
  provider: "TomTom";
  observedAt?: string;
  level?: TrafficLevel;
  currentSpeed?: number;
  freeFlowSpeed?: number;
  flowRatio?: number | null;
  roadClosure?: boolean;
  confidence?: number | null;
  copy: string;
}

export interface DriverUtilityData {
  generatedAt: string;
  locationPrecision: string;
  weather: WeatherUtilityData;
  traffic: TrafficUtilityData;
}

export function isUtilityLive(data: DriverUtilityData | null): boolean {
  return data?.weather.status === "live" || data?.traffic.status === "live";
}

export function utilityStatusLabel(status: UtilityProviderStatus): string {
  if (status === "live") return "Live";
  if (status === "not_configured") return "Provider setup needed";
  return "Unavailable";
}

export function driverReadinessCopy(data: DriverUtilityData | null): string {
  if (!data) return "Enable location to add live daily context.";
  if (data.weather.status !== "live" && data.traffic.status !== "live") {
    return "Live utility is ready, but provider keys still need to be connected.";
  }
  if (data.traffic.level === "heavy" || data.traffic.level === "closed") {
    return "Stay selective. Timing may matter more than volume right now.";
  }
  if ((data.weather.precipitationChance ?? 0) >= 55) {
    return "Weather may shift demand windows. Keep the day flexible.";
  }
  if (data.traffic.level === "light") return "Clean conditions. Good window to build momentum.";
  return "A steady setup for the next drive window.";
}
