CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('owner', 'admin')),
  enabled BOOLEAN NOT NULL DEFAULT true,
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS admin_users_email_lower_idx
ON public.admin_users (lower(email));

CREATE UNIQUE INDEX IF NOT EXISTS admin_users_user_id_idx
ON public.admin_users (user_id)
WHERE user_id IS NOT NULL;

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.admin_users TO authenticated;
GRANT ALL ON public.admin_users TO service_role;

UPDATE public.admin_users
SET role = 'owner',
    enabled = true,
    updated_at = now()
WHERE lower(email) = 'juangaudino@gmail.com';

INSERT INTO public.admin_users (email, role, enabled)
SELECT 'juangaudino@gmail.com', 'owner', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.admin_users WHERE lower(email) = 'juangaudino@gmail.com'
);

CREATE TABLE IF NOT EXISTS public.account_access_controls (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'blocked' CHECK (status IN ('active', 'blocked', 'deleted_pending')),
  blocked_at TIMESTAMP WITH TIME ZONE,
  blocked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  unblocked_at TIMESTAMP WITH TIME ZONE,
  unblocked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  delete_requested_at TIMESTAMP WITH TIME ZONE,
  delete_requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  internal_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.account_access_controls ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.account_access_controls TO authenticated;
GRANT ALL ON public.account_access_controls TO service_role;

DROP POLICY IF EXISTS "Users can view their own account access status" ON public.account_access_controls;
CREATE POLICY "Users can view their own account access status"
ON public.account_access_controls
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.feedback_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  type TEXT NOT NULL CHECK (type IN ('suggestion', 'bug', 'general')),
  message TEXT NOT NULL CHECK (char_length(trim(message)) > 0),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'planned', 'resolved', 'dismissed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback_items ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON public.feedback_items TO authenticated;
GRANT ALL ON public.feedback_items TO service_role;

DROP POLICY IF EXISTS "Users can create their own feedback" ON public.feedback_items;
CREATE POLICY "Users can create their own feedback"
ON public.feedback_items
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own feedback" ON public.feedback_items;
CREATE POLICY "Users can view their own feedback"
ON public.feedback_items
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS feedback_items_status_created_idx
ON public.feedback_items (status, created_at DESC);

CREATE INDEX IF NOT EXISTS feedback_items_type_created_idx
ON public.feedback_items (type, created_at DESC);

CREATE TABLE IF NOT EXISTS public.app_runtime_config (
  singleton BOOLEAN NOT NULL DEFAULT true PRIMARY KEY CHECK (singleton),
  latest_version TEXT NOT NULL DEFAULT '5.7.2',
  update_required BOOLEAN NOT NULL DEFAULT false,
  update_message TEXT NOT NULL DEFAULT 'A new Streex update is available. Refresh to get the latest version.',
  forced_logout_after TIMESTAMP WITH TIME ZONE,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.app_runtime_config ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.app_runtime_config TO authenticated;
GRANT ALL ON public.app_runtime_config TO service_role;

DROP POLICY IF EXISTS "Authenticated users can view app runtime config" ON public.app_runtime_config;
CREATE POLICY "Authenticated users can view app runtime config"
ON public.app_runtime_config
FOR SELECT
TO authenticated
USING (true);

INSERT INTO public.app_runtime_config (singleton, latest_version, update_required, update_message)
VALUES (true, '5.7.2', false, 'A new Streex update is available. Refresh to get the latest version.')
ON CONFLICT (singleton) DO NOTHING;