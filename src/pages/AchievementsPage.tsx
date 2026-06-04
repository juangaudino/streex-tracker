import { useOutletContext } from "react-router-dom";
import { useAchievements } from "@/hooks/useAchievements";
import AchievementCard from "@/components/AchievementCard";
import { CATEGORY_LABELS } from "@/lib/achievements";
import { Trophy } from "lucide-react";
import type { StoreContext } from "./types";

export default function AchievementsPage() {
  const { user, weeks } = useOutletContext<StoreContext>();
  const { achievements, loading } = useAchievements(user, weeks);

  const unlocked = achievements.filter(a => a.unlocked).length;
  const categories = ["earnings", "consistency", "highday", "goals", "special"] as const;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="text-primary animate-pulse font-bold">Loading...</span>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Trophy className="h-6 w-6 text-gold" />
        <div>
          <h1 className="text-2xl font-bold">Achievements</h1>
          <p className="text-sm text-muted-foreground">
            {unlocked} of {achievements.length} unlocked
          </p>
        </div>
      </div>

      {/* Overall progress */}
      <div className="bg-card rounded-xl border border-border p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Overall Progress</span>
          <span className="font-mono font-bold">
            {achievements.length > 0 ? Math.round((unlocked / achievements.length) * 100) : 0}%
          </span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gold rounded-full transition-all duration-500"
            style={{ width: `${achievements.length > 0 ? (unlocked / achievements.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {categories.map(cat => {
        const items = achievements.filter(a => a.category === cat);
        if (items.length === 0) return null;
        const catUnlocked = items.filter(a => a.unlocked).length;
        return (
          <div key={cat} className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">{CATEGORY_LABELS[cat]}</h2>
              <span className="text-xs text-muted-foreground">
                {catUnlocked}/{items.length}
              </span>
            </div>
            <div className="grid gap-2">
              {items.map(a => (
                <AchievementCard key={a.id} achievement={a} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
