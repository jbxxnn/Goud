-- Add configurable twin surcharge columns to services table
ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS twin_price_eur_cents integer,
ADD COLUMN IF NOT EXISTS twin_duration_minutes integer;

-- Update comment for clarity
COMMENT ON COLUMN public.services.twin_price_eur_cents IS 'Optional custom price for twin bookings (in euro cents). If NULL, defaults to 2x base price.';
COMMENT ON COLUMN public.services.twin_duration_minutes IS 'Optional custom duration for twin bookings (in minutes). If NULL, defaults to 2x base duration.';
