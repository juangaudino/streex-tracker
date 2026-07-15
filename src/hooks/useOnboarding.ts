import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import type { WeekRecord } from "@/lib/types";
import {
  completeOnboardingStep,
  isOnboardingComplete,
  loadOnboarding,
  saveOnboarding,
  type OnboardingState,
  type OnboardingStep,
} from "@/lib/onboarding";

const EMPTY_STATE: OnboardingState = {};

function hasTrackedActivity(weeks: WeekRecord[]) {
  return weeks.some((week) => week.entries.some((day) =>
    Boolean(day.logged || day.dayClosed || (day.shifts?.length ?? 0) > 0 || Object.values(day.apps).some((amount) => amount > 0)),
  ));
}

export function useOnboarding(user: User | null, weeks: WeekRecord[]) {
  const [state, setState] = useState<OnboardingState>(EMPTY_STATE);
  const [loading, setLoading] = useState(Boolean(user));

  const refresh = useCallback(async () => {
    if (!user) {
      setState(EMPTY_STATE);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setState(await loadOnboarding(user.id));
    } catch (error) {
      console.warn("[onboarding] unable to load state", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const complete = useCallback(async (step: OnboardingStep) => {
    if (!user) return;
    try {
      const next = await completeOnboardingStep(user.id, state, step);
      setState(next);
    } catch (error) {
      console.warn("[onboarding] unable to save progress", error);
    }
  }, [state, user]);

  const dismiss = useCallback(async () => {
    if (!user) return;
    try {
      const next = await saveOnboarding(user.id, { ...state, dismissedAt: new Date().toISOString() });
      setState(next);
    } catch (error) {
      console.warn("[onboarding] unable to dismiss checklist", error);
    }
  }, [state, user]);

  const resume = useCallback(async () => {
    if (!user) return;
    try {
      const next = await saveOnboarding(user.id, { ...state, dismissedAt: undefined });
      setState(next);
    } catch (error) {
      console.warn("[onboarding] unable to resume checklist", error);
    }
  }, [state, user]);

  useEffect(() => {
    if (!user || loading || isOnboardingComplete(state)) return;
    if (!state.firstWeekCompletedAt && weeks.length > 0) {
      void complete("firstWeek");
      return;
    }
    if (!state.firstActivityCompletedAt && hasTrackedActivity(weeks)) {
      void complete("firstActivity");
    }
  }, [complete, loading, state, user, weeks]);

  return {
    state,
    loading,
    complete,
    dismiss,
    resume,
    isComplete: isOnboardingComplete(state),
  };
}
