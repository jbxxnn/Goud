CREATE TABLE public.email_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  key character varying NOT NULL UNIQUE,
  subject text NOT NULL,
  body text NOT NULL, -- Storing text content to inject into the template
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT email_templates_pkey PRIMARY KEY (id)
);

-- RLS Policies
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to everyone" ON public.email_templates
  FOR SELECT USING (true);

CREATE POLICY "Allow full access to admins" ON public.email_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Seed Data
INSERT INTO public.email_templates (key, subject, body, description)
VALUES 
(
  'booking_confirmation',
  'Afspraak voor {{serviceName}} is bevestigd.',
  'Bedankt voor je afspraak met {{serviceName}}. De details kunnen beneden bekeken worden.',
  'Sent when a booking is confirmed'
),
(
  'booking_reminder',
  'Herinnering: Je afspraak morgen voor {{serviceName}}',
  'Dit is een herinnering voor je afspraak van morgen.',
  'Sent 24 hours before the appointment'
),
(
  'booking_rescheduled',
  'Wijziging van je afspraak bij Goud Echo: {{newDate}}',
  'Je afspraak voor {{serviceName}} is succesvol verzet.',
  'Sent when a booking is rescheduled'
),
(
  'booking_cancellation',
  'Annulering van je afspraak bij Goud Echo: {{date}}',
  'Hierbij bevestigen we dat je afspraak voor {{serviceName}} op {{date}} om {{time}} is geannuleerd.',
  'Sent when a booking is cancelled'
);
