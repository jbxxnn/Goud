-- Migration to create booking_tags table and setup RLS
-- Step: Create booking_tags table

CREATE TABLE IF NOT EXISTS public.booking_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    color TEXT NOT NULL DEFAULT '#3b82f6', -- Default blue-500
    is_active BOOLEAN DEFAULT true NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.booking_tags ENABLE ROW LEVEL SECURITY;

-- 1. Allow everyone to SELECT (read-only for most, but helps frontend display tags)
-- Since tags are public metadata for bookings, this is generally safe.
-- However, we only WANT staff/admins/assistants to see them in full.
-- For now, let's stick to is_admin_or_assistant() for management and simple read for authenticated users if needed.

DROP POLICY IF EXISTS "Allow all for admins and assistants on booking_tags" ON public.booking_tags;
CREATE POLICY "Allow all for admins and assistants on booking_tags"
ON public.booking_tags FOR ALL
USING (is_admin_or_assistant());

DROP POLICY IF EXISTS "Allow read for authenticated users on booking_tags" ON public.booking_tags;
CREATE POLICY "Allow read for authenticated users on booking_tags"
ON public.booking_tags FOR SELECT
TO authenticated
USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_booking_tags_title ON public.booking_tags(title);
