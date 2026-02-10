import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/db/server-supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get('date'); // ISO YYYY-MM-DD
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!dateStr) {
      return NextResponse.json({ error: 'Missing date parameter' }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    // Parse date and get start/end of day
    const selectedDate = new Date(`${dateStr}T00:00:00.000Z`);
    const dayStart = new Date(selectedDate);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(selectedDate);
    dayEnd.setUTCHours(23, 59, 59, 999);

    // Get bookings for the selected date
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: bookings, error, count } = await supabase
      .from('bookings')
      .select(`
        *,
        users:users!client_id (
          id,
          email,
          first_name,
          last_name,
          phone
        ),
        services:services!service_id (
          id,
          service_code,
          name,
          duration
        ),
        locations:locations!location_id (
          id,
          name
        ),
        staff:staff!staff_id (
          id,
          first_name,
          last_name
        )
      `, { count: 'exact' })
      .gte('start_time', dayStart.toISOString())
      .lte('start_time', dayEnd.toISOString())
      .neq('status', 'cancelled')
      .order('start_time', { ascending: true })
      .range(from, to);

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch upcoming appointments' }, { status: 500 });
    }

    // Fetch created_by users if any
    let data = bookings;
    if (bookings && bookings.length > 0) {
      const createdByIds = Array.from(new Set(bookings.map((b: any) => b.created_by).filter(Boolean)));

      if (createdByIds.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, first_name, last_name, email, phone')
          .in('id', createdByIds);

        const userMap = new Map(users?.map((u) => [u.id, u]) || []);

        data = bookings.map((b: any) => ({
          ...b,
          created_by_user: b.created_by ? userMap.get(b.created_by) || null : null
        }));
      }
    }

    // Count total for the day
    const { count: totalCount } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .gte('start_time', dayStart.toISOString())
      .lte('start_time', dayEnd.toISOString())
      .neq('status', 'cancelled');

    const totalPages = count ? Math.ceil(count / limit) : 0;

    return NextResponse.json({
      success: true,
      data: data || [],
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        total_pages: totalPages,
      },
    });
  } catch (e: unknown) {
    console.error('[dashboard/upcoming] error', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unexpected error' }, { status: 500 });
  }
}


