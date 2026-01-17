-- Add internal_notes column to bookings table
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS internal_notes text;
