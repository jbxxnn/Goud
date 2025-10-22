-- Service add-ons table for the Prenatal Ultrasound Booking System
-- This table stores optional add-ons that can be added to services

CREATE TABLE IF NOT EXISTS service_addons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) DEFAULT 0.00,
    is_required BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_service_addons_service_id ON service_addons(service_id);
CREATE INDEX IF NOT EXISTS idx_service_addons_is_active ON service_addons(is_active);
CREATE INDEX IF NOT EXISTS idx_service_addons_is_required ON service_addons(is_required);

-- Create trigger for updated_at
CREATE TRIGGER update_service_addons_updated_at 
    BEFORE UPDATE ON service_addons 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE service_addons ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Everyone can read active add-ons for active services
CREATE POLICY "Anyone can read active add-ons" ON service_addons
    FOR SELECT USING (
        is_active = true AND 
        EXISTS (
            SELECT 1 FROM services 
            WHERE id = service_addons.service_id AND is_active = true
        )
    );

-- Only admins can read all add-ons
CREATE POLICY "Admins can read all add-ons" ON service_addons
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Only admins can insert add-ons
CREATE POLICY "Admins can insert add-ons" ON service_addons
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Only admins can update add-ons
CREATE POLICY "Admins can update add-ons" ON service_addons
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Only admins can delete add-ons
CREATE POLICY "Admins can delete add-ons" ON service_addons
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON service_addons TO anon, authenticated;
