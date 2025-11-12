-- Add policy_answers column to store structured service policy responses
alter table public.bookings
add column if not exists policy_answers jsonb;

comment on column public.bookings.policy_answers is
  'Structured responses to service policy fields captured during booking checkout';


