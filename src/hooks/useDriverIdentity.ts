import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { WeekRecord } from "@/lib/types";
import {
  buildDriverIdentitySummary,
  buildXpEventsFromWeeks,
  type StoredXpEvent,
} from "@/lib/driverIdentity";

function dbToXpEvent(row: any): StoredXpEvent {
  return {
    id: row.id,
    eventKey: row.event_key,
    eventType: row.event_type,
    xpCategory: row.xp_category,
    xpAmount: Number(row.xp_amount),
    sourceWeekId: row.source_week_id ?? undefined,
    sourceDate: row.source_date ?? undefined,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  };
}

export function useDriverIdentity(user: User | null, weeks: WeekRecord[], openWeek: WeekRecord | null) {
  const [xpEvents, setXpEvents] = useState<StoredXpEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const candidateEvents = useMemo(() => buildXpEventsFromWeeks(weeks), [weeks]);

  useEffect(() => {
    let cancelled = false;

    async function syncXpEvents() {
      if (!user) {
        setXpEvents([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const rows = candidateEvents.map((event) => ({
        user_id: user.id,
        event_key: event.eventKey,
        event_type: event.eventType,
        xp_category: event.xpCategory,
        xp_amount: event.xpAmount,
        source_week_id: event.sourceWeekId ?? null,
        source_date: event.sourceDate ?? null,
        metadata: event.metadata,
      }));

      if (rows.length) {
        const { error } = await (supabase as any)
          .from("xp_events")
          .upsert(rows, { onConflict: "user_id,event_key", ignoreDuplicates: true });

        if (error) {
          console.error("XP sync failed:", error);
        }
      }

      const { data, error } = await (supabase as any)
        .from("xp_events")
        .select("*")
        .order("created_at", { ascending: true });

      if (!cancelled) {
        if (error) {
          console.error("XP load failed:", error);
          setXpEvents(candidateEvents);
        } else {
          setXpEvents((data ?? []).map(dbToXpEvent));
        }
        setLoading(false);
      }
    }

    syncXpEvents();
    return () => {
      cancelled = true;
    };
  }, [user, candidateEvents]);

  const summary = useMemo(
    () => buildDriverIdentitySummary(weeks, openWeek, xpEvents),
    [weeks, openWeek, xpEvents],
  );

  return { summary, xpEvents, loading };
}
