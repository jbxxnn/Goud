import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/db/server-supabase';

// GET /api/staff/by-location-service?locationId=X&serviceId=Y
// Returns staff qualified for the service and assigned to the location
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const locationId = searchParams.get('locationId');
    const serviceId = searchParams.get('serviceId');

    if (!locationId || !serviceId) {
      return NextResponse.json({ error: 'Missing locationId or serviceId' }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    // Get staff assigned to the location and qualified for the service
    const { data, error } = await supabase
      .from('staff')
      .select(`
        id,
        first_name,
        last_name,
        email,
        is_active,
        staff_locations!inner(location_id),
        staff_services!inner(service_id, is_qualified)
      `)
      .eq('staff_locations.location_id', locationId)
      .eq('staff_services.service_id', serviceId)
      .eq('staff_services.is_qualified', true)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching staff by location/service:', error);
      return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 });
    }

    // Filter out duplicates and format
    const uniqueStaff = new Map();
    for (const s of data || []) {
      if (!uniqueStaff.has(s.id)) {
        uniqueStaff.set(s.id, {
          id: s.id,
          first_name: s.first_name,
          last_name: s.last_name,
          email: s.email,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: Array.from(uniqueStaff.values()),
    });
  } catch (e: any) {
    console.error('Error in GET /api/staff/by-location-service:', e);
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}

