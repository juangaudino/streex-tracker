import { Button } from "@/components/ui/button";
import { lifecycleDebug } from "@/lib/appLifecycle";

interface AppUpdateNoticeProps {
  latestVersion: string;
  message: string;
  required: boolean;
  onLater: () => void;
  onSignOut?: () => void;
}

export default function AppUpdateNotice({
  latestVersion,
  message,
  required,
  onLater,
  onSignOut,
}: AppUpdateNoticeProps) {
  return (
    <div className="fixed inset-0 z-[80] bg-background/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl p-5 space-y-4">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">
            Streex Update
          </p>
          <h2 className="text-xl font-bold text-foreground">New version available</h2>
          <p className="text-sm text-muted-foreground">
            {message}
          </p>
          {required && (
            <p className="text-xs text-muted-foreground">
              This update is required before continuing. If refreshing keeps showing this message, the latest build may not be published yet.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Latest version: v{latestVersion}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          {!required && (
            <Button type="button" variant="outline" className="flex-1" onClick={onLater}>
              Later
            </Button>
          )}
          <Button
            type="button"
            className="flex-1"
            onClick={() => {
              lifecycleDebug("forced reload", { reason: "user selected Refresh App", latestVersion });
              window.location.reload();
            }}
          >
            Refresh App
          </Button>
          {required && onSignOut && (
            <Button type="button" variant="outline" className="flex-1" onClick={onSignOut}>
              Sign Out
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
