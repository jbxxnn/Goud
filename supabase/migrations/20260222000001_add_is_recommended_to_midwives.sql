-- Add is_recommended column to midwives table
ALTER TABLE public.midwives
ADD COLUMN is_recommended BOOLEAN NOT NULL DEFAULT false;

-- Create an index to optimize sorting
CREATE INDEX IF NOT EXISTS idx_midwives_is_recommended ON public.midwives (is_recommended DESC);
