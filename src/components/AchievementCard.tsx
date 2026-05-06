import { AchievementState } from "@/lib/achievements";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";

const RARITY_LABELS: Record<string, string> = {
  common: "Common",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
};

const RARITY_COLORS: Record<string, string> = {
  common: "text-blue-400",
  rare: "text-cyan-400",
  epic: "text-beast-purple",
  legendary: "text-gold",
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

  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-all",
        rarityClass,
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
            {isRpg && (
              <span className={cn("text-[9px] font-bold uppercase tracking-wider", RARITY_COLORS[rarity])}>
                {RARITY_LABELS[rarity]}
              </span>
            )}
          </div>
          {!compact && <p className="text-xs text-muted-foreground mt-0.5">{a.description}</p>}
          {a.unlocked && a.count > 0 && (
            <p className="text-[10px] text-muted-foreground mt-0.5">Achieved {a.count} time{a.count !== 1 ? "s" : ""}</p>
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