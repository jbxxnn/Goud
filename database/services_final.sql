-- Final Services table for the Prenatal Ultrasound Booking System
-- This is the clean version with proper RLS policies

-- Drop the existing table if it exists (be careful in production!)
DROP TABLE IF EXISTS services CASCADE;

-- Create the services table
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    duration INTEGER NOT NULL DEFAULT 30, -- Duration in minutes
    buffer_time INTEGER NOT NULL DEFAULT 0, -- Buffer time in minutes between appointments
    lead_time INTEGER NOT NULL DEFAULT 0, -- Minimum lead time in hours before booking
    reschedule_cutoff INTEGER NOT NULL DEFAULT 24, -- Hours before appointment when rescheduling is no longer allowed
    instructions TEXT,
    price DECIMAL(10,2) DEFAULT 0.00, -- Service price in euros
    sale_price DECIMAL(10,2) DEFAULT NULL, -- Sale price in euros (optional)
    cancel_cutoff INTEGER DEFAULT NULL, -- Hours before appointment when cancellation is no longer allowed
    scheduling_window INTEGER DEFAULT 12, -- How many weeks in advance can be booked
    category_id UUID REFERENCES service_categories(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_services_name ON services(name);
CREATE INDEX idx_services_is_active ON services(is_active);
CREATE INDEX idx_services_created_at ON services(created_at);

-- Create the updated_at trigger function (if it doesn't exist)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_services_updated_at 
    BEFORE UPDATE ON services 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can read active services" ON services;
DROP POLICY IF EXISTS "Authenticated users can read all services" ON services;
DROP POLICY IF EXISTS "Authenticated users can insert services" ON services;
DROP POLICY IF EXISTS "Authenticated users can update services" ON services;
DROP POLICY IF EXISTS "Authenticated users can delete services" ON services;

-- Create RLS policies
-- Everyone can read active services (for booking)
CREATE POLICY "Anyone can read active services" ON services
    FOR SELECT USING (is_active = true);

-- Authenticated users can read all services
CREATE POLICY "Authenticated users can read all services" ON services
    FOR SELECT USING (auth.role() = 'authenticated');

-- Authenticated users can insert services
CREATE POLICY "Authenticated users can insert services" ON services
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Authenticated users can update services
CREATE POLICY "Authenticated users can update services" ON services
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Authenticated users can delete services
CREATE POLICY "Authenticated users can delete services" ON services
    FOR DELETE USING (auth.role() = 'authenticated');

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON services TO anon, authenticated;

-- Insert some sample data for testing
INSERT INTO services (name, description, duration, buffer_time, lead_time, reschedule_cutoff, instructions, price, is_active) VALUES
('12-Week Ultrasound', 'First trimester screening ultrasound', 30, 15, 24, 48, 'Please arrive 15 minutes early and bring a full bladder', 150.00, true),
('20-Week Anatomy Scan', 'Detailed fetal anatomy examination', 45, 30, 48, 72, 'This is a comprehensive scan - allow extra time', 200.00, true),
('Growth Scan', 'Fetal growth and development assessment', 30, 15, 24, 24, 'Routine growth monitoring', 120.00, false);

