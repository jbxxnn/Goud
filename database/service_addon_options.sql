-- Create service_addon_options table
CREATE TABLE IF NOT EXISTS public.service_addon_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    addon_id UUID NOT NULL REFERENCES public.service_addons(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) DEFAULT 0.00,
    option_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_service_addon_options_addon_id ON public.service_addon_options(addon_id);

-- Update booking_addons table to include option_id
ALTER TABLE public.booking_addons ADD COLUMN IF NOT EXISTS option_id UUID REFERENCES public.service_addon_options(id) ON DELETE SET NULL;

-- Enable RLS for service_addon_options
ALTER TABLE service_addon_options ENABLE ROW LEVEL SECURITY;

-- RLS Policies for service_addon_options
CREATE POLICY "Anyone can read active addon options" ON service_addon_options
    FOR SELECT USING (
        is_active = true AND 
        EXISTS (
            SELECT 1 FROM service_addons 
            WHERE id = service_addon_options.addon_id AND is_active = true
        )
    );

CREATE POLICY "Admins can manage addon options" ON service_addon_options
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Trigger for updated_at
CREATE TRIGGER update_service_addon_options_updated_at 
    BEFORE UPDATE ON service_addon_options 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
