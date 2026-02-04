create table if not exists public.booking_locks (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id),
  location_id uuid not null references public.locations(id),
  staff_id uuid not null references public.staff(id),
  shift_id uuid not null references public.shifts(id),
  start_time timestamptz not null,
  end_time timestamptz not null,
  expires_at timestamptz not null,
  session_token text not null,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.booking_locks enable row level security;

-- Indexes for performance
create index idx_booking_locks_expires_at on public.booking_locks(expires_at);
create index idx_booking_locks_range on public.booking_locks(start_time, end_time);
create index idx_booking_locks_session on public.booking_locks(session_token);

-- Cron to clean up expired locks (optional, but good practice. For now just index is enough for fast filtering)
-- We can also add a policy if we want client-side reads, but we are doing it server-side.
