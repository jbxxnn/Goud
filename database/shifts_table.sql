-- Shifts Management System
-- This schema supports recurring shifts with service assignments

-- =============================================
-- 1. SHIFTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  
  -- Time information
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  
  -- Recurrence support (RRULE format)
  -- Example: "FREQ=WEEKLY;BYDAY=MO,WE,FR;UNTIL=20251231T235959Z"
  recurrence_rule TEXT NULL,
  is_recurring BOOLEAN DEFAULT FALSE,
  
  -- For handling exceptions in recurring shifts
  parent_shift_id UUID NULL REFERENCES shifts(id) ON DELETE CASCADE,
  exception_date DATE NULL, -- If this shift is an exception/override
  
  -- Priority for overlapping shifts (higher number = higher priority)
  priority INTEGER DEFAULT 1,
  
  -- Additional info
  notes TEXT NULL,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_shift_time CHECK (end_time > start_time),
  CONSTRAINT valid_priority CHECK (priority > 0)
);

-- =============================================
-- 2. SHIFT_SERVICES TABLE (Many-to-Many)
-- =============================================
-- Defines which services can be booked during a shift
CREATE TABLE IF NOT EXISTS shift_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  
  -- How many concurrent bookings allowed for this service during this shift
  -- NULL means unlimited
  max_concurrent_bookings INTEGER NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate service assignments
  UNIQUE(shift_id, service_id),
  
  -- Constraints
  CONSTRAINT valid_max_bookings CHECK (max_concurrent_bookings IS NULL OR max_concurrent_bookings > 0)
);

-- =============================================
-- 3. BLACKOUT_PERIODS TABLE
-- =============================================
-- For blocking time periods (holidays, maintenance, etc.)
CREATE TABLE IF NOT EXISTS blackout_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Can be specific to a location, staff, or global (both NULL)
  location_id UUID NULL REFERENCES locations(id) ON DELETE CASCADE,
  staff_id UUID NULL REFERENCES staff(id) ON DELETE CASCADE,
  
  -- Time range
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  
  -- Information
  reason TEXT NOT NULL,
  description TEXT NULL,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_blackout_period CHECK (end_date > start_date)
);

-- =============================================
-- 4. INDEXES
-- =============================================

