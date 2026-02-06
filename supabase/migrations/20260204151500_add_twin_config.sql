-- Add Twin Pregnancy configuration columns

ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS allows_twins boolean DEFAULT false;

ALTER TABLE public.staff_services 
ADD COLUMN IF NOT EXISTS is_twin_qualified boolean DEFAULT false;
