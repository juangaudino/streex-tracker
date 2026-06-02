CREATE TABLE IF NOT EXISTS public.email_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  marketing_opt_out BOOLEAN NOT NULL DEFAULT false,
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  unsubscribe_token UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS email_preferences_email_lower_idx
ON public.email_preferences (lower(user_email));

CREATE UNIQUE INDEX IF NOT EXISTS email_preferences_user_id_idx
ON public.email_preferences (user_id)
WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS email_preferences_unsubscribe_token_idx
ON public.email_preferences (unsubscribe_token);

ALTER TABLE public.email_preferences ENABLE ROW LEVEL SECURITY;

GRANT SELECT, UPDATE ON public.email_preferences TO authenticated;
GRANT ALL ON public.email_preferences TO service_role;

DROP POLICY IF EXISTS "Users can view their own email preferences" ON public.email_preferences;
CREATE POLICY "Users can view their own email preferences"
ON public.email_preferences
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own email preferences" ON public.email_preferences;
CREATE POLICY "Users can update their own email preferences"
ON public.email_preferences
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  audience TEXT NOT NULL CHECK (audience IN ('test', 'specific', 'inactive', 'all_active')),
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  app_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sending', 'sent', 'failed')),
  requested_count INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.email_campaigns TO service_role;

CREATE INDEX IF NOT EXISTS email_campaigns_created_idx
ON public.email_campaigns (created_at DESC);

CREATE TABLE IF NOT EXISTS public.email_campaign_recipients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES public.email_campaigns(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  resend_email_id TEXT,
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.email_campaign_recipients ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.email_campaign_recipients TO service_role;

CREATE INDEX IF NOT EXISTS email_campaign_recipients_campaign_idx
ON public.email_campaign_recipients (campaign_id, status);

CREATE INDEX IF NOT EXISTS email_campaign_recipients_email_idx
ON public.email_campaign_recipients (lower(user_email));