import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
  Deno.env.get("SUPABASE_ANON_KEY")!;
const OPENWEATHER_API_KEY = Deno.env.get("OPENWEATHER_API_KEY");
const TOMTOM_API_KEY = Deno.env.get("TOMTOM_API_KEY");

type ProviderStatus = "live" | "not_configured" | "unavailable";
type OpenWeatherHour = {
  dt?: number;
  temp?: number;
  pop?: number;
  weather?: { main?: string; description?: string }[];
};
type OpenWeatherForecastItem = {
  dt?: number;
  pop?: number;
  main?: { temp?: number };
  weather?: { main?: string; description?: string }[];
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function round(value: number): number {
  return Math.round(value);
}

function validCoordinate(lat: number, lon: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lon) &&
    lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

function weatherCopy(condition: string, precipChance: number): string {
  const c = condition.toLowerCase();
  if (precipChance >= 55 || c.includes("rain") || c.includes("storm")) {
    return "Rain nearby. Watch the next few hours.";
  }
  if (c.includes("snow") || c.includes("ice")) {
    return "Cold roads. Give yourself a little more margin.";
  }
  if (c.includes("clear")) return "Clear roads, steady pace.";
  if (c.includes("cloud")) return "Cloudy but workable driving weather.";
  return "Live weather is ready for your route decisions.";
}

function trafficLevel(ratio: number, roadClosure: boolean): "light" | "moderate" | "heavy" | "closed" | "unknown" {
  if (roadClosure) return "closed";
  if (!Number.isFinite(ratio) || ratio <= 0) return "unknown";
  if (ratio >= 0.82) return "light";
  if (ratio >= 0.58) return "moderate";
  return "heavy";
}

function trafficCopy(level: ReturnType<typeof trafficLevel>): string {
  if (level === "closed") return "Road closure detected near your current area.";
  if (level === "heavy") return "Heavy flow nearby. A better window may open later.";
  if (level === "moderate") return "Moderate traffic nearby. Stay selective with timing.";
  if (level === "light") return "Traffic looks light around your current area.";
  return "Traffic data is limited for this location.";
}

function buildWeatherPayload(args: {
  condition: string;
  temperature: number;
  precipitationChance: number;
  nextHours: OpenWeatherHour[];
  source: "onecall_3_0" | "current_and_forecast_2_5";
}) {
  return {
    status: "live" as ProviderStatus,
    provider: "OpenWeather",
    source: args.source,
    observedAt: new Date().toISOString(),
    condition: args.condition,
    temperature: round(args.temperature),
    precipitationChance: args.precipitationChance,
    nextHours: args.nextHours.slice(0, 3).map((h) => ({
      time: new Date(Number(h.dt) * 1000).toISOString(),
      temperature: round(Number(h.temp ?? 0)),
      precipitationChance: Math.round(Number(h.pop ?? 0) * 100),
      condition: String(h.weather?.[0]?.main || "Forecast"),
    })),
    copy: weatherCopy(args.condition, args.precipitationChance),
  };
}

async function fetchOpenWeatherOneCall(lat: number, lon: number, apiKey: string) {
  const url = new URL("https://api.openweathermap.org/data/3.0/onecall");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("units", "imperial");
  url.searchParams.set("exclude", "minutely,daily,alerts");
  url.searchParams.set("appid", apiKey);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`OpenWeather One Call ${res.status}`);
  const data = await res.json();
  const current = data?.current ?? {};
  const weather = current?.weather?.[0] ?? {};
  const hourly = Array.isArray(data?.hourly) ? data.hourly.slice(0, 4) : [];
  const precipChance = Math.round(((hourly[1]?.pop ?? hourly[0]?.pop ?? 0) as number) * 100);
  const condition = String(weather.description || weather.main || "Current conditions");

  return buildWeatherPayload({
    condition,
    temperature: Number(current.temp ?? 0),
    precipitationChance: precipChance,
    nextHours: (hourly as OpenWeatherHour[]).slice(1, 4),
    source: "onecall_3_0",
  });
}

