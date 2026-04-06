-- Create calendar_day_notes table
create table if not exists public.calendar_day_notes (
    id uuid default gen_random_uuid() primary key,
    date date not null,
    content varchar(100) not null,
    location_ids uuid[] not null default '{}',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    created_by uuid references public.users(id) on delete set null
);

-- Enable RLS
alter table public.calendar_day_notes enable row level security;

-- Policies
create policy "Allow all authenticated users to read"
on public.calendar_day_notes for select
to authenticated
using (true);

create policy "Allow admin, staff, assistant to insert"
on public.calendar_day_notes for insert
to authenticated
with check (
    exists (
        select 1 from public.users
        where id = auth.uid()
        and role in ('admin', 'staff', 'assistant')
    )
);

create policy "Allow admin, staff, assistant to update"
on public.calendar_day_notes for update
to authenticated
using (
    exists (
        select 1 from public.users
        where id = auth.uid()
        and role in ('admin', 'staff', 'assistant')
    )
);

create policy "Allow admin, staff, assistant to delete"
on public.calendar_day_notes for delete
to authenticated
using (
    exists (
        select 1 from public.users
        where id = auth.uid()
        and role in ('admin', 'staff', 'assistant')
    )
);

-- Indexes for performance
create index if not exists calendar_day_notes_date_idx on public.calendar_day_notes(date);
create index if not exists calendar_day_notes_location_ids_idx on public.calendar_day_notes using gin (location_ids);
