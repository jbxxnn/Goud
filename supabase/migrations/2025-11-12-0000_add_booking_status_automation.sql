-- Enable the pg_cron extension to schedule jobs
create extension if not exists pg_cron with schema extensions;

-- Add new values to the booking_status enum
-- We use a DO block to safely add values only if they don't exist, though strictly Postgres supports IF NOT EXISTS for ADD VALUE in newer versions
-- But straightforward ALTER TYPE ... ADD VALUE IF NOT EXISTS is supported in Supabase (Postgres 12+)
alter type public.booking_status add value if not exists 'ongoing';
alter type public.booking_status add value if not exists 'completed';

-- Create a function to update booking statuses based on current time
create or replace function public.update_booking_statuses()
returns void
language plpgsql
security definer
as $$
begin
  -- Update bookings to 'ongoing' if they are 'confirmed' and start_time has passed but end_time has not
  update public.bookings
  set status = 'ongoing'
  where status = 'confirmed'
    and start_time <= now()
    and end_time > now();

  -- Update bookings to 'completed' if they are 'confirmed' or 'ongoing' and end_time has passed
  update public.bookings
  set status = 'completed'
  where status in ('confirmed', 'ongoing')
    and end_time <= now();
end;
$$;

-- Schedule the function to run every minute
select cron.schedule(
  'update-booking-statuses', -- job name
  '* * * * *',              -- cron schedule (every minute)
  $$select public.update_booking_statuses()$$
);

comment on function public.update_booking_statuses is 'Updates booking statuses to ongoing/completed based on current time. Scheduled to run every minute.';
