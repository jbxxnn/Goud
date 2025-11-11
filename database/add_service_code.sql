ALTER TABLE public.services
ADD COLUMN IF NOT EXISTS service_code char(3);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'services_service_code_format'
      AND conrelid = 'public.services'::regclass
  ) THEN
    ALTER TABLE public.services
    ADD CONSTRAINT services_service_code_format
    CHECK (service_code IS NULL OR service_code ~ '^[A-Z0-9]{3}$');
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS services_service_code_key
ON public.services (service_code)
WHERE service_code IS NOT NULL;

UPDATE public.services
SET service_code = CASE
  WHEN length(regexp_replace(name, '[^A-Za-z0-9]', '', 'g')) >= 3 THEN
    upper(substr(regexp_replace(name, '[^A-Za-z0-9]', '', 'g'), 1, 3))
  ELSE NULL
END
WHERE service_code IS NULL;

