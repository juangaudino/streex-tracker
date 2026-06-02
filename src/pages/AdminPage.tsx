import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bug, CheckCircle2, Clock, Inbox, RefreshCw, Shield, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CURRENT_VERSION } from "@/lib/changelog";
import {
  callAdminOps,
  type AccountStatus,
  type AdminUserSummary,
  type AppRuntimeConfig,
  type FeedbackItem,
  type FeedbackStatus,
  type FeedbackType,
} from "@/lib/adminOps";

type AdminRow = {
  id: string;
  email: string;
  role: "owner" | "admin";
  enabled: boolean;
  created_at: string;
};

interface OverviewResponse {
  totals: {
    users: number;
    recentUsers: number;
    inactiveUsers: number;
    blockedUsers: number;
    admins: number;
  };
  users: AdminUserSummary[];
  admins: AdminRow[];
}

function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusTone(status: AccountStatus): string {
  if (status === "blocked") return "bg-destructive/10 text-destructive border-destructive/25";
  if (status === "deleted_pending") return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25";
  return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25";
}

function feedbackTone(status: FeedbackStatus): string {
  if (status === "planned") return "bg-primary/10 text-primary border-primary/25";
  if (status === "resolved") return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25";
  if (status === "dismissed") return "bg-muted text-muted-foreground border-border";
  return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25";
}

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [config, setConfig] = useState<AppRuntimeConfig | null>(null);
  const [feedbackStatus, setFeedbackStatus] = useState<FeedbackStatus | "all">("all");
  const [feedbackType, setFeedbackType] = useState<FeedbackType | "all">("all");
  const [latestVersion, setLatestVersion] = useState(CURRENT_VERSION);
  const [updateRequired, setUpdateRequired] = useState(false);
  const [updateMessage, setUpdateMessage] = useState("A new Streex update is available. Refresh to get the latest version.");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [working, setWorking] = useState<string | null>(null);

  async function loadAdmin() {
    try {
      setLoading(true);
      setError(null);
      const [overviewResult, feedbackResult, configResult] = await Promise.all([
        callAdminOps<OverviewResponse>({ action: "overview" }),
        callAdminOps<{ feedback: FeedbackItem[] }>({ action: "listFeedback" }),
        callAdminOps<{ config: AppRuntimeConfig }>({ action: "runtimeConfig" }),
      ]);
      setOverview(overviewResult);
      setFeedback(feedbackResult.feedback);
      setConfig(configResult.config);
      setLatestVersion(configResult.config.latest_version || CURRENT_VERSION);
      setUpdateRequired(Boolean(configResult.config.update_required));
      setUpdateMessage(configResult.config.update_message || "A new Streex update is available. Refresh to get the latest version.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Admin access failed.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAdmin();
  }, []);

  const filteredFeedback = useMemo(() => {
    return feedback.filter((item) => {
      const statusMatch = feedbackStatus === "all" || item.status === feedbackStatus;
      const typeMatch = feedbackType === "all" || item.type === feedbackType;
      return statusMatch && typeMatch;
    });
  }, [feedback, feedbackStatus, feedbackType]);

  async function setUserStatus(userId: string, status: AccountStatus) {
    const label = status === "active" ? "unblock this user" : status === "blocked" ? "block this user" : "mark this user as delete pending";
    if (!window.confirm(`Confirm: ${label}?`)) return;
    try {
      setWorking(userId);
      await callAdminOps({ action: "setUserStatus", userId, status });
      await loadAdmin();
    } catch (err) {
      setError(err instanceof Error ? err.message : "User update failed.");
    } finally {
      setWorking(null);
    }
  }

  async function saveAppConfig() {
    try {
      setWorking("config");
      const result = await callAdminOps<{ config: AppRuntimeConfig }>({
        action: "updateAppConfig",
        latestVersion,
        updateRequired,
        updateMessage,
      });
      setConfig(result.config);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Version update failed.");
    } finally {
      setWorking(null);
    }
  }

  async function forceSignOutAll() {
    if (!window.confirm("Force all users to authenticate again?")) return;
    try {
      setWorking("force-logout");
      const result = await callAdminOps<{ config: AppRuntimeConfig }>({ action: "forceSignOutAll" });
      setConfig(result.config);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Force sign-out failed.");
    } finally {
      setWorking(null);
    }
  }

  async function updateFeedbackStatus(id: string, status: FeedbackStatus) {
    try {
      setWorking(id);
      const result = await callAdminOps<{ feedback: FeedbackItem }>({ action: "updateFeedback", id, status });
      setFeedback((current) => current.map((item) => item.id === id ? result.feedback : item));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Feedback update failed.");
    } finally {
      setWorking(null);
    }
  }

  async function deleteFeedback(id: string) {
    if (!window.confirm("Delete this feedback item?")) return;
    try {
      setWorking(id);
      await callAdminOps({ action: "deleteFeedback", id });
      setFeedback((current) => current.filter((item) => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Feedback delete failed.");
    } finally {
      setWorking(null);
    }
  }

  async function addAdmin() {
    if (!newAdminEmail.trim()) return;
    try {
      setWorking("admin");
      await callAdminOps({ action: "addAdminByEmail", email: newAdminEmail });
      setNewAdminEmail("");
      await loadAdmin();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Admin invite failed.");
    } finally {
      setWorking(null);
    }
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <p className="text-sm text-muted-foreground">Loading admin ops...</p>
      </div>
    );
  }

  if (error && !overview) {
    return (
      <div className="max-w-lg mx-auto px-4 py-10">
        <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
          <Shield className="h-8 w-8 text-muted-foreground" />
          <h1 className="text-xl font-bold">Admin access unavailable</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button type="button" onClick={loadAdmin}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 space-y-6">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">Internal</p>
          <h1 className="text-2xl font-bold">Admin Ops</h1>
          <p className="text-sm text-muted-foreground">Users, feedback, access control, and app version control.</p>
        </div>
        <Button type="button" variant="outline" onClick={loadAdmin}>
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh
        </Button>
      </header>

      {error && (
        <div className="rounded-xl border border-destructive/25 bg-destructive/10 text-destructive px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Users", value: overview?.totals.users ?? 0, icon: Users },
          { label: "Blocked", value: overview?.totals.blockedUsers ?? 0, icon: AlertTriangle },
          { label: "Feedback", value: feedback.length, icon: Inbox },
          { label: "Admins", value: overview?.totals.admins ?? 0, icon: Shield },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-bold mt-3">{value}</p>
          </div>
        ))}
      </section>

      <section className="grid lg:grid-cols-[1.2fr_0.8fr] gap-4">
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">User Management</h2>
              <p className="text-xs text-muted-foreground">Block/unblock accounts. Delete is soft-delete pending only.</p>
            </div>
          </div>
          <div className="space-y-2">
            {(overview?.users ?? []).map((user) => (
              <div key={user.id} className="rounded-xl border border-border bg-background/40 p-3 space-y-3">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{user.email || user.id}</p>
                    <p className="text-xs text-muted-foreground">
                      Created {formatDateTime(user.createdAt)} · Last login {formatDateTime(user.lastSignInAt)}
                    </p>
                  </div>
                  <span className={`w-fit rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${statusTone(user.status)}`}>
                    {user.status.replace("_", " ")}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                  <Metric label="Weeks" value={user.totalWeeks} />
                  <Metric label="Shifts" value={user.totalShiftBlocks} />
                  <Metric label="Active Days" value={user.activeDays} />
                  <Metric label="Last Entry" value={user.lastEntryDate || "—"} />
                  <Metric label="Activity" value={formatDateTime(user.lastActivityAt)} />
                </div>
                <div className="flex flex-wrap gap-2">
                  {user.status === "blocked" || user.status === "deleted_pending" ? (
                    <Button type="button" size="sm" variant="outline" disabled={working === user.id} onClick={() => setUserStatus(user.id, "active")}>
                      Unblock
                    </Button>
                  ) : (
                    <Button type="button" size="sm" variant="outline" disabled={working === user.id} onClick={() => setUserStatus(user.id, "blocked")}>
                      Block
                    </Button>
                  )}
                  <Button type="button" size="sm" variant="destructive" disabled={working === user.id} onClick={() => setUserStatus(user.id, "deleted_pending")}>
                    Delete Pending
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <h2 className="text-lg font-bold">App Version Control</h2>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Latest version</label>
              <Input value={latestVersion} onChange={(event) => setLatestVersion(event.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Update message</label>
              <Textarea value={updateMessage} onChange={(event) => setUpdateMessage(event.target.value)} />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2">
              <span className="text-sm font-medium">Required update</span>
              <button
                type="button"
                onClick={() => setUpdateRequired((v) => !v)}
                className={`rounded-full px-3 py-1 text-xs font-bold ${updateRequired ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
              >
                {updateRequired ? "Required" : "Optional"}
              </button>
            </div>
            <div className="flex gap-2">
              <Button type="button" className="flex-1" disabled={working === "config"} onClick={saveAppConfig}>
                Save Version
              </Button>
              <Button type="button" variant="outline" className="flex-1" disabled={working === "force-logout"} onClick={forceSignOutAll}>
                Force Sign Out
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Client v{CURRENT_VERSION} · Forced logout after {formatDateTime(config?.forced_logout_after)}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <h2 className="text-lg font-bold">Admins</h2>
            <div className="flex gap-2">
              <Input value={newAdminEmail} onChange={(event) => setNewAdminEmail(event.target.value)} placeholder="email@example.com" />
              <Button type="button" disabled={working === "admin"} onClick={addAdmin}>
                <UserPlus className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2">
              {(overview?.admins ?? []).map((admin) => (
                <div key={admin.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                  <span className="truncate">{admin.email}</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{admin.role}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Feedback Inbox</h2>
            <p className="text-xs text-muted-foreground">Review suggestions, bug reports, and general notes.</p>
          </div>
          <div className="flex gap-2">
            <Select value={feedbackType} onValueChange={(value) => setFeedbackType(value as FeedbackType | "all")}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="suggestion">Suggestions</SelectItem>
                <SelectItem value="bug">Bugs</SelectItem>
                <SelectItem value="general">General</SelectItem>
              </SelectContent>
            </Select>
            <Select value={feedbackStatus} onValueChange={(value) => setFeedbackStatus(value as FeedbackStatus | "all")}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="planned">Planned</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="dismissed">Dismissed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          {filteredFeedback.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No feedback items in this view.
            </div>
          ) : filteredFeedback.map((item) => (
            <div key={item.id} className="rounded-xl border border-border bg-background/40 p-3 space-y-3">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold flex items-center gap-2">
                    {item.type === "bug" ? <Bug className="h-4 w-4 text-destructive" /> : <Inbox className="h-4 w-4 text-primary" />}
                    {item.type.replace("_", " ")}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {item.user_email || item.user_id || "Unknown user"} · {formatDateTime(item.created_at)}
                  </p>
                </div>
                <span className={`w-fit rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${feedbackTone(item.status)}`}>
                  {item.status}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{item.message}</p>
              <div className="flex flex-wrap gap-2">
                {(["reviewed", "planned", "resolved", "dismissed"] as FeedbackStatus[]).map((status) => (
                  <Button
                    key={status}
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={working === item.id || item.status === status}
                    onClick={() => updateFeedbackStatus(item.id, status)}
                  >
                    {status === "resolved" && <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
                    {status === "reviewed" && <Clock className="h-3.5 w-3.5 mr-1" />}
                    {status}
                  </Button>
                ))}
                <Button type="button" size="sm" variant="destructive" disabled={working === item.id} onClick={() => deleteFeedback(item.id)}>
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-card px-2.5 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-semibold truncate">{value}</p>
    </div>
  );
}
