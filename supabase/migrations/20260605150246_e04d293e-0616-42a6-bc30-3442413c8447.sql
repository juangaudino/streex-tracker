CREATE TABLE IF NOT EXISTS public.earnings_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_id uuid NOT NULL REFERENCES public.weeks(id) ON DELETE CASCADE,
  day_date date NOT NULL,
  app text NOT NULL,
  previous_amount numeric NOT NULL DEFAULT 0,
  new_amount numeric NOT NULL DEFAULT 0,
  delta numeric NOT NULL DEFAULT 0,
  shift_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.earnings_snapshots TO authenticated;
GRANT ALL ON public.earnings_snapshots TO service_role;

ALTER TABLE public.earnings_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own earnings snapshots" ON public.earnings_snapshots;
CREATE POLICY "Users can view their own earnings snapshots"
ON public.earnings_snapshots
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own earnings snapshots" ON public.earnings_snapshots;
CREATE POLICY "Users can insert their own earnings snapshots"
ON public.earnings_snapshots
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own earnings snapshots" ON public.earnings_snapshots;
CREATE POLICY "Users can delete their own earnings snapshots"
ON public.earnings_snapshots
FOR DELETE
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS earnings_snapshots_user_created_idx
ON public.earnings_snapshots (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS earnings_snapshots_user_day_idx
ON public.earnings_snapshots (user_id, day_date, app, created_at);

CREATE INDEX IF NOT EXISTS earnings_snapshots_week_idx
ON public.earnings_snapshots (week_id);