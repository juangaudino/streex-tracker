DROP POLICY IF EXISTS "Users can view their own admin record" ON public.admin_users;
CREATE POLICY "Users can view their own admin record"
ON public.admin_users
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR lower(email) = lower(coalesce((auth.jwt() ->> 'email'), '')));