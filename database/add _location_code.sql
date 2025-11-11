ALTER TABLE public.locations
ADD COLUMN IF NOT EXISTS location_code char(3);

ALTER TABLE public.locations
ADD CONSTRAINT locations_location_code_format
CHECK (location_code IS NULL OR location_code ~ '^[A-Z]{3}$');

CREATE UNIQUE INDEX IF NOT EXISTS locations_location_code_key
ON public.locations (location_code)
WHERE location_code IS NOT NULL;

UPDATE public.locations
SET location_code = CASE
  WHEN regexp_replace(name, '[^A-Za-z]', '', 'g') <> '' THEN
    upper(substr(regexp_replace(name, '[^A-Za-z]', '', 'g'), 1, 3))
  ELSE NULL
END
WHERE location_code IS NULL;