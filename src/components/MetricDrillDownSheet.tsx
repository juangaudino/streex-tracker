import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  sections?: {
    title: string;
    rows: MetricDrillDownStat[];
  }[];
  notes?: string[];
  pages?: MetricDrillDownPage[];
}

export interface MetricDrillDownPage {
  id: string;
  label: string;
  detail: Omit<MetricDrillDownDetail, "pages">;
}

interface MetricDrillDownSheetProps {
  detail: MetricDrillDownDetail | null;
  onClose: () => void;
}

export default function MetricDrillDownSheet({ detail, onClose }: MetricDrillDownSheetProps) {
  const [activePageId, setActivePageId] = useState<string | null>(null);

  useEffect(() => {
    setActivePageId(detail?.pages?.[0]?.id ?? null);
  }, [detail]);

  if (!detail) return null;

  const pages = detail.pages ?? [];
  const activePage = pages.find((page) => page.id === activePageId) ?? pages[0];
  const visibleDetail = activePage?.detail ?? detail;

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
                {visibleDetail.eyebrow}
              </p>
              <h2 className="mt-1 text-lg font-bold">{visibleDetail.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{visibleDetail.summary}</p>
            </div>
            <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={onClose} aria-label="Close">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {pages.length > 1 && (
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-background/60 p-1">
              {pages.map((page) => (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => setActivePageId(page.id)}
                  className={cn(
                    "rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wider transition-colors",
                    page.id === activePage?.id
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  {page.label}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            {visibleDetail.stats.map((stat) => (
              <div key={`${stat.label}-${stat.value}`} className="rounded-xl border border-border bg-background/60 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{stat.label}</p>
                <p className="mt-1 text-base font-bold font-mono">{stat.value}</p>
                {stat.helper && <p className="mt-1 text-[11px] text-muted-foreground">{stat.helper}</p>}
              </div>
            ))}
          </div>

          {visibleDetail.sections?.map((section) => (
            <div key={section.title} className="rounded-xl border border-border bg-background/60 p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{section.title}</p>
              <div className="mt-2 space-y-2">
                {section.rows.map((row) => (
                  <div key={`${row.label}-${row.value}`} className="flex items-start justify-between gap-3 border-t border-border/70 pt-2 first:border-t-0 first:pt-0">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{row.label}</p>
                      {row.helper && <p className="text-xs text-muted-foreground">{row.helper}</p>}
                    </div>
                    <p className="shrink-0 text-sm font-bold font-mono">{row.value}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {visibleDetail.notes && visibleDetail.notes.length > 0 && (
            <div className="rounded-xl border border-border bg-muted/40 p-3 space-y-2">
              {visibleDetail.notes.map((note) => (
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
