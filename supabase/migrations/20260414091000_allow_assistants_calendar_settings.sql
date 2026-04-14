-- Allow assistants to read and update shared calendar settings.
-- The calendar settings UI is exposed to assistants on dashboard calendars, so
-- RLS and API checks need to match that behavior.

DROP POLICY IF EXISTS "Admins can read calendar settings" ON public.calendar_settings;
DROP POLICY IF EXISTS "Admins can update calendar settings" ON public.calendar_settings;

CREATE POLICY "Admins and assistants can read calendar settings"
ON public.calendar_settings
FOR SELECT
USING (is_admin_or_assistant());

CREATE POLICY "Admins and assistants can update calendar settings"
ON public.calendar_settings
FOR UPDATE
USING (is_admin_or_assistant())
WITH CHECK (is_admin_or_assistant());
