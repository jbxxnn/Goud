-- Service Policy Fields table for dynamic form fields
-- This table stores custom fields that can be added to services

CREATE TABLE IF NOT EXISTS service_policy_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    field_type VARCHAR(50) NOT NULL CHECK (field_type IN ('multi_choice', 'text_input', 'number_input', 'date_time', 'checkbox', 'file_upload')),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    is_required BOOLEAN DEFAULT false,
    field_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Service Policy Field Choices table for multi-choice options
CREATE TABLE IF NOT EXISTS service_policy_field_choices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    field_id UUID NOT NULL REFERENCES service_policy_fields(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) DEFAULT 0.00,
    choice_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_service_policy_fields_service_id ON service_policy_fields(service_id);
CREATE INDEX IF NOT EXISTS idx_service_policy_fields_order ON service_policy_fields(field_order);
CREATE INDEX IF NOT EXISTS idx_service_policy_field_choices_field_id ON service_policy_field_choices(field_id);
CREATE INDEX IF NOT EXISTS idx_service_policy_field_choices_order ON service_policy_field_choices(choice_order);

-- Create triggers for updated_at
CREATE TRIGGER update_service_policy_fields_updated_at 
    BEFORE UPDATE ON service_policy_fields 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_policy_field_choices_updated_at 
    BEFORE UPDATE ON service_policy_field_choices 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE service_policy_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_policy_field_choices ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for service_policy_fields
CREATE POLICY "Anyone can read active policy fields" ON service_policy_fields
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM services 
            WHERE id = service_policy_fields.service_id AND is_active = true
        )
    );

CREATE POLICY "Authenticated users can read all policy fields" ON service_policy_fields
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert policy fields" ON service_policy_fields
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update policy fields" ON service_policy_fields
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete policy fields" ON service_policy_fields
    FOR DELETE USING (auth.role() = 'authenticated');

-- Create RLS policies for service_policy_field_choices
CREATE POLICY "Anyone can read active policy field choices" ON service_policy_field_choices
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM service_policy_fields spf
            JOIN services s ON s.id = spf.service_id
            WHERE spf.id = service_policy_field_choices.field_id AND s.is_active = true
        )
    );

CREATE POLICY "Authenticated users can read all policy field choices" ON service_policy_field_choices
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert policy field choices" ON service_policy_field_choices
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update policy field choices" ON service_policy_field_choices
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete policy field choices" ON service_policy_field_choices
    FOR DELETE USING (auth.role() = 'authenticated');

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON service_policy_fields TO anon, authenticated;
GRANT ALL ON service_policy_field_choices TO anon, authenticated;
