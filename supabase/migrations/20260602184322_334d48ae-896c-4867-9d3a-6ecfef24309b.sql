DROP POLICY IF EXISTS "Deny direct access to email_campaigns" ON public.email_campaigns;
CREATE POLICY "Deny direct access to email_campaigns"
ON public.email_campaigns
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS "Deny direct access to email_campaign_recipients" ON public.email_campaign_recipients;
CREATE POLICY "Deny direct access to email_campaign_recipients"
ON public.email_campaign_recipients
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);