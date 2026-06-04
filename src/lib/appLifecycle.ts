const DEBUG_FLAG_KEY = "streex_debug_lifecycle";

export function isLifecycleDebugEnabled(): boolean {
  if (import.meta.env.DEV) return true;
  try {
    return localStorage.getItem(DEBUG_FLAG_KEY) === "1";
  } catch {
    return false;
  }
}

export function lifecycleDebug(event: string, details?: Record<string, unknown>) {
  if (!isLifecycleDebugEnabled()) return;
  console.info(`[streex-lifecycle] ${event}`, details ?? {});
}

