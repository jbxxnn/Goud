
-- Staff Recurring Breaks
-- Allows defining specific break times (e.g. Lunch 12:00-12:30) that recur on specific days (or every day)

CREATE TABLE IF NOT EXISTS staff_recurring_breaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  
  -- Time of day (LOCAL time relative to the location, but simplified as just TIME here)
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  
  -- Day of week: 0=Sunday, 1=Monday, ..., 6=Saturday
  -- If NULL, applies to every day
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_break_time CHECK (end_time > start_time)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_staff_recurring_breaks_staff_id ON staff_recurring_breaks(staff_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_staff_recurring_breaks_updated_at ON staff_recurring_breaks;
CREATE TRIGGER trigger_update_staff_recurring_breaks_updated_at
  BEFORE UPDATE ON staff_recurring_breaks
  FOR EACH ROW
  EXECUTE FUNCTION update_shifts_updated_at(); -- Reusing existing function if available, else create generic one

-- RLS
ALTER TABLE staff_recurring_breaks ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Allow read access to staff_recurring_breaks" ON staff_recurring_breaks;
CREATE POLICY "Allow read access to staff_recurring_breaks"
  ON staff_recurring_breaks FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow all for admins on staff_recurring_breaks" ON staff_recurring_breaks;
CREATE POLICY "Allow all for admins on staff_recurring_breaks"
  ON staff_recurring_breaks FOR ALL
  USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );
