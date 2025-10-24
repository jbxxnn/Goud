-- Final Locations table for the Prenatal Ultrasound Booking System
-- This is the clean, simplified version with only essential fields

-- Drop the existing table if it exists (be careful in production!)
DROP TABLE IF EXISTS locations CASCADE;

-- Create the simplified locations table
CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_locations_name ON locations(name);
CREATE INDEX idx_locations_is_active ON locations(is_active);
CREATE INDEX idx_locations_created_at ON locations(created_at);

-- Create the updated_at trigger function (if it doesn't exist)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_locations_updated_at 
    BEFORE UPDATE ON locations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can read active locations" ON locations;
DROP POLICY IF EXISTS "Authenticated users can read all locations" ON locations;
DROP POLICY IF EXISTS "Authenticated users can insert locations" ON locations;
DROP POLICY IF EXISTS "Authenticated users can update locations" ON locations;
DROP POLICY IF EXISTS "Authenticated users can delete locations" ON locations;

-- Create RLS policies
-- Everyone can read active locations (for booking)
CREATE POLICY "Anyone can read active locations" ON locations
    FOR SELECT USING (is_active = true);

-- Authenticated users can read all locations
CREATE POLICY "Authenticated users can read all locations" ON locations
    FOR SELECT USING (auth.role() = 'authenticated');

-- Authenticated users can insert locations
CREATE POLICY "Authenticated users can insert locations" ON locations
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Authenticated users can update locations
CREATE POLICY "Authenticated users can update locations" ON locations
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Authenticated users can delete locations
CREATE POLICY "Authenticated users can delete locations" ON locations
    FOR DELETE USING (auth.role() = 'authenticated');

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON locations TO anon, authenticated;

-- Insert some sample data for testing
INSERT INTO locations (name, address, phone, email, is_active) VALUES
('Downtown Clinic', '123 Main Street, Suite 100', '(555) 123-4567', 'downtown@clinic.com', true),
('Uptown Medical Center', '456 Oak Avenue', '(555) 987-6543', 'uptown@clinic.com', true),
('Westside Branch', '789 Pine Road', '(555) 456-7890', 'westside@clinic.com', false);


