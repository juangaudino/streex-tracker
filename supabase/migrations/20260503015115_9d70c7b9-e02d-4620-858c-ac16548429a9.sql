
CREATE TABLE public.weeks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  weekly_goal NUMERIC NOT NULL DEFAULT 1200,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  entries JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.weeks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own weeks"
  ON public.weeks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own weeks"
  ON public.weeks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own weeks"
  ON public.weeks FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own weeks"
  ON public.weeks FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE public.user_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  default_weekly_goal NUMERIC NOT NULL DEFAULT 1200,
  currency_symbol TEXT NOT NULL DEFAULT '$',
  active_apps JSONB NOT NULL DEFAULT '["Uber","Lyft","Spark Driver","DoorDash","Amazon Flex","Instacart","Shipt"]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own settings"
  ON public.user_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
  ON public.user_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON public.user_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
