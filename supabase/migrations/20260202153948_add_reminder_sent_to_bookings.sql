alter table bookings
add column reminder_sent boolean not null default false;
