-- Add 'no_show' to the booking_status enum
alter type public.booking_status add value if not exists 'no_show';
