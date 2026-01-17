-- Create time_off_requests table
CREATE TABLE IF NOT EXISTS public.time_off_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES public.users(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('sick', 'vacation', 'personal', 'other')),
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.time_off_requests ENABLE ROW LEVEL SECURITY;

-- Policies
-- Staff can view their own requests
CREATE POLICY "Staff view own requests" ON public.time_off_requests
    FOR SELECT USING (staff_id = auth.uid());

-- Staff can create requests
CREATE POLICY "Staff create requests" ON public.time_off_requests
    FOR INSERT WITH CHECK (staff_id = auth.uid());

-- Admins can view/edit all
CREATE POLICY "Admins full access" ON public.time_off_requests
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );
