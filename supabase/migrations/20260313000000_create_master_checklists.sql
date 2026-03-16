-- Create master_checklists table
CREATE TABLE IF NOT EXISTS public.master_checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.users(id),
    is_active BOOLEAN DEFAULT TRUE
);

-- Create master_checklist_items table
CREATE TABLE IF NOT EXISTS public.master_checklist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checklist_id UUID NOT NULL REFERENCES public.master_checklists(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    item_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create mapping table for checklists and services
CREATE TABLE IF NOT EXISTS public.master_checklist_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checklist_id UUID NOT NULL REFERENCES public.master_checklists(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(checklist_id, service_id)
);

-- Index for performance
CREATE INDEX idx_master_checklist_items_checklist_id ON public.master_checklist_items(checklist_id);
CREATE INDEX idx_master_checklist_services_checklist_id ON public.master_checklist_services(checklist_id);
CREATE INDEX idx_master_checklist_services_service_id ON public.master_checklist_services(service_id);

-- Enable RLS
ALTER TABLE public.master_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_checklist_services ENABLE ROW LEVEL SECURITY;

-- Policies for master_checklists
CREATE POLICY "Allow read for authenticated users" ON public.master_checklists
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow all for admin and assistant" ON public.master_checklists
    FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (role = 'admin' OR role = 'assistant')));

-- Policies for master_checklist_items
CREATE POLICY "Allow read for authenticated users" ON public.master_checklist_items
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow all for admin and assistant" ON public.master_checklist_items
    FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (role = 'admin' OR role = 'assistant')));

-- Policies for master_checklist_services
CREATE POLICY "Allow read for authenticated users" ON public.master_checklist_services
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow all for admin and assistant" ON public.master_checklist_services
    FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (role = 'admin' OR role = 'assistant')));
