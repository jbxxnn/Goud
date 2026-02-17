-- Create booking_checklist_items table
CREATE TABLE IF NOT EXISTS public.booking_checklist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_by UUID REFERENCES auth.users(id),
    completed_at TIMESTAMPTZ,
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Index for faster queries
CREATE INDEX idx_booking_checklist_items_booking_id ON public.booking_checklist_items(booking_id);

-- RLS Policies
ALTER TABLE public.booking_checklist_items ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users (staff/admins)
CREATE POLICY "Allow read for authenticated users"
ON public.booking_checklist_items
FOR SELECT
TO authenticated
USING (true);

-- Allow insert access to authenticated users
CREATE POLICY "Allow insert for authenticated users"
ON public.booking_checklist_items
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow update access to authenticated users
CREATE POLICY "Allow update for authenticated users"
ON public.booking_checklist_items
FOR UPDATE
TO authenticated
USING (true);

-- Allow delete access to authenticated users
CREATE POLICY "Allow delete for authenticated users"
ON public.booking_checklist_items
FOR DELETE
TO authenticated
USING (true);
