-- Add no-show resolution fields to bookings table
alter table public.bookings 
add column if not exists no_show_resolved_at timestamp with time zone,
add column if not exists no_show_resolved_by uuid references public.users(id);

-- Add comment for clarity
comment on column public.bookings.no_show_resolved_at is 'Timestamp when the no-show was documented and resolved by an assistant';
comment on column public.bookings.no_show_resolved_by is 'The assistant user who resolved the no-show';
