-- Allow assistants to create general assistant dashboard tasks.
-- The UI inserts directly into assistant_tasks from the authenticated client,
-- so RLS must explicitly permit assistant inserts.

DROP POLICY IF EXISTS "Allow insert for staff and admins" ON public.assistant_tasks;

CREATE POLICY "Allow insert for staff admins and assistants"
ON public.assistant_tasks
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'staff', 'assistant')
    )
);