async function fetchOpenWeatherFreeEndpoints(lat: number, lon: number, apiKey: string) {
  const currentUrl = new URL("https://api.openweathermap.org/data/2.5/weather");
  currentUrl.searchParams.set("lat", String(lat));
  currentUrl.searchParams.set("lon", String(lon));
  currentUrl.searchParams.set("units", "imperial");
  currentUrl.searchParams.set("appid", apiKey);

  const forecastUrl = new URL("https://api.openweathermap.org/data/2.5/forecast");
  forecastUrl.searchParams.set("lat", String(lat));
  forecastUrl.searchParams.set("lon", String(lon));
  forecastUrl.searchParams.set("units", "imperial");
  forecastUrl.searchParams.set("appid", apiKey);

  const [currentRes, forecastRes] = await Promise.all([
    fetch(currentUrl),
    fetch(forecastUrl),
  ]);
  if (!currentRes.ok) throw new Error(`OpenWeather Current ${currentRes.status}`);
  if (!forecastRes.ok) throw new Error(`OpenWeather Forecast ${forecastRes.status}`);

  const current = await currentRes.json();
  const forecast = await forecastRes.json();
  const weather = current?.weather?.[0] ?? {};
  const forecastItems = Array.isArray(forecast?.list)
    ? (forecast.list as OpenWeatherForecastItem[]).slice(0, 3)
    : [];
  const precipChance = Math.round(Number(forecastItems[0]?.pop ?? 0) * 100);
  const condition = String(weather.description || weather.main || "Current conditions");

  return buildWeatherPayload({
    condition,
    temperature: Number(current?.main?.temp ?? 0),
    precipitationChance: precipChance,
    nextHours: forecastItems.map((item) => ({
      dt: item.dt,
      temp: item.main?.temp,
      pop: item.pop,
      weather: item.weather,
    })),
    source: "current_and_forecast_2_5",
  });
}

async function fetchWeather(lat: number, lon: number) {
  const apiKey = OPENWEATHER_API_KEY;
  if (!apiKey) {
    return {
      status: "not_configured" as ProviderStatus,
      provider: "OpenWeather",
      copy: "Weather provider is ready for connection.",
    };
  }

  try {
    return await fetchOpenWeatherOneCall(lat, lon, apiKey);
  } catch (oneCallError) {
    console.warn("OpenWeather One Call failed; trying free endpoints", oneCallError);
    try {
      return await fetchOpenWeatherFreeEndpoints(lat, lon, apiKey);
    } catch (fallbackError) {
      console.error("weather fetch failed", fallbackError);
      return {
        status: "unavailable" as ProviderStatus,
        provider: "OpenWeather",
        copy: "Weather is temporarily unavailable.",
      };
    }
  }
}

async function fetchTraffic(lat: number, lon: number) {
  if (!TOMTOM_API_KEY) {
    return {
      status: "not_configured" as ProviderStatus,
      provider: "TomTom",
      copy: "Traffic provider is ready for connection.",
    };
  }

  try {
    const url = new URL("https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json");
    url.searchParams.set("point", `${lat},${lon}`);
    url.searchParams.set("unit", "mph");
    url.searchParams.set("key", TOMTOM_API_KEY);

    const res = await fetch(url);
    if (!res.ok) throw new Error(`TomTom ${res.status}`);
    const data = await res.json();
    const flow = data?.flowSegmentData ?? {};
    const currentSpeed = Number(flow.currentSpeed ?? 0);
    const freeFlowSpeed = Number(flow.freeFlowSpeed ?? 0);
    const ratio = freeFlowSpeed > 0 ? currentSpeed / freeFlowSpeed : 0;
    const level = trafficLevel(ratio, Boolean(flow.roadClosure));

    return {
      status: "live" as ProviderStatus,
      provider: "TomTom",
      observedAt: new Date().toISOString(),
      level,
      currentSpeed: round(currentSpeed),
      freeFlowSpeed: round(freeFlowSpeed),
      flowRatio: Number.isFinite(ratio) ? Number(ratio.toFixed(2)) : null,
      roadClosure: Boolean(flow.roadClosure),
      confidence: typeof flow.confidence === "number" ? flow.confidence : null,
      copy: trafficCopy(level),
    };
  } catch (error) {
    console.error("traffic fetch failed", error);
    return {
      status: "unavailable" as ProviderStatus,
      provider: "TomTom",
      copy: "Traffic is temporarily unavailable.",
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return json({ error: "Missing authentication. Please sign in again." }, 401);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes?.user) {
    return json({ error: "Authentication issue. Please sign in again." }, 401);
  }

  let body: { latitude?: number; longitude?: number; scope?: "all" | "weather" | "traffic" };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);
  const scope = body.scope === "weather" || body.scope === "traffic" ? body.scope : "all";
  if (!validCoordinate(latitude, longitude)) {
    return json({ error: "A valid location is required." }, 400);
  }

  const [weather, traffic] = await Promise.all([
    scope === "all" || scope === "weather" ? fetchWeather(latitude, longitude) : Promise.resolve(undefined),
    scope === "all" || scope === "traffic" ? fetchTraffic(latitude, longitude) : Promise.resolve(undefined),
  ]);

  return json({
    generatedAt: new Date().toISOString(),
    locationPrecision: "current-browser-location",
    ...(weather ? { weather } : {}),
    ...(traffic ? { traffic } : {}),
  });
});
