-- Fix Foreign Key relationships for booking_checklist_items
-- The previous migration linked created_by/completed_by to auth.users, 
-- but the API needs to join with public.users to get first_name/last_name.

-- 1. Drop existing Foreign Key constraints (assuming default names or trying to identify)
-- Note: Supabase/Postgres auto-names FKs as <table>_<column>_fkey usually.

ALTER TABLE public.booking_checklist_items
  DROP CONSTRAINT IF EXISTS booking_checklist_items_created_by_fkey,
  DROP CONSTRAINT IF EXISTS booking_checklist_items_completed_by_fkey;

-- 2. Add new Foreign Key constraints pointing to public.users
ALTER TABLE public.booking_checklist_items
  ADD CONSTRAINT booking_checklist_items_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES public.users(id)
  ON UPDATE CASCADE
  ON DELETE SET NULL;

ALTER TABLE public.booking_checklist_items
  ADD CONSTRAINT booking_checklist_items_completed_by_fkey
  FOREIGN KEY (completed_by)
  REFERENCES public.users(id)
  ON UPDATE CASCADE
  ON DELETE SET NULL;
