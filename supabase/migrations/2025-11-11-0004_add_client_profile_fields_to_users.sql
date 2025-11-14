-- Add client profile fields to users table
-- These fields should be stored in the user profile rather than duplicated in each booking

-- Add address detail columns
alter table public.users
add column if not exists postal_code varchar(20),
add column if not exists house_number varchar(20),
add column if not exists street_name varchar(255),
add column if not exists city varchar(100);

-- Add client-specific profile fields
alter table public.users
add column if not exists birth_date date,
add column if not exists midwife_id uuid;

-- Add foreign key constraint for midwife reference
alter table public.users
drop constraint if exists users_midwife_id_fkey;

alter table public.users
add constraint users_midwife_id_fkey 
foreign key (midwife_id) references public.midwives(id) on delete set null;

-- Add indexes for better performance
create index if not exists idx_users_postal_code on public.users(postal_code);
create index if not exists idx_users_city on public.users(city);
create index if not exists idx_users_midwife_id on public.users(midwife_id);
create index if not exists idx_users_birth_date on public.users(birth_date);

-- Add comments for documentation
comment on column public.users.postal_code is 'Postcode (postal code)';
comment on column public.users.house_number is 'Huisnummer (house number)';
comment on column public.users.street_name is 'Straatnaam (street name)';
comment on column public.users.city is 'Woonplaats (city)';
comment on column public.users.birth_date is 'Geboortedatum (birth date)';
comment on column public.users.midwife_id is 'Verwijzing naar eigen verloskundige (reference to client''s own midwife)';

