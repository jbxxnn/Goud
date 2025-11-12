-- Create midwives table for storing client's own midwives
create table if not exists public.midwives (
  id uuid primary key default gen_random_uuid(),
  first_name varchar(100) not null,
  last_name varchar(100) not null,
  phone varchar(32),
  email varchar(255),
  practice_name varchar(255),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add index for active midwives
create index if not exists idx_midwives_active on public.midwives(is_active);

-- Add RLS policies
alter table public.midwives enable row level security;

create policy "Admins can manage midwives"
  on public.midwives
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Update bookings table to reference midwives instead of staff
alter table public.bookings
drop constraint if exists bookings_midwife_id_fkey;

alter table public.bookings
add constraint bookings_midwife_id_fkey 
foreign key (midwife_id) references public.midwives(id);

comment on table public.midwives is 'Client''s own midwives (verloskundigen)';
comment on column public.midwives.practice_name is 'Name of the midwife practice';

