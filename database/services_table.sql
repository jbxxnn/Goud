-- Services table for the Prenatal Ultrasound Booking System
-- This table stores all available services with their configuration rules

CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    duration INTEGER NOT NULL, -- Duration in minutes
    buffer_time INTEGER DEFAULT 0, -- Buffer time in minutes between appointments
    lead_time INTEGER DEFAULT 0, -- Minimum lead time in hours before booking
    reschedule_cutoff INTEGER DEFAULT 24, -- Hours before appointment when rescheduling is no longer allowed
    instructions TEXT, -- Instructions for clients
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_services_name ON services(name);
CREATE INDEX IF NOT EXISTS idx_services_is_active ON services(is_active);
CREATE INDEX IF NOT EXISTS idx_services_created_at ON services(created_at);

-- Create trigger for updated_at
CREATE TRIGGER update_services_updated_at 
    BEFORE UPDATE ON services 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Everyone can read active services (for booking)
CREATE POLICY "Anyone can read active services" ON services
    FOR SELECT USING (is_active = true);

-- Only admins can read all services (including inactive)
CREATE POLICY "Admins can read all services" ON services
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Only admins can insert services
CREATE POLICY "Admins can insert services" ON services
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Only admins can update services
CREATE POLICY "Admins can update services" ON services
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Only admins can delete services
CREATE POLICY "Admins can delete services" ON services
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON services TO anon, authenticated;
