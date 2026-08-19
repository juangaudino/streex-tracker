import { useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, ShieldCheck, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type { AppSettings, WeekRecord } from "@/lib/types";
import {
  historicalImportTemplateUrl,
  issueCounts,
  mergeHistoricalImport,
  parseHistoricalWorkbook,
  type HistoricalImportMergeResult,
  type HistoricalImportPreview,
} from "@/lib/historicalImport";

interface HistoricalImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weeks: WeekRecord[];
  settings: AppSettings;
  addWeek: (week: WeekRecord) => Promise<boolean>;
  updateWeek: (week: WeekRecord, attributionIntents?: never[], options?: { recordSnapshots?: boolean }) => Promise<boolean>;
  reload: () => void;
}

export default function HistoricalImportDialog({
  open,
  onOpenChange,
  weeks,
  settings,
  addWeek,
  updateWeek,
  reload,
}: HistoricalImportDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [fileName, setFileName] = useState<string>("");
  const [preview, setPreview] = useState<HistoricalImportPreview | null>(null);
  const [merge, setMerge] = useState<HistoricalImportMergeResult | null>(null);
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setFileName("");
    setPreview(null);
    setMerge(null);
    setReading(false);
    setSaving(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && !saving) reset();
    onOpenChange(nextOpen);
  };

  const handleFile = async (file?: File) => {
    if (!file) return;
    setFileName(file.name);
    setReading(true);
    setPreview(null);
    setMerge(null);
    try {
      const parsed = await parseHistoricalWorkbook(file, settings.defaultWeeklyGoal);
      const merged = mergeHistoricalImport(parsed, weeks, settings.defaultWeeklyGoal);
      setPreview(parsed);
      setMerge(merged);
    } catch (error) {
      toast({
        title: "Could not read this workbook.",
        description: error instanceof Error ? error.message : "Use the Streex template and try again.",
        variant: "destructive",
      });
    } finally {
      setReading(false);
    }
  };

  const handleConfirm = async () => {
    if (!preview || !merge) return;
    const counts = issueCounts(preview.issues);
    if (counts.errors || merge.conflicts.length || saving) return;
    setSaving(true);
    let saved = 0;
    let failed = false;
    try {
      for (const weekId of merge.newWeekIds) {
        const week = merge.weeks.find((candidate) => candidate.id === weekId);
        if (!week || !(await addWeek(week))) {
          failed = true;
          break;
        }
        saved += 1;
      }
      if (!failed) {
        for (const weekId of merge.changedWeekIds.filter((id) => !merge.newWeekIds.includes(id))) {
          const week = merge.weeks.find((candidate) => candidate.id === weekId);
          if (!week || !(await updateWeek(week, [], { recordSnapshots: false }))) {
            failed = true;
            break;
          }
          saved += 1;
        }
      }
      if (failed) {
        reload();
        reset();
        toast({
          title: "Import stopped before all weeks were saved.",
          description: saved ? `${saved} week${saved === 1 ? "" : "s"} saved. Reopen the file to retry the remaining batch.` : "No week was saved. Review sync status and try again.",
          variant: "destructive",
        });
        return;
      }
      reload();
      toast({
        title: saved ? "Historical data imported." : "No new data to import.",
        description: saved ? `${saved} week${saved === 1 ? "" : "s"} saved. Existing values were preserved.` : "The file matched data already in History.",
      });
      handleOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const counts = preview ? issueCounts(preview.issues) : { errors: 0, warnings: 0 };
  const blocked = counts.errors > 0 || Boolean(merge?.conflicts.length);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Import historical data
          </DialogTitle>
          <DialogDescription>
            Add older earnings, hours, miles, rides, shifts, pauses, and bonuses without creating historical snapshots.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3">
            <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
            <p className="min-w-0 flex-1 text-xs text-muted-foreground">
              Existing values are never overwritten automatically. Conflicts stop the import so you can correct the workbook first.
            </p>
            <Button asChild size="sm" variant="outline">
              <a href={historicalImportTemplateUrl()} download>
                <Download className="mr-1.5 h-3.5 w-3.5" /> Template
              </a>
            </Button>
          </div>

          <div className="rounded-xl border border-border p-4">
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.csv"
              className="sr-only"
              onChange={(event) => void handleFile(event.target.files?.[0])}
            />
            <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={reading || saving}>
              <Upload className="mr-2 h-4 w-4" />
              {reading ? "Reading workbook…" : "Choose Excel/CSV file"}
            </Button>
            {fileName && <span className="ml-2 text-xs text-muted-foreground">{fileName}</span>}
            <p className="mt-2 text-[11px] text-muted-foreground">Blank means unknown. Use 0 only when zero is known. The importer accepts the template’s Daily Earnings, Optional Shifts, Pauses, and Bonuses sheets.</p>
          </div>

          {preview && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  ["Days", preview.stats.days],
                  ["Weeks", preview.stats.weeks],
                  ["Shifts", preview.stats.shifts],
                  ["Bonuses", preview.stats.bonuses],
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-lg border border-border bg-card p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
                    <p className="mt-1 font-mono text-lg font-bold">{value}</p>
                  </div>
                ))}
              </div>

              <div className={`rounded-xl border p-3 ${blocked ? "border-destructive/30 bg-destructive/5" : "border-success/30 bg-success/5"}`}>
                <div className="flex items-start gap-2">
                  {blocked ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">{blocked ? "Review required before saving" : "Preview is ready"}</p>
                    <p className="text-xs text-muted-foreground">
                      {counts.errors} error{counts.errors === 1 ? "" : "s"} · {counts.warnings} warning{counts.warnings === 1 ? "" : "s"} · {merge?.newWeekIds.length ?? 0} new week{merge?.newWeekIds.length === 1 ? "" : "s"} · {merge?.changedWeekIds.length ?? 0} week{merge?.changedWeekIds.length === 1 ? "" : "s"} with changes
                    </p>
                  </div>
                </div>
              </div>

              {preview.issues.length > 0 && (
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-border p-3">
                  {preview.issues.slice(0, 40).map((issue, index) => (
                    <p key={`${issue.code}-${issue.row}-${index}`} className={`text-xs ${issue.severity === "error" ? "text-destructive" : "text-warning"}`}>
                      <span className="font-semibold">{issue.severity === "error" ? "Error" : "Warning"}</span> · {issue.date ? `${issue.date} · ` : ""}{issue.message}
                    </p>
                  ))}
                  {preview.issues.length > 40 && <p className="text-xs text-muted-foreground">Showing the first 40 issues.</p>}
                </div>
              )}

              {(merge?.conflicts.length ?? 0) > 0 && (
                <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-destructive/30 bg-destructive/5 p-3">
                  <p className="text-xs font-bold text-destructive">Existing data conflicts</p>
                  {merge?.conflicts.slice(0, 30).map((conflict, index) => (
                    <p key={`${conflict.weekId}-${conflict.field}-${index}`} className="text-xs text-destructive">
                      {conflict.date ? `${conflict.date} · ` : ""}{conflict.message}
                    </p>
                  ))}
                </div>
              )}

              <p className="text-[11px] text-muted-foreground">
                Imported hours with real shift boundaries can contribute to efficiency. Day-only hours remain day-level evidence; no fake snapshots or hourly observations are generated.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button type="button" onClick={() => void handleConfirm()} disabled={!preview || !merge || blocked || saving || reading}>
              {saving ? "Saving…" : "Review passed — import"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
