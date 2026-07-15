import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type OnboardingRow = Database["public"]["Tables"]["user_onboarding"]["Row"];

export interface OnboardingState {
  setupCompletedAt?: string;
  firstWeekCompletedAt?: string;
  firstActivityCompletedAt?: string;
  dismissedAt?: string;
}

export type OnboardingStep = "setup" | "firstWeek" | "firstActivity";

function fromRow(row: OnboardingRow | null): OnboardingState {
  return {
    setupCompletedAt: row?.setup_completed_at ?? undefined,
    firstWeekCompletedAt: row?.first_week_completed_at ?? undefined,
    firstActivityCompletedAt: row?.first_activity_completed_at ?? undefined,
    dismissedAt: row?.dismissed_at ?? undefined,
  };
}

export function isOnboardingComplete(state: OnboardingState): boolean {
  return Boolean(state.setupCompletedAt && state.firstWeekCompletedAt && state.firstActivityCompletedAt);
}

export async function loadOnboarding(userId: string): Promise<OnboardingState> {
  const { data, error } = await supabase
    .from("user_onboarding")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return fromRow(data);
}

export async function saveOnboarding(userId: string, state: OnboardingState): Promise<OnboardingState> {
  const { data, error } = await supabase
    .from("user_onboarding")
    .upsert({
      user_id: userId,
      setup_completed_at: state.setupCompletedAt ?? null,
      first_week_completed_at: state.firstWeekCompletedAt ?? null,
      first_activity_completed_at: state.firstActivityCompletedAt ?? null,
      dismissed_at: state.dismissedAt ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" })
    .select("*")
    .single();
  if (error) throw error;
  return fromRow(data);
}

export async function completeOnboardingStep(userId: string, state: OnboardingState, step: OnboardingStep) {
  const now = new Date().toISOString();
  const next: OnboardingState = {
    ...state,
    dismissedAt: undefined,
    ...(step === "setup" ? { setupCompletedAt: state.setupCompletedAt ?? now } : {}),
    ...(step === "firstWeek" ? { firstWeekCompletedAt: state.firstWeekCompletedAt ?? now } : {}),
    ...(step === "firstActivity" ? { firstActivityCompletedAt: state.firstActivityCompletedAt ?? now } : {}),
  };
  return saveOnboarding(userId, next);
}
