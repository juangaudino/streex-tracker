import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CHANGELOG, CURRENT_VERSION, formatVersionLabel } from "@/lib/changelog";
import { Sparkles } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const tagStyle: Record<string, string> = {
  new: "bg-success/15 text-success border-success/30",
  feature: "bg-primary/15 text-primary border-primary/30",
  fix: "bg-warning/15 text-warning border-warning/30",
  polish: "bg-beast-purple/15 text-beast-purple border-beast-purple/30",
  balance: "bg-muted text-muted-foreground border-border",
};

export default function ChangelogDialog({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <div className="bg-gradient-to-br from-card via-card to-background p-6 max-h-[80vh] overflow-y-auto">
          <DialogHeader className="mb-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Devlog
            </p>
            <DialogTitle className="text-2xl font-bold tracking-tight">What's New</DialogTitle>
            <p className="text-xs text-muted-foreground">A living history of Streex updates.</p>
          </DialogHeader>

          <div className="space-y-5">
            {CHANGELOG.map((entry) => {
              const isLatest = entry.version === CURRENT_VERSION;
              return (
                <div key={entry.version} className="relative pl-4 border-l border-border/60">
                  <div className={`absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full ${isLatest ? "bg-primary ring-4 ring-primary/20" : "bg-muted-foreground/40"}`} />
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-bold">{formatVersionLabel(entry.version)}</span>
                    <span className="text-[10px] text-muted-foreground">{entry.date}</span>
                    {isLatest && (
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-success/15 text-success border border-success/30">
                        Latest
                      </span>
                    )}
                    {entry.tags?.map((t) => (
                      <span
                        key={t}
                        className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${tagStyle[t] || tagStyle.balance}`}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                  <p className="text-sm font-semibold mt-1">{entry.title}</p>
                  <ul className="mt-2 space-y-1">
                    {entry.items.map((it, i) => (
                      <li key={i} className="text-xs text-muted-foreground leading-relaxed flex gap-2">
                        <span className="text-primary/60 shrink-0">•</span>
                        <span>{it}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
