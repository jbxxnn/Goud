-- Add custom_price_label column to services table
ALTER TABLE services ADD COLUMN IF NOT EXISTS custom_price_label text;
