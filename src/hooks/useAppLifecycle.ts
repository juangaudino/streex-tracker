import { useEffect } from "react";
import { lifecycleDebug } from "@/lib/appLifecycle";

export function useAppLifecycle() {
  useEffect(() => {
    lifecycleDebug("app mount", {
      visibilityState: document.visibilityState,
      online: navigator.onLine,
    });

    const logVisibility = () => lifecycleDebug("visibilitychange", {
      visibilityState: document.visibilityState,
    });
    const logPageShow = (event: PageTransitionEvent) => lifecycleDebug("pageshow", {
      persisted: event.persisted,
    });
    const logPageHide = (event: PageTransitionEvent) => lifecycleDebug("pagehide", {
      persisted: event.persisted,
    });
    const logFocus = () => lifecycleDebug("focus");
    const logBlur = () => lifecycleDebug("blur");
    const logOnline = () => lifecycleDebug("online");
    const logOffline = () => lifecycleDebug("offline");

    document.addEventListener("visibilitychange", logVisibility);
    window.addEventListener("pageshow", logPageShow);
    window.addEventListener("pagehide", logPageHide);
    window.addEventListener("focus", logFocus);
    window.addEventListener("blur", logBlur);
    window.addEventListener("online", logOnline);
    window.addEventListener("offline", logOffline);

    return () => {
      lifecycleDebug("app unmount");
      document.removeEventListener("visibilitychange", logVisibility);
      window.removeEventListener("pageshow", logPageShow);
      window.removeEventListener("pagehide", logPageHide);
      window.removeEventListener("focus", logFocus);
      window.removeEventListener("blur", logBlur);
      window.removeEventListener("online", logOnline);
      window.removeEventListener("offline", logOffline);
    };
  }, []);
}

