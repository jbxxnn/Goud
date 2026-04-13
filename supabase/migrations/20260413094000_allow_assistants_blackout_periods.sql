-- Allow assistants to manage blackout periods.
-- The shifts domain already treats assistants as operational admins for most
-- scheduling actions, so blackout-period management should match that model.

DROP POLICY IF EXISTS "Allow all for admins on blackout_periods" ON public.blackout_periods;

CREATE POLICY "Allow all for admins and assistants on blackout_periods"
ON public.blackout_periods
FOR ALL
USING (is_admin_or_assistant())
WITH CHECK (is_admin_or_assistant());
