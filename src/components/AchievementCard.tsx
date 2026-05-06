import { AchievementState } from "@/lib/achievements";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";

const RARITY_LABELS: Record<string, string> = {
  common: "Common",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
  mythic: "Mythic",
};

const RARITY_COLORS: Record<string, string> = {
  common: "text-blue-400",
  rare: "text-cyan-400",
  epic: "text-beast-purple",
  legendary: "text-gold",
  mythic: "text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-violet-400 to-cyan-400",
};

interface Props {
  achievement: AchievementState;
  compact?: boolean;
}

export default function AchievementCard({ achievement: a, compact }: Props) {
  const pct = a.max > 0 ? (a.progress / a.max) * 100 : 0;
  const { mode } = useTheme();
  const isRpg = mode === "rpg";
  const rarity = a.rarity || "common";
  const rarityClass = isRpg ? `achievement-${rarity}` : "";
  const remaining = a.max - a.progress;

  const progressLabel = !a.unlocked && a.max > 0
    ? pct >= 75 ? "Almost there!"
    : pct >= 50 ? "Over halfway!"
    : pct >= 25 ? "Making progress"
    : "Just getting started"
    : "";

  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-all duration-200",
        rarityClass,
        a.unlocked
          ? rarity === "mythic"
            ? "bg-card border-rose-400/30 shadow-[0_0_20px_-4px_rgba(244,114,182,0.3)]"
            : "bg-card border-gold/30 shadow-[0_0_12px_-4px_hsl(var(--gold)/0.2)]"
          : "bg-card border-border opacity-80 hover:opacity-95 hover:border-muted-foreground/30"
      )}
    >
      <div className="flex items-start gap-3">
        <span className={cn(
          "text-2xl transition-transform duration-200",
          compact && "text-xl",
          a.unlocked && "scale-110",
        )}>{a.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn(
              "font-semibold text-sm",
              a.unlocked
                ? rarity === "mythic" ? "text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-violet-400 to-cyan-400" : "text-gold"
                : "text-foreground"
            )}>
              {a.title}
            </span>
            {a.unlocked && (
              <span className={cn(
                "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                rarity === "mythic"
                  ? "text-rose-300 bg-rose-500/15"
                  : "text-gold bg-gold/10"
              )}>UNLOCKED</span>
            )}
            {isRpg && (
              <span className={cn("text-[9px] font-bold uppercase tracking-wider", RARITY_COLORS[rarity])}>
                {RARITY_LABELS[rarity]}
              </span>
            )}
          </div>
          {!compact && <p className="text-xs text-muted-foreground mt-0.5">{a.description}</p>}
          {a.unlocked && a.repeatable && a.count > 0 && (
            <p className="text-[10px] text-muted-foreground mt-0.5">Achieved {a.count} time{a.count !== 1 ? "s" : ""}</p>
          )}
          {a.unlocked && !a.repeatable && (a.firstDate || a.firstRange) && (
            <p className="text-[10px] text-muted-foreground mt-0.5">Unlocked {a.firstRange || a.firstDate}</p>
          )}
          {!a.unlocked && (
            <div className="mt-2 space-y-1">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    pct >= 75 ? "bg-success" : pct >= 50 ? "bg-primary" : pct >= 25 ? "bg-warning/70" : "bg-muted-foreground/40",
                  )}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-muted-foreground">
                  {Math.round(pct)}% · {remaining > 0 ? `${remaining} remaining` : ""}
                </span>
                {!compact && progressLabel && (
                  <span className={cn(
                    "text-[9px] font-medium",
                    pct >= 75 ? "text-success" : pct >= 50 ? "text-primary" : "text-muted-foreground",
                  )}>
                    {progressLabel}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}