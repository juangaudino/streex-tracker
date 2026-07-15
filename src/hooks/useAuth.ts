import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AuthChangeEvent, User, Session } from "@supabase/supabase-js";
import { lifecycleDebug } from "@/lib/appLifecycle";

export interface AuthActionResult {
  error: import("@supabase/supabase-js").AuthError | null;
  emailConfirmationRequired?: boolean;
}

interface AuthSnapshot {
  session: Session | null;
  user: User | null;
  loading: boolean;
}

let cachedAuth: AuthSnapshot = {
  session: null,
  user: null,
  loading: true,
};

function updateCachedAuth(event: AuthChangeEvent, session: Session | null): AuthSnapshot {
  if (event === "SIGNED_OUT" || event === "INITIAL_SESSION") {
    cachedAuth = {
      session,
      user: session?.user ?? null,
      loading: false,
    };
  } else if (session) {
    cachedAuth = {
      session,
      user: session.user,
      loading: false,
    };
  }
  return cachedAuth;
}

export function useAuth() {
  const [auth, setAuth] = useState<AuthSnapshot>(() => cachedAuth);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const nextAuth = updateCachedAuth(event, session);
        lifecycleDebug("auth state change", {
          event,
          hasSession: Boolean(session),
          userId: session?.user.id,
        });
        if (session) {
          lifecycleDebug("auth session restored", { event, userId: session.user.id });
        } else {
          lifecycleDebug("auth null detected", { event });
        }
        setAuth(nextAuth);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = useCallback(async (email: string, password: string, captchaToken?: string): Promise<AuthActionResult> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        captchaToken,
      },
    });
    return { error, emailConfirmationRequired: Boolean(data.user && !data.session) };
  }, []);

  const signIn = useCallback(async (email: string, password: string, captchaToken?: string): Promise<AuthActionResult> => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: { captchaToken },
    });
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return {
    user: auth.user,
    session: auth.session,
    loading: auth.loading,
    signUp,
    signIn,
    signOut,
  };
}
