import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/db/server-supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '5');
    
    const supabase = getServiceSupabase();
    
    // Get staff with their locations and services
    const { data: staffData, error } = await supabase
      .from('staff')
      .select(`
        id,
        first_name,
        last_name,
        phone,
        staff_locations (
          location_id,
          locations:locations!location_id (
            id,
            name
          )
        ),
        staff_services (
          service_id,
          services:services!service_id (
            id,
            name
          )
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 });
    }
    
    // Format the data to match what we need
    const formattedStaff = (staffData || []).map((s: any) => ({
      id: s.id,
      first_name: s.first_name,
      last_name: s.last_name,
      phone: s.phone,
      locations: (s.staff_locations || []).map((sl: any) => sl.locations?.name || '').filter(Boolean),
      services: (s.staff_services || []).map((ss: any) => ss.services?.name || '').filter(Boolean),
    }));
    
    return NextResponse.json({
      success: true,
      data: formattedStaff,
    });
  } catch (e: any) {
    console.error('[dashboard/staff] error', e);
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}


