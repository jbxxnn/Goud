-- Link bookings.created_by to public.users for join support in PostgREST
ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_created_by_fkey;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES public.users(id)
  ON UPDATE CASCADE
  ON DELETE SET NULL;

COMMENT ON CONSTRAINT bookings_created_by_fkey ON public.bookings IS 'Link created_by to public.users for join support';
