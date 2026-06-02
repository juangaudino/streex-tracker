import { Button } from "@/components/ui/button";

interface AppUpdateNoticeProps {
  latestVersion: string;
  message: string;
  required: boolean;
  onLater: () => void;
}

export default function AppUpdateNotice({
  latestVersion,
  message,
  required,
  onLater,
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
          <p className="text-xs text-muted-foreground">
            Latest version: v{latestVersion}
          </p>
        </div>
        <div className="flex gap-2">
          {!required && (
            <Button type="button" variant="outline" className="flex-1" onClick={onLater}>
              Later
            </Button>
          )}
          <Button type="button" className="flex-1" onClick={() => window.location.reload()}>
            Refresh App
          </Button>
        </div>
      </div>
    </div>
  );
}
