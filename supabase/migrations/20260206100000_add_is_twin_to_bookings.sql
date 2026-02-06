-- Add is_twin column to bookings table
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS is_twin boolean NOT NULL DEFAULT false;
