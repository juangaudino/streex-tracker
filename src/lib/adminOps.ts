import { supabase } from "@/integrations/supabase/client";

const ADMIN_FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-ops`;
const ADMIN_EMAIL_FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-email`;

export type AccountStatus = "active" | "blocked" | "deleted_pending";
export type FeedbackStatus = "new" | "reviewed" | "planned" | "resolved" | "dismissed";
export type FeedbackType = "suggestion" | "bug" | "general";

export interface AppRuntimeConfig {
  latest_version: string;
  update_required: boolean;
  update_message: string;
  forced_logout_after: string | null;
  updated_at: string;
}

export interface AdminUserSummary {
  id: string;
  email: string | null;
  createdAt: string | null;
  lastSignInAt: string | null;
  status: AccountStatus;
  blockedAt: string | null;
  deleteRequestedAt: string | null;
  totalWeeks: number;
  totalShiftBlocks: number;
  activeDays: number;
  lastEntryDate: string | null;
  lastActivityAt: string | null;
}

export interface FeedbackItem {
  id: string;
  user_id: string | null;
  user_email: string | null;
  type: FeedbackType;
  message: string;
  status: FeedbackStatus;
  created_at: string;
  updated_at: string;
}

export interface EmailCampaign {
  id: string;
  name: string;
  audience: "test" | "specific" | "inactive" | "all_active";
  subject: string;
  body: string;
  app_url: string;
  status: "draft" | "sending" | "sent" | "failed";
  requested_count: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
  sent_at: string | null;
}

export async function callAdminOps<T>(payload: Record<string, unknown>): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Please sign in again.");

  const res = await fetch(ADMIN_FN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || "Admin operation failed.");
  return json as T;
}

export async function callAdminEmail<T>(payload: Record<string, unknown>): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Please sign in again.");

  const res = await fetch(ADMIN_EMAIL_FN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || "Email operation failed.");
  return json as T;
}

export async function submitFeedback(input: {
  type: FeedbackType;
  message: string;
  userId: string;
  userEmail?: string | null;
}) {
  const { error } = await (supabase as any)
    .from("feedback_items")
    .insert({
      user_id: input.userId,
      user_email: input.userEmail ?? null,
      type: input.type,
      message: input.message.trim(),
    });

  if (error) throw new Error(error.message);
}
