-- Add color column to locations table
-- This migration adds a color field to store location colors

ALTER TABLE locations 
ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#3b82f6';

-- Add a comment to explain the color format (hex color)
COMMENT ON COLUMN locations.color IS 'Hex color code (e.g., #3b82f6) for visual identification of the location';

-- Update existing locations to have a default color if they don't have one
UPDATE locations 
SET color = '#3b82f6' 
WHERE color IS NULL;

