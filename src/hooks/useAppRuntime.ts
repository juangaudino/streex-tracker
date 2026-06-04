import { useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { CURRENT_VERSION } from "@/lib/changelog";
import { supabase } from "@/integrations/supabase/client";
import { callAdminOps, type AccountStatus, type AppRuntimeConfig } from "@/lib/adminOps";
import { lifecycleDebug } from "@/lib/appLifecycle";
import { isVersionNewer } from "@/lib/appVersion";

interface AccessState {
  status: AccountStatus;
  loading: boolean;
}

interface UpdateNotice {
  latestVersion: string;
  message: string;
  required: boolean;
}

const DISMISSED_UPDATE_KEY = "streex_update_notice_dismissed";

interface RuntimeSnapshot {
  userId: string;
  config: AppRuntimeConfig | null;
  access: AccessState;
  isAdmin: boolean;
}

let cachedRuntime: RuntimeSnapshot | null = null;

function sessionLoginTime(session: Session | null, user: User | null): number {
  const lastSignIn = user?.last_sign_in_at ? Date.parse(user.last_sign_in_at) : 0;
  const issuedAt = session?.expires_at && session?.expires_in
    ? (session.expires_at - session.expires_in) * 1000
    : 0;
  return Math.max(lastSignIn, issuedAt, 0);
}

export function useAppRuntime(user: User | null, session: Session | null, signOut: () => Promise<void>) {
  const cachedForUser = user && cachedRuntime?.userId === user.id ? cachedRuntime : null;
  const [config, setConfig] = useState<AppRuntimeConfig | null>(() => cachedForUser?.config ?? null);
  const [access, setAccess] = useState<AccessState>(() => cachedForUser?.access ?? {
    status: "active",
    loading: Boolean(user),
  });
  const [isAdmin, setIsAdmin] = useState(() => cachedForUser?.isAdmin ?? false);
  const [dismissedVersion, setDismissedVersion] = useState(() => {
    try {
      return localStorage.getItem(DISMISSED_UPDATE_KEY) ?? "";
    } catch {
      return "";
    }
  });

  useEffect(() => {
    let cancelled = false;

    async function loadRuntime() {
      if (!user) {
        cachedRuntime = null;
        setConfig(null);
        setIsAdmin(false);
        setAccess({ status: "active", loading: false });
        return;
      }

      const hasCachedRuntime = cachedRuntime?.userId === user.id && !cachedRuntime.access.loading;
      if (!hasCachedRuntime) {
        setAccess((current) => ({ ...current, loading: true }));
      }
      const [configResult, accessResult, adminResult] = await Promise.allSettled([
        (supabase as any)
          .from("app_runtime_config")
          .select("*")
          .eq("singleton", true)
          .maybeSingle(),
        (supabase as any)
          .from("account_access_controls")
          .select("status")
          .eq("user_id", user.id)
          .maybeSingle(),
        callAdminOps<{ config: AppRuntimeConfig }>({ action: "runtimeConfig" }),
      ]);

      if (cancelled) return;

      const configData = configResult.status === "fulfilled"
        ? configResult.value.data
        : null;
      const accessData = accessResult.status === "fulfilled"
        ? accessResult.value.data
        : null;
      const adminConfig = adminResult.status === "fulfilled"
        ? adminResult.value.config
        : null;

      const nextConfig = adminConfig ?? configData ?? null;
      const nextAccess: AccessState = {
        status: accessData?.status ?? "active",
        loading: false,
      };
      const nextIsAdmin = Boolean(adminConfig);
      cachedRuntime = {
        userId: user.id,
        config: nextConfig,
        access: nextAccess,
        isAdmin: nextIsAdmin,
      };
      setIsAdmin(nextIsAdmin);
      setConfig(nextConfig);
      setAccess(nextAccess);
      lifecycleDebug("runtime check result", {
        userId: user.id,
        accessStatus: nextAccess.status,
        isAdmin: nextIsAdmin,
        latestVersion: nextConfig?.latest_version,
        currentVersion: CURRENT_VERSION,
      });
    }

    loadRuntime().catch((error) => {
      console.warn("[app-runtime] failed to load runtime controls", error);
      lifecycleDebug("runtime check failed", { message: error instanceof Error ? error.message : String(error) });
      if (!cancelled && cachedRuntime?.userId !== user?.id) {
        const fallbackAccess: AccessState = { status: "active", loading: false };
        if (user) {
          cachedRuntime = {
            userId: user.id,
            config: null,
            access: fallbackAccess,
            isAdmin: false,
          };
        }
        setAccess(fallbackAccess);
        setIsAdmin(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!config?.forced_logout_after || !user) return;
    const forcedLogoutAt = Date.parse(config.forced_logout_after);
    if (!Number.isFinite(forcedLogoutAt)) return;
    if (sessionLoginTime(session, user) < forcedLogoutAt) {
      signOut().catch((error) => console.warn("[app-runtime] forced sign-out failed", error));
    }
  }, [config?.forced_logout_after, session, signOut, user]);

  const updateNotice = useMemo<UpdateNotice | null>(() => {
    if (isAdmin) return null;
    if (!config?.latest_version || !isVersionNewer(config.latest_version, CURRENT_VERSION)) return null;
    if (!config.update_required && dismissedVersion === config.latest_version) return null;
    return {
      latestVersion: config.latest_version,
      message: config.update_message || "A new Streex update is available. Refresh to get the latest version.",
      required: Boolean(config.update_required),
    };
  }, [config, dismissedVersion, isAdmin]);

  useEffect(() => {
    lifecycleDebug("version check result", {
      currentVersion: CURRENT_VERSION,
      latestVersion: config?.latest_version,
      updateRequired: Boolean(config?.update_required),
      noticeShown: Boolean(updateNotice),
      isAdmin,
    });
  }, [config?.latest_version, config?.update_required, isAdmin, updateNotice]);

  function dismissUpdateNotice() {
    if (!config?.latest_version) return;
    try {
      localStorage.setItem(DISMISSED_UPDATE_KEY, config.latest_version);
    } catch {
      // Optional local dismissal only.
    }
    setDismissedVersion(config.latest_version);
  }

  return {
    access: user && cachedRuntime?.userId !== user.id
      ? { ...access, loading: true }
      : access,
    config,
    isAdmin,
    updateNotice,
    dismissUpdateNotice,
  };
}
