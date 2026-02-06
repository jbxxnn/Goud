-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.blackout_periods (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  location_id uuid,
  staff_id uuid,
  start_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone NOT NULL,
  reason text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT blackout_periods_pkey PRIMARY KEY (id),
  CONSTRAINT blackout_periods_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id),
  CONSTRAINT blackout_periods_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id)
);
CREATE TABLE public.booking_addons (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  addon_id uuid,
  quantity integer NOT NULL CHECK (quantity > 0),
  price_eur_cents integer NOT NULL CHECK (price_eur_cents >= 0),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT booking_addons_pkey PRIMARY KEY (id),
  CONSTRAINT booking_addons_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id)
);
CREATE TABLE public.booking_locks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL,
  location_id uuid NOT NULL,
  staff_id uuid NOT NULL,
  shift_id uuid NOT NULL,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  session_token text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT booking_locks_pkey PRIMARY KEY (id),
  CONSTRAINT booking_locks_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id),
  CONSTRAINT booking_locks_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id),
  CONSTRAINT booking_locks_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id),
  CONSTRAINT booking_locks_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.shifts(id)
);
CREATE TABLE public.booking_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  note text NOT NULL,
  author_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT booking_notes_pkey PRIMARY KEY (id),
  CONSTRAINT booking_notes_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id),
  CONSTRAINT booking_notes_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id)
);
CREATE TABLE public.bookings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  service_id uuid NOT NULL,
  location_id uuid NOT NULL,
  staff_id uuid,
  shift_id uuid,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone NOT NULL,
  price_eur_cents integer NOT NULL CHECK (price_eur_cents >= 0),
  status USER-DEFINED NOT NULL DEFAULT 'pending'::booking_status,
  payment_status USER-DEFINED NOT NULL DEFAULT 'unpaid'::payment_status,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  policy_answers jsonb,
  due_date date,
  birth_date date,
  midwife_id uuid,
  house_number character varying,
  postal_code character varying,
  street_name character varying,
  city character varying,
  created_by uuid,
  internal_notes text,
  reminder_sent boolean NOT NULL DEFAULT false,
  mollie_payment_id text,
  payment_link text,
  CONSTRAINT bookings_pkey PRIMARY KEY (id),
  CONSTRAINT bookings_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.users(id),
  CONSTRAINT bookings_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id),
  CONSTRAINT bookings_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id),
  CONSTRAINT bookings_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id),
  CONSTRAINT bookings_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.shifts(id),
  CONSTRAINT bookings_midwife_id_fkey FOREIGN KEY (midwife_id) REFERENCES public.midwives(id),
  CONSTRAINT bookings_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);
