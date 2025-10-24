-- Staff qualifications table for the Prenatal Ultrasound Booking System
-- This table manages the many-to-many relationship between staff and services

CREATE TABLE IF NOT EXISTS staff_qualifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(staff_id, service_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_staff_qualifications_staff_id ON staff_qualifications(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_qualifications_service_id ON staff_qualifications(service_id);
CREATE INDEX IF NOT EXISTS idx_staff_qualifications_created_at ON staff_qualifications(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE staff_qualifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Staff can read their own qualifications
CREATE POLICY "Staff can read own qualifications" ON staff_qualifications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM staff 
            WHERE id = staff_qualifications.staff_id AND user_id = auth.uid()
        )
    );

-- Admins can read all qualifications
CREATE POLICY "Admins can read all qualifications" ON staff_qualifications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Staff and midwives can read all qualifications (for booking management)
CREATE POLICY "Staff can read all qualifications" ON staff_qualifications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role IN ('admin', 'staff', 'midwife')
        )
    );

-- Only admins can insert qualifications
CREATE POLICY "Admins can insert qualifications" ON staff_qualifications
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Only admins can update qualifications
CREATE POLICY "Admins can update qualifications" ON staff_qualifications
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Only admins can delete qualifications
CREATE POLICY "Admins can delete qualifications" ON staff_qualifications
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON staff_qualifications TO anon, authenticated;

