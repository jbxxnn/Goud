-- Rename twin_price_eur_cents to twin_price and change type to numeric
-- to be consistent with the base price column and fix the 0.99 vs 99 issue.
ALTER TABLE public.services 
RENAME COLUMN twin_price_eur_cents TO twin_price;

ALTER TABLE public.services 
ALTER COLUMN twin_price TYPE numeric USING twin_price::numeric;

-- Update comment
COMMENT ON COLUMN public.services.twin_price IS 'Optional custom price for twin bookings (in Euros). If NULL, defaults to 2x base price.';
