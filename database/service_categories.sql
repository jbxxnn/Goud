-- Service Categories table for organizing services
-- This table stores service categories like "Prenatal", "Gender Reveal", etc.

CREATE TABLE IF NOT EXISTS service_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_service_categories_name ON service_categories(name);
CREATE INDEX IF NOT EXISTS idx_service_categories_is_active ON service_categories(is_active);

-- Create trigger for updated_at
CREATE TRIGGER update_service_categories_updated_at 
    BEFORE UPDATE ON service_categories 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can read active categories" ON service_categories
    FOR SELECT USING (is_active = true);

CREATE POLICY "Authenticated users can read all categories" ON service_categories
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert categories" ON service_categories
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update categories" ON service_categories
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete categories" ON service_categories
    FOR DELETE USING (auth.role() = 'authenticated');

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON service_categories TO anon, authenticated;

-- Insert some default categories
INSERT INTO service_categories (name, description) VALUES
('Prenatal', 'Prenatal ultrasound services'),
('Gender Reveal', 'Gender reveal and 3D/4D scans'),
('Growth Monitoring', 'Fetal growth and development scans'),
('High Risk', 'High-risk pregnancy monitoring'),
('Routine', 'Routine pregnancy checkups');
