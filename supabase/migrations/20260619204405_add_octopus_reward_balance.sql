ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS octopus_points NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS octopus_updated_at TIMESTAMPTZ;

ALTER TABLE public.user_settings
  DROP CONSTRAINT IF EXISTS user_settings_octopus_points_nonnegative;

ALTER TABLE public.user_settings
  ADD CONSTRAINT user_settings_octopus_points_nonnegative
  CHECK (octopus_points >= 0);
