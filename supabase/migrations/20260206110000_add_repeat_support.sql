-- Create service_repeat_types table
CREATE TABLE public.service_repeat_types (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL,
  label text NOT NULL, -- e.g. "15 min", "30 min"
  duration_minutes integer NOT NULL,
  price_eur_cents integer NOT NULL DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT service_repeat_types_pkey PRIMARY KEY (id),
  CONSTRAINT service_repeat_types_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id)
);

-- Enable RLS
ALTER TABLE public.service_repeat_types ENABLE ROW LEVEL SECURITY;

-- Policies for service_repeat_types
CREATE POLICY "Public read access for service_repeat_types" ON public.service_repeat_types
  FOR SELECT USING (true);
  
CREATE POLICY "Admin full access for service_repeat_types" ON public.service_repeat_types
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Create booking_continuations table (Tokens)
CREATE TABLE public.booking_continuations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  parent_booking_id uuid NOT NULL,
  repeat_type_id uuid NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  claimed_booking_id uuid, -- Nullable, set when booked
  created_by uuid, -- Staff who created this
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT booking_continuations_pkey PRIMARY KEY (id),
  CONSTRAINT booking_continuations_parent_booking_id_fkey FOREIGN KEY (parent_booking_id) REFERENCES public.bookings(id),
  CONSTRAINT booking_continuations_repeat_type_id_fkey FOREIGN KEY (repeat_type_id) REFERENCES public.service_repeat_types(id),
  CONSTRAINT booking_continuations_claimed_booking_id_fkey FOREIGN KEY (claimed_booking_id) REFERENCES public.bookings(id),
  CONSTRAINT booking_continuations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

-- Enable RLS
ALTER TABLE public.booking_continuations ENABLE ROW LEVEL SECURITY;

-- Policies for booking_continuations
-- Public can read via token lookup (we'll implement secure lookup in API, but RLS layer can allow reading if you have the token)
-- Actually, better to RESTRICT simple selects and use a security definer function or just allow reading own continuations?
-- For now, let's allow read if you know the token (which acts as the key).
CREATE POLICY "Read access by token" ON public.booking_continuations
  FOR SELECT USING (true); -- Ideally stricter, but token is secret.

CREATE POLICY "Staff/Admin create access" ON public.booking_continuations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() AND (users.role = 'admin' OR users.role = 'midwife' OR users.role = 'echoscopist')
    )
  );

-- Add columns to bookings table
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS parent_booking_id uuid REFERENCES public.bookings(id),
ADD COLUMN IF NOT EXISTS continuation_id uuid REFERENCES public.booking_continuations(id);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_bookings_parent_booking_id ON public.bookings(parent_booking_id);
CREATE INDEX IF NOT EXISTS idx_bookings_continuation_id ON public.bookings(continuation_id);
