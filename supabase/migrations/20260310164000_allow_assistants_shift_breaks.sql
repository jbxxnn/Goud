-- Update RLS policies for shift_breaks and sitewide_breaks to allow 'assistant' role

-- Update sitewide_breaks policies
DROP POLICY IF EXISTS "Allow all access to sitewide_breaks for admins" ON public.sitewide_breaks;
CREATE POLICY "Allow all access to sitewide_breaks for admins and assistants"
ON public.sitewide_breaks FOR ALL
USING (is_admin_or_assistant());

-- Update shift_breaks policies
DROP POLICY IF EXISTS "Allow all access to shift_breaks for admins" ON public.shift_breaks;
CREATE POLICY "Allow all access to shift_breaks for admins and assistants"
ON public.shift_breaks FOR ALL
USING (is_admin_or_assistant());