CREATE TABLE public.calendar_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  setting_key character varying NOT NULL UNIQUE,
  setting_value jsonb NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT calendar_settings_pkey PRIMARY KEY (id)
);
CREATE TABLE public.email_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  key character varying NOT NULL UNIQUE,
  subject text NOT NULL,
  body text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT email_templates_pkey PRIMARY KEY (id)
);
CREATE TABLE public.locations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  address text NOT NULL,
  phone character varying,
  email character varying,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  color character varying DEFAULT '#3b82f6'::character varying,
  location_code character CHECK (location_code IS NULL OR location_code ~ '^[A-Z]{3}$'::text),
  CONSTRAINT locations_pkey PRIMARY KEY (id)
);
CREATE TABLE public.midwives (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  first_name character varying NOT NULL,
  last_name character varying NOT NULL,
  phone character varying,
  email character varying,
  practice_name character varying,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT midwives_pkey PRIMARY KEY (id)
);
CREATE TABLE public.service_addons (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL,
  name character varying NOT NULL,
  description text,
  price numeric DEFAULT 0.00,
  is_required boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT service_addons_pkey PRIMARY KEY (id)
);
CREATE TABLE public.service_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL UNIQUE,
  description text,
  color character varying DEFAULT '#3B82F6'::character varying,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT service_categories_pkey PRIMARY KEY (id)
);
CREATE TABLE public.service_policy_field_choices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  field_id uuid NOT NULL,
  title character varying NOT NULL,
  price numeric DEFAULT 0.00,
  choice_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT service_policy_field_choices_pkey PRIMARY KEY (id),
  CONSTRAINT service_policy_field_choices_field_id_fkey FOREIGN KEY (field_id) REFERENCES public.service_policy_fields(id)
);
CREATE TABLE public.service_policy_fields (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL,
  field_type character varying NOT NULL CHECK (field_type::text = ANY (ARRAY['multi_choice'::character varying, 'text_input'::character varying, 'number_input'::character varying, 'date_time'::character varying, 'checkbox'::character varying, 'file_upload'::character varying]::text[])),
  title character varying NOT NULL,
  description text,
  is_required boolean DEFAULT false,
  field_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT service_policy_fields_pkey PRIMARY KEY (id),
  CONSTRAINT service_policy_fields_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id)
);
CREATE TABLE public.services (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  description text,
  duration integer NOT NULL DEFAULT 30,
  buffer_time integer NOT NULL DEFAULT 0,
  lead_time integer NOT NULL DEFAULT 0,
  reschedule_cutoff integer NOT NULL DEFAULT 24,
  instructions text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  price numeric DEFAULT 0.00,
  sale_price numeric DEFAULT NULL::numeric,
  cancel_cutoff integer,
  scheduling_window integer DEFAULT 12,
  category_id uuid,
  service_code character CHECK (service_code IS NULL OR service_code ~ '^[A-Z0-9]{3}$'::text),
  CONSTRAINT services_pkey PRIMARY KEY (id),
  CONSTRAINT services_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.service_categories(id)
);
CREATE TABLE public.shift_services (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  shift_id uuid NOT NULL,
  service_id uuid NOT NULL,
  max_concurrent_bookings integer CHECK (max_concurrent_bookings IS NULL OR max_concurrent_bookings > 0),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT shift_services_pkey PRIMARY KEY (id),
  CONSTRAINT shift_services_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.shifts(id),
  CONSTRAINT shift_services_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id)
);
CREATE TABLE public.shifts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL,
  location_id uuid NOT NULL,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone NOT NULL,
  recurrence_rule text,
  is_recurring boolean DEFAULT false,
  parent_shift_id uuid,
  exception_date date,
  priority integer DEFAULT 1 CHECK (priority > 0),
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT shifts_pkey PRIMARY KEY (id),
  CONSTRAINT shifts_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id),
  CONSTRAINT shifts_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id),
  CONSTRAINT shifts_parent_shift_id_fkey FOREIGN KEY (parent_shift_id) REFERENCES public.shifts(id)
);
CREATE TABLE public.staff (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  first_name character varying NOT NULL,
  last_name character varying NOT NULL,
  email character varying NOT NULL,
  phone character varying,
  hire_date date,
  role character varying DEFAULT 'technician'::character varying,
  bio text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT staff_pkey PRIMARY KEY (id),
  CONSTRAINT staff_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.staff_locations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL,
  location_id uuid NOT NULL,
  is_primary boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT staff_locations_pkey PRIMARY KEY (id),
  CONSTRAINT staff_locations_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id),
  CONSTRAINT staff_locations_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id)
);
CREATE TABLE public.staff_qualifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL,
  service_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT staff_qualifications_pkey PRIMARY KEY (id)
);
CREATE TABLE public.staff_services (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL,
  service_id uuid NOT NULL,
  is_qualified boolean DEFAULT true,
  qualification_date date,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT staff_services_pkey PRIMARY KEY (id),
  CONSTRAINT staff_services_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id),
  CONSTRAINT staff_services_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id)
);
CREATE TABLE public.time_off_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['sick'::text, 'vacation'::text, 'personal'::text, 'other'::text])),
  reason text,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT time_off_requests_pkey PRIMARY KEY (id),
  CONSTRAINT time_off_requests_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.users(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL,
  email character varying NOT NULL UNIQUE,
  role character varying NOT NULL DEFAULT 'client'::character varying CHECK (role::text = ANY (ARRAY['admin'::character varying, 'staff'::character varying, 'midwife'::character varying, 'client'::character varying]::text[])),
  first_name character varying,
  last_name character varying,
  phone character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  last_login timestamp with time zone,
  address text,
  postal_code character varying,
  house_number character varying,
  street_name character varying,
  city character varying,
  birth_date date,
  midwife_id uuid,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT users_midwife_id_fkey FOREIGN KEY (midwife_id) REFERENCES public.midwives(id)
);