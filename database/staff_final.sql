-- Staff Management System
-- This script creates the staff table and related many-to-many relationships

-- Drop existing tables if they exist (in correct order due to foreign keys)
DROP TABLE IF EXISTS staff_services CASCADE;
DROP TABLE IF EXISTS staff_locations CASCADE;
DROP TABLE IF EXISTS staff CASCADE;

-- Create staff table
CREATE TABLE staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    hire_date DATE,
    role VARCHAR(50) DEFAULT 'technician',
    bio TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create staff_locations junction table (many-to-many)
CREATE TABLE staff_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(staff_id, location_id)
);

-- Create staff_services junction table (many-to-many)
CREATE TABLE staff_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    is_qualified BOOLEAN DEFAULT true,
    qualification_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(staff_id, service_id)
);

-- Create indexes for better performance
CREATE INDEX idx_staff_user_id ON staff(user_id);
CREATE INDEX idx_staff_email ON staff(email);
CREATE INDEX idx_staff_active ON staff(is_active);
CREATE INDEX idx_staff_locations_staff_id ON staff_locations(staff_id);
CREATE INDEX idx_staff_locations_location_id ON staff_locations(location_id);
CREATE INDEX idx_staff_services_staff_id ON staff_services(staff_id);
CREATE INDEX idx_staff_services_service_id ON staff_services(service_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_staff_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_staff_updated_at ON staff;
CREATE TRIGGER update_staff_updated_at
    BEFORE UPDATE ON staff
    FOR EACH ROW
    EXECUTE FUNCTION update_staff_updated_at();

-- Enable RLS (Row Level Security)
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_services ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for staff table
CREATE POLICY "Staff are viewable by authenticated users" ON staff
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can be managed by admins" ON staff
    FOR ALL USING (auth.role() = 'authenticated');

-- Create RLS policies for staff_locations table
CREATE POLICY "Staff locations are viewable by authenticated users" ON staff_locations
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Staff locations can be managed by admins" ON staff_locations
    FOR ALL USING (auth.role() = 'authenticated');

-- Create RLS policies for staff_services table
CREATE POLICY "Staff services are viewable by authenticated users" ON staff_services
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Staff services can be managed by admins" ON staff_services
    FOR ALL USING (auth.role() = 'authenticated');

-- Grant permissions
GRANT ALL ON staff TO authenticated;
GRANT ALL ON staff_locations TO authenticated;
GRANT ALL ON staff_services TO authenticated;

-- Insert sample staff data (only if users exist)
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Get the admin user ID
    SELECT id INTO admin_user_id FROM users WHERE email = 'admin@example.com' LIMIT 1;
    
    -- Only insert sample data if admin user exists
    IF admin_user_id IS NOT NULL THEN
        INSERT INTO staff (user_id, first_name, last_name, email, phone, hire_date, role, bio, is_active) VALUES
        (
            admin_user_id,
            'Sarah',
            'Johnson',
            'sarah.johnson@clinic.com',
            '+1-555-0101',
            '2023-01-15',
            'technician',
            'Sarah is a certified ultrasound technician with 5+ years of experience in obstetric and gynecologic imaging.',
            true
        ),
        (
            admin_user_id,
            'Michael',
            'Chen',
            'michael.chen@clinic.com',
            '+1-555-0102',
            '2023-03-20',
            'technician',
            'Michael specializes in cardiac and vascular ultrasound with advanced training in echocardiography.',
            true
        ),
        (
            admin_user_id,
            'Emily',
            'Rodriguez',
            'emily.rodriguez@clinic.com',
            '+1-555-0103',
            '2023-06-10',
            'technician',
            'Emily is passionate about fetal imaging and has advanced experience in ultrasound imaging.',
            true
        );
    END IF;
END $$;

-- Insert sample staff-location assignments (only if staff and locations exist)
DO $$
DECLARE
    staff_sarah_id UUID;
    staff_michael_id UUID;
    staff_emily_id UUID;
    downtown_location_id UUID;
    westside_location_id UUID;
BEGIN
    -- Get staff IDs by email since employee_id is removed
    SELECT id INTO staff_sarah_id FROM staff WHERE email = 'sarah.johnson@clinic.com' LIMIT 1;
    SELECT id INTO staff_michael_id FROM staff WHERE email = 'michael.chen@clinic.com' LIMIT 1;
    SELECT id INTO staff_emily_id FROM staff WHERE email = 'emily.rodriguez@clinic.com' LIMIT 1;
    
    -- Get location IDs
    SELECT id INTO downtown_location_id FROM locations WHERE name = 'Downtown Clinic' LIMIT 1;
    SELECT id INTO westside_location_id FROM locations WHERE name = 'Westside Medical Center' LIMIT 1;
    
    -- Only insert if we have the required data
    IF staff_sarah_id IS NOT NULL AND staff_michael_id IS NOT NULL AND staff_emily_id IS NOT NULL 
       AND downtown_location_id IS NOT NULL AND westside_location_id IS NOT NULL THEN
        
        INSERT INTO staff_locations (staff_id, location_id, is_primary) VALUES
        (staff_sarah_id, downtown_location_id, true),
        (staff_sarah_id, westside_location_id, false),
        (staff_michael_id, westside_location_id, true),
        (staff_emily_id, downtown_location_id, true);
    END IF;
END $$;

-- Insert sample staff-service qualifications (only if staff and services exist)
DO $$
DECLARE
    staff_sarah_id UUID;
    staff_michael_id UUID;
    staff_emily_id UUID;
    service_12week_id UUID;
    service_20week_id UUID;
    service_3d_id UUID;
BEGIN
    -- Get staff IDs by email
    SELECT id INTO staff_sarah_id FROM staff WHERE email = 'sarah.johnson@clinic.com' LIMIT 1;
    SELECT id INTO staff_michael_id FROM staff WHERE email = 'michael.chen@clinic.com' LIMIT 1;
    SELECT id INTO staff_emily_id FROM staff WHERE email = 'emily.rodriguez@clinic.com' LIMIT 1;
    
    -- Get service IDs
    SELECT id INTO service_12week_id FROM services WHERE name = '12-Week Ultrasound' LIMIT 1;
    SELECT id INTO service_20week_id FROM services WHERE name = '20-Week Anatomy Scan' LIMIT 1;
    SELECT id INTO service_3d_id FROM services WHERE name = '3D/4D Ultrasound' LIMIT 1;
    
    -- Only insert if we have the required data
    IF staff_sarah_id IS NOT NULL AND staff_michael_id IS NOT NULL AND staff_emily_id IS NOT NULL 
       AND service_12week_id IS NOT NULL THEN
        
        INSERT INTO staff_services (staff_id, service_id, is_qualified, qualification_date, notes) VALUES
        (staff_sarah_id, service_12week_id, true, '2023-01-15', 'Primary technician for this service');
        
        -- Add 20-week service if it exists
        IF service_20week_id IS NOT NULL THEN
            INSERT INTO staff_services (staff_id, service_id, is_qualified, qualification_date, notes) VALUES
            (staff_sarah_id, service_20week_id, true, '2023-01-15', 'Certified for detailed anatomy scans');
        END IF;
        
        -- Add 3D service if it exists
        IF service_3d_id IS NOT NULL THEN
            INSERT INTO staff_services (staff_id, service_id, is_qualified, qualification_date, notes) VALUES
            (staff_emily_id, service_3d_id, true, '2023-06-10', 'Specializes in 3D/4D imaging');
        END IF;
    END IF;
END $$;

-- Create a view for staff with their locations and services
CREATE OR REPLACE VIEW staff_with_details AS
SELECT 
    s.*,
    u.email as user_email,
    u.role as user_role,
    COALESCE(
        json_agg(
            DISTINCT jsonb_build_object(
                'id', l.id,
                'name', l.name,
                'address', l.address,
                'is_primary', sl.is_primary
            )
        ) FILTER (WHERE l.id IS NOT NULL),
        '[]'::json
    ) as locations,
    COALESCE(
        json_agg(
            DISTINCT jsonb_build_object(
                'id', svc.id,
                'name', svc.name,
                'duration', svc.duration,
                'is_qualified', ss.is_qualified,
                'qualification_date', ss.qualification_date
            )
        ) FILTER (WHERE svc.id IS NOT NULL),
        '[]'::json
    ) as services
FROM staff s
LEFT JOIN users u ON s.user_id = u.id
LEFT JOIN staff_locations sl ON s.id = sl.staff_id
LEFT JOIN locations l ON sl.location_id = l.id
LEFT JOIN staff_services ss ON s.id = ss.staff_id
LEFT JOIN services svc ON ss.service_id = svc.id
GROUP BY s.id, u.email, u.role;
