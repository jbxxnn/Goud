-- Relax the shift_breaks_time_check constraint to allow 0-duration breaks.
-- 0-duration breaks (start_time = end_time) are used to represent deleted/overridden inherited breaks.

ALTER TABLE public.shift_breaks 
DROP CONSTRAINT IF EXISTS shift_breaks_time_check;

ALTER TABLE public.shift_breaks 
ADD CONSTRAINT shift_breaks_time_check CHECK (end_time >= start_time);
