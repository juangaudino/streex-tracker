import { AchievementState } from "@/lib/achievements";
import AchievementCard from "./AchievementCard";
import { useNavigate } from "react-router-dom";
import { Trophy } from "lucide-react";

interface Props {
  achievements: AchievementState[];
}

export default function AchievementsPreview({ achievements }: Props) {
  const navigate = useNavigate();
  const unlocked = achievements.filter(a => a.unlocked);
  const locked = achievements.filter(a => !a.unlocked);

  // Show recently unlocked first, then closest to unlock
  const recentlyUnlocked = [...unlocked]
    .sort((a, b) => (b.unlockedAt || "").localeCompare(a.unlockedAt || ""))
    .slice(0, 2);

  const closestToUnlock = [...locked]
    .sort((a, b) => (b.max > 0 ? b.progress / b.max : 0) - (a.max > 0 ? a.progress / a.max : 0))
    .slice(0, 4 - recentlyUnlocked.length);

  const preview = [...recentlyUnlocked, ...closestToUnlock].slice(0, 4);

  if (preview.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-gold" />
          <h3 className="text-sm font-semibold">Achievements</h3>
          <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {unlocked.length}/{achievements.length}
          </span>
        </div>
        <button
          onClick={() => navigate("/achievements")}
          className="text-xs text-primary hover:underline"
        >
          View All
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {preview.map(a => (
          <AchievementCard key={a.id} achievement={a} compact />
        ))}
      </div>
    </div>
  );
}