ALTER TABLE public.email_templates
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS payment_receipt_email_sent_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS payment_failed_email_sent_at timestamp with time zone;

UPDATE public.email_templates
SET is_active = true
WHERE is_active IS NULL;

INSERT INTO public.email_templates (key, subject, body, description, is_active)
VALUES
(
  'repeat_booking',
  'Plan je vervolgafspraak bij Goud Echo',
  'Hoi {{clientName}}, we hebben een vervolgafspraak voor {{serviceName}} voor je klaargezet.',
  'Sent when inviting a client to book a follow-up appointment',
  true
),
(
  'payment_link',
  'Betaallink voor je afspraak bij Goud Echo',
  'Hoi {{clientName}}, je kunt je afspraak voor {{serviceName}} online betalen via de knop hieronder.',
  'Sent when a client or midwife needs a separate payment link',
  true
),
(
  'payment_receipt',
  'Betaling ontvangen voor je afspraak bij Goud Echo',
  'Hoi {{clientName}}, we hebben je betaling voor {{serviceName}} ontvangen. Dank je wel.',
  'Sent when an online payment is successfully received',
  true
),
(
  'payment_failed',
  'Betaling niet voltooid voor je afspraak bij Goud Echo',
  'Hoi {{clientName}}, de betaling voor {{serviceName}} is niet voltooid. Probeer het opnieuw of neem contact met ons op.',
  'Sent when a payment fails, expires, or is cancelled',
  true
),
(
  'account_welcome',
  'Welkom bij Goud Echo',
  'Hoi {{clientName}}, je account is aangemaakt. Vanuit je dashboard kun je afspraken bekijken, wijzigen en nieuwe afspraken plannen.',
  'Sent when a user account is created',
  true
),
(
  'password_reset',
  'Stel je wachtwoord opnieuw in',
  'Hoi {{clientName}}, gebruik de knop hieronder om je wachtwoord opnieuw in te stellen.',
  'Sent when a user requests a password reset link',
  true
),
(
  'magic_link',
  'Log in bij Goud Echo',
  'Hoi {{clientName}}, gebruik de knop hieronder om veilig in te loggen bij Goud Echo.',
  'Sent when a user receives a magic login link',
  true
),
(
  'review_request',
  'Wil je je ervaring met Goud Echo delen?',
  'Hoi {{clientName}}, bedankt voor je bezoek. We zouden het waarderen als je je ervaring met ons deelt.',
  'Sent after an appointment to request a review',
  true
)
ON CONFLICT (key) DO UPDATE
SET
  subject = EXCLUDED.subject,
  body = EXCLUDED.body,
  description = EXCLUDED.description,
  is_active = COALESCE(public.email_templates.is_active, EXCLUDED.is_active),
  updated_at = now();
