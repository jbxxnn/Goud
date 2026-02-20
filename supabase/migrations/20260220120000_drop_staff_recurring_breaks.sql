-- Drop the deprecated staff_recurring_breaks table
-- It was superseded by sitewide_breaks and shift_breaks

DROP TABLE IF EXISTS staff_recurring_breaks CASCADE;
