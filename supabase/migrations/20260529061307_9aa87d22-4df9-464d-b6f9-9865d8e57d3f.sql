CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  model TEXT NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('RECENT', 'ALL_TIME', 'SEASONAL')),
  prompt_preview TEXT,
  status TEXT NOT NULL CHECK (status IN ('success', 'error')),
  error_type TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  total_tokens INTEGER,
  estimated_input_tokens INTEGER,
  estimated_output_tokens INTEGER,
  estimated_total_tokens INTEGER,
  estimated_cost_usd NUMERIC(12, 8),
  latency_ms INTEGER,
  used_streaming BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

GRANT SELECT, INSERT ON public.ai_usage_logs TO authenticated;
GRANT ALL ON public.ai_usage_logs TO service_role;

ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own AI usage logs" ON public.ai_usage_logs;
CREATE POLICY "Users can view their own AI usage logs"
ON public.ai_usage_logs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own AI usage logs" ON public.ai_usage_logs;
CREATE POLICY "Users can insert their own AI usage logs"
ON public.ai_usage_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS ai_usage_logs_user_created_idx
ON public.ai_usage_logs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ai_usage_logs_user_scope_idx
ON public.ai_usage_logs (user_id, scope);