-- Shifts indexes for performance
CREATE INDEX IF NOT EXISTS idx_shifts_staff_id ON shifts(staff_id);
CREATE INDEX IF NOT EXISTS idx_shifts_location_id ON shifts(location_id);
CREATE INDEX IF NOT EXISTS idx_shifts_start_time ON shifts(start_time);
CREATE INDEX IF NOT EXISTS idx_shifts_end_time ON shifts(end_time);
CREATE INDEX IF NOT EXISTS idx_shifts_active ON shifts(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_shifts_recurring ON shifts(is_recurring) WHERE is_recurring = TRUE;
CREATE INDEX IF NOT EXISTS idx_shifts_parent ON shifts(parent_shift_id) WHERE parent_shift_id IS NOT NULL;

-- Composite index for finding shifts by staff and time range
CREATE INDEX IF NOT EXISTS idx_shifts_staff_time ON shifts(staff_id, start_time, end_time);

-- Composite index for finding shifts by location and time range
CREATE INDEX IF NOT EXISTS idx_shifts_location_time ON shifts(location_id, start_time, end_time);

-- Shift services indexes
CREATE INDEX IF NOT EXISTS idx_shift_services_shift_id ON shift_services(shift_id);
CREATE INDEX IF NOT EXISTS idx_shift_services_service_id ON shift_services(service_id);

-- Blackout periods indexes
CREATE INDEX IF NOT EXISTS idx_blackout_periods_location ON blackout_periods(location_id) WHERE location_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_blackout_periods_staff ON blackout_periods(staff_id) WHERE staff_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_blackout_periods_dates ON blackout_periods(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_blackout_periods_active ON blackout_periods(is_active) WHERE is_active = TRUE;

-- =============================================
-- 5. TRIGGERS
-- =============================================

-- Updated at trigger for shifts
CREATE OR REPLACE FUNCTION update_shifts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_shifts_updated_at ON shifts;
CREATE TRIGGER trigger_update_shifts_updated_at
  BEFORE UPDATE ON shifts
  FOR EACH ROW
  EXECUTE FUNCTION update_shifts_updated_at();

-- Updated at trigger for shift_services
DROP TRIGGER IF EXISTS trigger_update_shift_services_updated_at ON shift_services;
CREATE TRIGGER trigger_update_shift_services_updated_at
  BEFORE UPDATE ON shift_services
  FOR EACH ROW
  EXECUTE FUNCTION update_shifts_updated_at();

-- Updated at trigger for blackout_periods
DROP TRIGGER IF EXISTS trigger_update_blackout_periods_updated_at ON blackout_periods;
CREATE TRIGGER trigger_update_blackout_periods_updated_at
  BEFORE UPDATE ON blackout_periods
  FOR EACH ROW
  EXECUTE FUNCTION update_shifts_updated_at();

-- =============================================
-- 6. ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE blackout_periods ENABLE ROW LEVEL SECURITY;

-- Shifts policies
DROP POLICY IF EXISTS "Allow read access to shifts" ON shifts;
CREATE POLICY "Allow read access to shifts"
  ON shifts FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow insert for admins" ON shifts;
CREATE POLICY "Allow insert for admins"
  ON shifts FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Allow update for admins" ON shifts;
CREATE POLICY "Allow update for admins"
  ON shifts FOR UPDATE
  USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Allow delete for admins" ON shifts;
CREATE POLICY "Allow delete for admins"
  ON shifts FOR DELETE
  USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Shift services policies
DROP POLICY IF EXISTS "Allow read access to shift_services" ON shift_services;
CREATE POLICY "Allow read access to shift_services"
  ON shift_services FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow all for admins on shift_services" ON shift_services;
CREATE POLICY "Allow all for admins on shift_services"
  ON shift_services FOR ALL
  USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Blackout periods policies
DROP POLICY IF EXISTS "Allow read access to blackout_periods" ON blackout_periods;
CREATE POLICY "Allow read access to blackout_periods"
  ON blackout_periods FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow all for admins on blackout_periods" ON blackout_periods;
CREATE POLICY "Allow all for admins on blackout_periods"
  ON blackout_periods FOR ALL
  USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- =============================================
-- 7. HELPER VIEW - SHIFTS WITH DETAILS
-- =============================================

CREATE OR REPLACE VIEW shifts_with_details AS
SELECT 
  s.id,
  s.staff_id,
  s.location_id,
  s.start_time,
  s.end_time,
  s.recurrence_rule,
  s.is_recurring,
  s.parent_shift_id,
  s.exception_date,
  s.priority,
  s.notes,
  s.is_active,
  s.created_at,
  s.updated_at,
  
  -- Staff information
  st.first_name as staff_first_name,
  st.last_name as staff_last_name,
  st.email as staff_email,
  
  -- Location information
  l.name as location_name,
  l.address as location_address,
  
  -- Aggregated services
  COALESCE(
    json_agg(
      json_build_object(
        'id', ss.id,
        'service_id', ss.service_id,
        'service_name', srv.name,
        'max_concurrent_bookings', ss.max_concurrent_bookings
      )
    ) FILTER (WHERE ss.id IS NOT NULL),
    '[]'
  ) as services
  
FROM shifts s
INNER JOIN staff st ON s.staff_id = st.id
INNER JOIN locations l ON s.location_id = l.id
LEFT JOIN shift_services ss ON s.id = ss.shift_id
LEFT JOIN services srv ON ss.service_id = srv.id
GROUP BY 
  s.id, s.staff_id, s.location_id, s.start_time, s.end_time,
  s.recurrence_rule, s.is_recurring, s.parent_shift_id, s.exception_date,
  s.priority, s.notes, s.is_active, s.created_at, s.updated_at,
  st.first_name, st.last_name, st.email,
  l.name, l.address;

-- =============================================
-- 8. GRANT PERMISSIONS
-- =============================================

GRANT ALL ON shifts TO authenticated;
GRANT ALL ON shift_services TO authenticated;
GRANT ALL ON blackout_periods TO authenticated;
GRANT SELECT ON shifts_with_details TO authenticated;

-- =============================================
-- 9. SAMPLE DATA (Optional - for testing)
-- =============================================

-- This will only insert if there's at least one staff member and location
DO $$
DECLARE
  sample_staff_id UUID;
  sample_location_id UUID;
  sample_service_id UUID;
  sample_shift_id UUID;
BEGIN
  -- Get sample IDs
  SELECT id INTO sample_staff_id FROM staff WHERE is_active = TRUE LIMIT 1;
  SELECT id INTO sample_location_id FROM locations WHERE is_active = TRUE LIMIT 1;
  SELECT id INTO sample_service_id FROM services WHERE is_active = TRUE LIMIT 1;
  
  -- Only proceed if we have all required data
  IF sample_staff_id IS NOT NULL AND sample_location_id IS NOT NULL AND sample_service_id IS NOT NULL THEN
    -- Insert a sample one-time shift
    INSERT INTO shifts (staff_id, location_id, start_time, end_time, is_recurring, priority, notes)
    VALUES (
      sample_staff_id,
      sample_location_id,
      NOW() + INTERVAL '1 day' + INTERVAL '9 hours', -- Tomorrow at 9 AM
      NOW() + INTERVAL '1 day' + INTERVAL '17 hours', -- Tomorrow at 5 PM
      FALSE,
      1,
      'Sample one-time shift'
    )
    RETURNING id INTO sample_shift_id;
    
    -- Assign service to the shift
    INSERT INTO shift_services (shift_id, service_id, max_concurrent_bookings)
    VALUES (sample_shift_id, sample_service_id, 3);
    
    -- Insert a sample recurring shift (every Monday and Wednesday)
    INSERT INTO shifts (staff_id, location_id, start_time, end_time, is_recurring, recurrence_rule, priority, notes)
    VALUES (
      sample_staff_id,
      sample_location_id,
      NOW() + INTERVAL '1 week' + INTERVAL '9 hours',
      NOW() + INTERVAL '1 week' + INTERVAL '17 hours',
      TRUE,
      'FREQ=WEEKLY;BYDAY=MO,WE',
      1,
      'Sample recurring shift - Every Monday and Wednesday'
    )
    RETURNING id INTO sample_shift_id;
    
    -- Assign service to the recurring shift
    INSERT INTO shift_services (shift_id, service_id, max_concurrent_bookings)
    VALUES (sample_shift_id, sample_service_id, 3);
    
    RAISE NOTICE 'Sample shifts created successfully';
  ELSE
    RAISE NOTICE 'Skipping sample data - missing required staff, location, or service records';
  END IF;
END $$;

-- =============================================
-- DONE!
-- =============================================

