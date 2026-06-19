import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { DriverUtilityData } from "@/lib/driverUtility";

type LocationConsent = "unknown" | "enabled" | "denied";
type UtilityState = "idle" | "requesting-location" | "loading" | "ready" | "denied" | "unsupported" | "error";
type UtilityScope = "all" | "weather" | "traffic";
type UtilityResponse = Pick<DriverUtilityData, "generatedAt" | "locationPrecision"> & Partial<Pick<DriverUtilityData, "weather" | "traffic">>;

const CONSENT_KEY = "streex_driver_utility_location_consent";
const CACHE_KEY = "streex_driver_utility_cache_v2";
const LEGACY_CACHE_KEY = "streex_driver_utility_cache_v1";
const TRAFFIC_REFRESH_MS = 5 * 60 * 1000;
const WEATHER_REFRESH_MS = 30 * 60 * 1000;
const MAX_CACHE_MS = 24 * 60 * 60 * 1000;

interface CachedUtility {
  latitude: number;
  longitude: number;
  weatherFetchedAt: number;
  trafficFetchedAt: number;
  data: DriverUtilityData;
}

function readConsent(): LocationConsent {
  try {
    return (localStorage.getItem(CONSENT_KEY) as LocationConsent | null) || "unknown";
  } catch {
    return "unknown";
  }
}

function writeConsent(consent: LocationConsent) {
  try {
    localStorage.setItem(CONSENT_KEY, consent);
  } catch {
    // Non-fatal.
  }
}

function readCache(): CachedUtility | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY) ?? localStorage.getItem(LEGACY_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedUtility & { fetchedAt?: number };
    const fallbackFetchedAt = parsed.fetchedAt ?? 0;
    const newestFetch = Math.max(parsed.weatherFetchedAt ?? fallbackFetchedAt, parsed.trafficFetchedAt ?? fallbackFetchedAt);
    if (!parsed?.data || Date.now() - newestFetch > MAX_CACHE_MS) return null;
    return {
      latitude: parsed.latitude,
      longitude: parsed.longitude,
      weatherFetchedAt: parsed.weatherFetchedAt ?? fallbackFetchedAt,
      trafficFetchedAt: parsed.trafficFetchedAt ?? fallbackFetchedAt,
      data: parsed.data,
    };
  } catch {
    return null;
  }
}

function writeCache(cache: CachedUtility) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    localStorage.removeItem(LEGACY_CACHE_KEY);
  } catch {
    // Non-fatal.
  }
}

function nearEnough(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.03;
}

function scopeIsFresh(cache: CachedUtility, scope: UtilityScope): boolean {
  const now = Date.now();
  const weatherFresh = now - cache.weatherFetchedAt < WEATHER_REFRESH_MS;
  const trafficFresh = now - cache.trafficFetchedAt < TRAFFIC_REFRESH_MS;
  return scope === "weather" ? weatherFresh : scope === "traffic" ? trafficFresh : weatherFresh && trafficFresh;
}

export function useDriverUtility() {
  const [consent, setConsent] = useState<LocationConsent>(() => readConsent());
  const [state, setState] = useState<UtilityState>(consent === "enabled" ? "loading" : "idle");
  const [data, setData] = useState<DriverUtilityData | null>(() => readCache()?.data ?? null);
  const [error, setError] = useState<string | null>(null);

  const fetchUtility = useCallback(async (scope: UtilityScope = "all", force = false) => {
    if (!("geolocation" in navigator)) {
      setState("unsupported");
      return;
    }

    if (document.visibilityState === "hidden") return;
    setError(null);
    setState("requesting-location");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        writeConsent("enabled");
        setConsent("enabled");

        const cached = readCache();
        if (!force && cached && nearEnough(cached.latitude, latitude) && nearEnough(cached.longitude, longitude) && scopeIsFresh(cached, scope)) {
          setData(cached.data);
          setState("ready");
          return;
        }

        setState("loading");
        const { data: result, error: invokeError } = await supabase.functions.invoke<UtilityResponse>(
          "driver-utility",
          { body: { latitude, longitude, scope } },
        );

        if (invokeError || !result) {
          setError(invokeError?.message || "Live utility is unavailable.");
          setState(cached?.data ? "ready" : "error");
          if (cached?.data) setData(cached.data);
          return;
        }

        const fetchedAt = Date.now();
        setData((previous) => {
          const latestCache = readCache();
          const base = previous ?? latestCache?.data ?? cached?.data;
          if (!base && (!result.weather || !result.traffic)) return previous;
          const merged = {
            generatedAt: result.generatedAt,
            locationPrecision: result.locationPrecision,
            weather: result.weather ?? base!.weather,
            traffic: result.traffic ?? base!.traffic,
          };
          writeCache({
            latitude,
            longitude,
            weatherFetchedAt: result.weather ? fetchedAt : latestCache?.weatherFetchedAt ?? cached?.weatherFetchedAt ?? 0,
            trafficFetchedAt: result.traffic ? fetchedAt : latestCache?.trafficFetchedAt ?? cached?.trafficFetchedAt ?? 0,
            data: merged,
          });
          return merged;
        });
        setState("ready");
      },
      () => {
        writeConsent("denied");
        setConsent("denied");
        setState("denied");
      },
      { enableHighAccuracy: false, timeout: 9000, maximumAge: scope === "traffic" ? TRAFFIC_REFRESH_MS : WEATHER_REFRESH_MS },
    );
  }, []);

  useEffect(() => {
    if (consent === "enabled") fetchUtility("all", false);
  }, [consent, fetchUtility]);

  useEffect(() => {
    if (consent !== "enabled") return;
    const trafficInterval = window.setInterval(() => fetchUtility("traffic", true), TRAFFIC_REFRESH_MS);
    const weatherInterval = window.setInterval(() => fetchUtility("weather", true), WEATHER_REFRESH_MS);
    const handleVisible = () => {
      if (document.visibilityState === "visible") fetchUtility("all", false);
    };
    document.addEventListener("visibilitychange", handleVisible);
    return () => {
      window.clearInterval(trafficInterval);
      window.clearInterval(weatherInterval);
      document.removeEventListener("visibilitychange", handleVisible);
    };
  }, [consent, fetchUtility]);

  return {
    consent,
    state,
    data,
    error,
    enable: () => fetchUtility("all", true),
    refresh: () => fetchUtility("all", true),
  };
}
