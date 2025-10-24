-- Staff locations table for the Prenatal Ultrasound Booking System
-- This table manages the many-to-many relationship between staff and locations

CREATE TABLE IF NOT EXISTS staff_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(staff_id, location_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_staff_locations_staff_id ON staff_locations(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_locations_location_id ON staff_locations(location_id);
CREATE INDEX IF NOT EXISTS idx_staff_locations_created_at ON staff_locations(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE staff_locations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Staff can read their own location assignments
CREATE POLICY "Staff can read own locations" ON staff_locations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM staff 
            WHERE id = staff_locations.staff_id AND user_id = auth.uid()
        )
    );

-- Admins can read all location assignments
CREATE POLICY "Admins can read all locations" ON staff_locations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Staff and midwives can read all location assignments (for booking management)
CREATE POLICY "Staff can read all locations" ON staff_locations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role IN ('admin', 'staff', 'midwife')
        )
    );

-- Only admins can insert location assignments
CREATE POLICY "Admins can insert locations" ON staff_locations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Only admins can update location assignments
CREATE POLICY "Admins can update locations" ON staff_locations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Only admins can delete location assignments
CREATE POLICY "Admins can delete locations" ON staff_locations
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON staff_locations TO anon, authenticated;

