-- Create booking_tag_mappings table for many-to-many relationship
CREATE TABLE IF NOT EXISTS public.booking_tag_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES public.booking_tags(id) ON DELETE CASCADE,
    UNIQUE(booking_id, tag_id)
);

-- Enable RLS
ALTER TABLE public.booking_tag_mappings ENABLE ROW LEVEL SECURITY;

-- Policies for booking_tag_mappings
-- Administrators and Assistants can manage all mappings
CREATE POLICY "Admins and assistants can manage booking tag mappings"
    ON public.booking_tag_mappings
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
            AND (role = 'admin' OR role = 'assistant')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
            AND (role = 'admin' OR role = 'assistant')
        )
    );

-- Everyone authenticated can read mappings (to see tags on their own bookings, though usually filtered by app logic)
CREATE POLICY "Authenticated users can view booking tag mappings"
    ON public.booking_tag_mappings
    FOR SELECT
    TO authenticated
    USING (true);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_booking_tag_mappings_booking_id ON public.booking_tag_mappings(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_tag_mappings_tag_id ON public.booking_tag_mappings(tag_id);

-- Instructions for updating existing data if needed
-- (No existing data to migrate for this table)
