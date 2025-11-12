-- Add additional client information fields to bookings table
-- These fields capture detailed client information during booking

alter table public.bookings
add column if not exists due_date date,
add column if not exists birth_date date,
add column if not exists midwife_id uuid,
add column if not exists house_number varchar(20),
add column if not exists postal_code varchar(20),
add column if not exists street_name varchar(255),
add column if not exists city varchar(100);

-- Add index for midwife lookups
create index if not exists idx_bookings_midwife_id on public.bookings(midwife_id);

-- Add comments for documentation
comment on column public.bookings.due_date is 'Uitgerekende datum (expected due date)';
comment on column public.bookings.birth_date is 'Geboortedatum (birth date)';
comment on column public.bookings.midwife_id is 'Verwijzing naar eigen verloskundige (reference to client''s own midwife)';
comment on column public.bookings.house_number is 'Huisnummer (house number)';
comment on column public.bookings.postal_code is 'Postcode (postal code)';
comment on column public.bookings.street_name is 'Straatnaam (street name)';
comment on column public.bookings.city is 'Woonplaats (city)';

