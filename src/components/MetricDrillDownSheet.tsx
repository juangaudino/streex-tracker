import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface MetricDrillDownStat {
  label: string;
  value: string;
  helper?: string;
}

export interface MetricDrillDownDetail {
  eyebrow: string;
  title: string;
  summary: string;
  stats: MetricDrillDownStat[];
  notes?: string[];
}

interface MetricDrillDownSheetProps {
  detail: MetricDrillDownDetail | null;
  onClose: () => void;
}

export default function MetricDrillDownSheet({ detail, onClose }: MetricDrillDownSheetProps) {
  if (!detail) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end bg-background/60 backdrop-blur-sm" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0"
        aria-label="Close metric details"
        onClick={onClose}
      />
      <section className="relative w-full rounded-t-2xl border border-border bg-card p-4 pb-[max(env(safe-area-inset-bottom),1rem)] shadow-2xl">
        <div className="mx-auto max-w-xl space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                {detail.eyebrow}
              </p>
              <h2 className="mt-1 text-lg font-bold">{detail.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{detail.summary}</p>
            </div>
            <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={onClose} aria-label="Close">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {detail.stats.map((stat) => (
                <div key={`${stat.label}-${stat.value}`} className="rounded-xl border border-border bg-background/60 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{stat.label}</p>
                <p className="mt-1 text-base font-bold font-mono">{stat.value}</p>
                {stat.helper && <p className="mt-1 text-[11px] text-muted-foreground">{stat.helper}</p>}
              </div>
            ))}
          </div>

          {detail.notes && detail.notes.length > 0 && (
            <div className="rounded-xl border border-border bg-muted/40 p-3 space-y-2">
              {detail.notes.map((note) => (
                <p key={note} className="text-sm leading-relaxed text-muted-foreground">
                  {note}
                </p>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
