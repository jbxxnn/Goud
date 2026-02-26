-- Create assistant_tasks table for general non-booking tasks
CREATE TABLE IF NOT EXISTS public.assistant_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES public.users(id),
    assigned_to UUID REFERENCES public.users(id),
    due_date TIMESTAMPTZ,
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES public.users(id)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_assistant_tasks_is_completed ON public.assistant_tasks(is_completed);
CREATE INDEX IF NOT EXISTS idx_assistant_tasks_created_at ON public.assistant_tasks(created_at);

-- RLS Policies
ALTER TABLE public.assistant_tasks ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated staff, admins, and assistants to read tasks
CREATE POLICY "Allow read for staff and admins"
ON public.assistant_tasks
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'staff', 'assistant')
    )
);

-- Allow admins and staff to insert tasks
CREATE POLICY "Allow insert for staff and admins"
ON public.assistant_tasks
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'staff')
    )
);

-- Allow admins, staff, and assistants to update tasks (e.g., complete them)
CREATE POLICY "Allow update for staff and admins"
ON public.assistant_tasks
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'staff', 'assistant')
    )
);

-- Allow admins to delete tasks
CREATE POLICY "Allow delete for admins"
ON public.assistant_tasks
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
);
