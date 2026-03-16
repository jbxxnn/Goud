-- Create a sequence for booking numbers starting at 3000
CREATE SEQUENCE IF NOT EXISTS booking_number_seq START 3000;

-- Add booking_number column to bookings table
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS booking_number INT8 UNIQUE;

-- Set default value for new rows
ALTER TABLE public.bookings ALTER COLUMN booking_number SET DEFAULT nextval('booking_number_seq');

-- Backfill existing bookings
-- Order by created_at to maintain some chronological sense if possible
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.bookings WHERE booking_number IS NULL) THEN
        UPDATE public.bookings 
        SET booking_number = nextval('booking_number_seq') 
        WHERE booking_number IS NULL;
    END IF;
END $$;
