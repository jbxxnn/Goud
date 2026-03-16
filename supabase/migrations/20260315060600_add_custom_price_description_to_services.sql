-- Add custom_price_description column to services table
ALTER TABLE services ADD COLUMN IF NOT EXISTS custom_price_description text;
