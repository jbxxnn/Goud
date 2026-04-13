-- Allow assistants to manage shift service assignments.
-- Without this, assistant-created or assistant-edited shift exceptions can be
-- saved successfully while their service assignments fail under RLS.

DROP POLICY IF EXISTS "Allow all for admins on shift_services" ON public.shift_services;

CREATE POLICY "Allow all for admins and assistants on shift_services"
ON public.shift_services
FOR ALL
USING (is_admin_or_assistant())
WITH CHECK (is_admin_or_assistant());
