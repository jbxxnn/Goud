import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/db/server-supabase';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { staffId, startDate, endDate, type, reason } = body;

        if (!staffId || !startDate || !endDate || !type) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // --- Authorization Check ---
        const authSupabase = await createClient();
        const { data: { user }, error: authError } = await authSupabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = getServiceSupabase();

        const { data: userProfile } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();

        const role = userProfile?.role;
        if (role !== 'admin' && role !== 'staff' && role !== 'assistant') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        // ---------------------------

        // Validate staff exists
        // (Optional, FK will catch it, but good for error msg)

        const { data, error } = await supabase
            .from('time_off_requests')
            .insert({
                staff_id: staffId,
                start_date: startDate,
                end_date: endDate,
                type,
                reason
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, data });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || 'Error processing request' }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const staffId = searchParams.get('staffId');

    if (!staffId) return NextResponse.json({ error: 'Staff ID required' }, { status: 400 });

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
        .from('time_off_requests')
        .select('*')
        .eq('staff_id', staffId)
        .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, data });
}

export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, status } = body;

        if (!id || !status) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

        // --- Authorization Check ---
        const authSupabase = await createClient();
        const { data: { user }, error: authError } = await authSupabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = getServiceSupabase();

        const { data: userProfile } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();

        const role = userProfile?.role;
        if (role !== 'admin' && role !== 'staff' && role !== 'assistant') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        // ---------------------------
        
        const { data, error } = await supabase
            .from('time_off_requests')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, data });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
