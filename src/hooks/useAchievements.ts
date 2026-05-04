import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ACHIEVEMENTS, AchievementState } from "@/lib/achievements";
import type { WeekRecord } from "@/lib/types";
import type { User } from "@supabase/supabase-js";

export function useAchievements(user: User | null, weeks: WeekRecord[]) {
  const [unlockedIds, setUnlockedIds] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);

  // Load unlocked from DB
  const reload = useCallback(async () => {
    if (!user) { setUnlockedIds(new Map()); setLoading(false); return; }
    const { data } = await supabase
      .from("user_achievements")
      .select("achievement_id, unlocked_at");
    const map = new Map<string, string>();
    if (data) data.forEach((r: any) => map.set(r.achievement_id, r.unlocked_at));
    setUnlockedIds(map);
    setLoading(false);
  }, [user]);

  useEffect(() => { reload(); }, [reload]);

  // Check and persist newly unlocked
  useEffect(() => {
    if (!user || loading || weeks.length === 0) return;
    const newlyUnlocked: string[] = [];
    for (const def of ACHIEVEMENTS) {
      if (unlockedIds.has(def.id)) continue;
      const { unlocked } = def.check(weeks);
      if (unlocked) newlyUnlocked.push(def.id);
    }
    if (newlyUnlocked.length === 0) return;
    const rows = newlyUnlocked.map(id => ({ user_id: user.id, achievement_id: id }));
    supabase.from("user_achievements").insert(rows).then(({ error }) => {
      if (!error) reload();
    });
  }, [user, weeks, loading, unlockedIds, reload]);

  const achievements: AchievementState[] = ACHIEVEMENTS.map(def => {
    const result = def.check(weeks);
    const dbUnlocked = unlockedIds.has(def.id);
    return {
      ...def,
      unlocked: dbUnlocked || result.unlocked,
      unlockedAt: unlockedIds.get(def.id) || null,
      progress: result.progress,
      max: result.max,
    };
  });

  return { achievements, loading };
}