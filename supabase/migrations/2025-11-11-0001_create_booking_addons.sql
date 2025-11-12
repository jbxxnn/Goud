-- Create booking_addons table to store selected service add-ons per booking
create table if not exists public.booking_addons (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  addon_id uuid not null references public.service_addons(id),
  quantity integer not null default 1,
  price_eur_cents integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_booking_addons_booking_id on public.booking_addons(booking_id);
create index if not exists idx_booking_addons_addon_id on public.booking_addons(addon_id);

alter table public.booking_addons enable row level security;

create policy "Admins can manage booking add-ons"
  on public.booking_addons
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

comment on table public.booking_addons is 'Selected service add-ons linked to bookings';
comment on column public.booking_addons.price_eur_cents is 'Add-on price captured at booking time (in euro cents)';


