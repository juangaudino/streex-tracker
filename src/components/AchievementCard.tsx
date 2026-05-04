import { AchievementState } from "@/lib/achievements";
import { cn } from "@/lib/utils";

interface Props {
  achievement: AchievementState;
  compact?: boolean;
}

export default function AchievementCard({ achievement: a, compact }: Props) {
  const pct = a.max > 0 ? (a.progress / a.max) * 100 : 0;

  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-all",
        a.unlocked
          ? "bg-card border-gold/30 shadow-[0_0_12px_-4px_hsl(var(--gold)/0.2)]"
          : "bg-card border-border opacity-70"
      )}
    >
      <div className="flex items-start gap-3">
        <span className={cn("text-2xl", compact && "text-xl")}>{a.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn("font-semibold text-sm", a.unlocked ? "text-gold" : "text-foreground")}>
              {a.title}
            </span>
            {a.unlocked && <span className="text-[10px] font-bold text-gold bg-gold/10 px-1.5 py-0.5 rounded-full">UNLOCKED</span>}
          </div>
          {!compact && (
            <p className="text-xs text-muted-foreground mt-0.5">{a.description}</p>
          )}
          {!a.unlocked && (
            <div className="mt-2 space-y-1">
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary/60 rounded-full transition-all"
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">
                {a.progress} / {a.max}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}