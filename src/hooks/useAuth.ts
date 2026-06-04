import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AuthChangeEvent, User, Session } from "@supabase/supabase-js";
import { lifecycleDebug } from "@/lib/appLifecycle";

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

  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
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
