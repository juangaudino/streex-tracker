import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { DriverUtilityData } from "@/lib/driverUtility";

type LocationConsent = "unknown" | "enabled" | "denied";
type UtilityState = "idle" | "requesting-location" | "loading" | "ready" | "denied" | "unsupported" | "error";

const CONSENT_KEY = "streex_driver_utility_location_consent";
const CACHE_KEY = "streex_driver_utility_cache_v1";
const REFRESH_MS = 30 * 60 * 1000;
const CACHE_MS = REFRESH_MS;

interface CachedUtility {
  latitude: number;
  longitude: number;
  fetchedAt: number;
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
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedUtility;
    if (!parsed?.data || Date.now() - parsed.fetchedAt > CACHE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(cache: CachedUtility) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Non-fatal.
  }
}

function nearEnough(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.03;
}

export function useDriverUtility() {
  const [consent, setConsent] = useState<LocationConsent>(() => readConsent());
  const [state, setState] = useState<UtilityState>(consent === "enabled" ? "loading" : "idle");
  const [data, setData] = useState<DriverUtilityData | null>(() => readCache()?.data ?? null);
  const [error, setError] = useState<string | null>(null);

  const fetchUtility = useCallback(async (force = false) => {
    if (!("geolocation" in navigator)) {
      setState("unsupported");
      return;
    }

    setError(null);
    setState("requesting-location");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        writeConsent("enabled");
        setConsent("enabled");

        const cached = readCache();
        if (!force && cached && nearEnough(cached.latitude, latitude) && nearEnough(cached.longitude, longitude)) {
          setData(cached.data);
          setState("ready");
          return;
        }

        setState("loading");
        const { data: result, error: invokeError } = await supabase.functions.invoke<DriverUtilityData>(
          "driver-utility",
          { body: { latitude, longitude } },
        );

        if (invokeError || !result) {
          setError(invokeError?.message || "Live utility is unavailable.");
          setState(cached?.data ? "ready" : "error");
          if (cached?.data) setData(cached.data);
          return;
        }

        setData(result);
        writeCache({ latitude, longitude, fetchedAt: Date.now(), data: result });
        setState("ready");
      },
      () => {
        writeConsent("denied");
        setConsent("denied");
        setState("denied");
      },
      { enableHighAccuracy: false, timeout: 9000, maximumAge: CACHE_MS },
    );
  }, []);

  useEffect(() => {
    if (consent === "enabled") fetchUtility(false);
  }, [consent, fetchUtility]);

  useEffect(() => {
    if (consent !== "enabled") return;
    const interval = window.setInterval(() => {
      fetchUtility(true);
    }, REFRESH_MS);
    return () => window.clearInterval(interval);
  }, [consent, fetchUtility]);

  return {
    consent,
    state,
    data,
    error,
    enable: () => fetchUtility(true),
    refresh: () => fetchUtility(true),
  };
}
