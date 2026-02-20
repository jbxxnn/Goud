
-- Create sitewide_breaks table (Templates)
CREATE TABLE IF NOT EXISTS public.sitewide_breaks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  start_date date, -- Optional specific date to apply to
  end_date date,   -- Optional specific date
  is_recurring boolean DEFAULT true, -- If true, applies daily. If false, only applies between start/end dates
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT sitewide_breaks_pkey PRIMARY KEY (id),
  CONSTRAINT sitewide_breaks_time_check CHECK (end_time > start_time)
);

-- Enable RLS for sitewide_breaks
ALTER TABLE public.sitewide_breaks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sitewide_breaks
CREATE POLICY "Allow read access to sitewide_breaks for authenticated users"
  ON public.sitewide_breaks FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all access to sitewide_breaks for admins"
  ON public.sitewide_breaks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Create shift_breaks table (Specific instances attached to shifts)
CREATE TABLE IF NOT EXISTS public.shift_breaks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  shift_id uuid NOT NULL,
  sitewide_break_id uuid, -- Nullable, track if this came from a template
  name character varying NOT NULL,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT shift_breaks_pkey PRIMARY KEY (id),
  CONSTRAINT shift_breaks_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.shifts(id) ON DELETE CASCADE,
  CONSTRAINT shift_breaks_sitewide_break_id_fkey FOREIGN KEY (sitewide_break_id) REFERENCES public.sitewide_breaks(id) ON DELETE SET NULL,
  CONSTRAINT shift_breaks_time_check CHECK (end_time > start_time)
);

-- Enable RLS for shift_breaks
ALTER TABLE public.shift_breaks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shift_breaks
CREATE POLICY "Allow read access to shift_breaks for authenticated users"
  ON public.shift_breaks FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all access to shift_breaks for admins"
  ON public.shift_breaks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Triggers for updated_at
CREATE TRIGGER trigger_update_sitewide_breaks_updated_at
  BEFORE UPDATE ON public.sitewide_breaks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_update_shift_breaks_updated_at
  BEFORE UPDATE ON public.shift_breaks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle new sitewide break creation: finding overlapping shifts
CREATE OR REPLACE FUNCTION public.apply_sitewide_break_to_shifts()
RETURNS TRIGGER AS $$
DECLARE
  v_shift RECORD;
  v_shift_date DATE;
  v_break_start TIMESTAMP WITH TIME ZONE;
  v_break_end TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Only apply automatically if it's active
  IF NEW.is_active = true THEN
    -- Find all shifts that don't have this break yet and overlap with the break's effective dates
    FOR v_shift IN 
      SELECT s.id, s.start_time, s.end_time
      FROM public.shifts s
      WHERE s.is_active = true
      AND (
        (NEW.is_recurring = true) -- Applies to all dates
        OR 
        (NEW.is_recurring = false AND (NEW.start_date IS NULL OR (s.start_time::date) >= NEW.start_date) AND (NEW.end_date IS NULL OR (s.start_time::date) <= NEW.end_date))
      )
    LOOP
      v_shift_date := v_shift.start_time::date;
      
      -- Calculate the exact timestamp for the break on this shift's local date
      -- Note: using AT TIME ZONE 'Europe/Amsterdam' assuming clinic timezone. Better to use location timezone, but sticking to UTC logic if location tz not available
      v_break_start := v_shift_date + NEW.start_time;
      v_break_end := v_shift_date + NEW.end_time;
      
      -- Check if the break falls within the shift
      IF v_break_start >= v_shift.start_time AND v_break_end <= v_shift.end_time THEN
        -- Insert the shift break
        INSERT INTO public.shift_breaks (shift_id, sitewide_break_id, name, start_time, end_time)
        VALUES (v_shift.id, NEW.id, NEW.name, v_break_start, v_break_end)
        ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to execute the function after inserting a sitewide break
CREATE TRIGGER on_sitewide_break_created
  AFTER INSERT ON public.sitewide_breaks
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_sitewide_break_to_shifts();

