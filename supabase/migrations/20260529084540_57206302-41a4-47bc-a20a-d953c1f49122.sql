CREATE TABLE IF NOT EXISTS public.xp_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_key TEXT NOT NULL,
  event_type TEXT NOT NULL,
  xp_category TEXT NOT NULL CHECK (xp_category IN ('consistency', 'performance')),
  xp_amount INTEGER NOT NULL CHECK (xp_amount > 0),
  source_week_id TEXT,
  source_date TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.xp_events TO authenticated;
GRANT ALL ON public.xp_events TO service_role;

ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own XP events" ON public.xp_events;
CREATE POLICY "Users can view their own XP events"
ON public.xp_events
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own XP events" ON public.xp_events;
CREATE POLICY "Users can insert their own XP events"
ON public.xp_events
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS xp_events_user_created_idx
ON public.xp_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS xp_events_user_category_idx
ON public.xp_events (user_id, xp_category);