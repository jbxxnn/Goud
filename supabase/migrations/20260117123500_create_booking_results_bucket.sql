-- Create the bucket for booking results if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'booking-results', 
    'booking-results', 
    false, -- Private bucket (requires signed URLs or RLS)
    52428800, -- 50MB limit per file
    ARRAY['image/*', 'video/*']
)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 1. Policy: Staff and Admins have FULL access (Upload, Delete, View)
-- Checks the public.users table for role
CREATE POLICY "Staff and Admin full access on booking-results"
ON storage.objects FOR ALL
TO authenticated
USING (
    bucket_id = 'booking-results' 
    AND EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('staff', 'admin')
    )
);

-- 2. Policy: Clients can VIEW/DOWNLOAD files for their own bookings
-- Matches the first folder name (booking_id) to the user's booking
CREATE POLICY "Clients view own booking files"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'booking-results'
    AND (
        -- The path is structure as: booking_id/filename.ext
        -- (storage.foldername(name))[1] gets the first part (booking_id)
        (storage.foldername(name))[1] IN (
            SELECT id::uuid::text FROM public.bookings
            WHERE client_id = auth.uid() OR created_by = auth.uid()
        )
    )
);
