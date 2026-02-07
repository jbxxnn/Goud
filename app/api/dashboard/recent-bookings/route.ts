import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/db/server-supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    const supabase = getServiceSupabase();

    const { data, error } = await supabase
      .from('bookings')
      .select(
        `
          id,
          start_time,
          status,
          parent_booking_id,
          continuation_id,
          users:users!client_id (
            first_name,
            last_name,
            email
          ),
          services:services!service_id (
            name,
            service_code
          ),
          staff:staff!staff_id (
            first_name,
            last_name
          ),
          locations:locations!location_id (
            name
          )
        `
      )
      .neq('status', 'cancelled')
      .order('start_time', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[dashboard/recent-bookings] supabase error', error);
      return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
    }

    const formatted =
      data?.map((booking: any) => {
        const client = booking.users;
        const staff = booking.staff;
        const service = booking.services;
        const location = booking.locations;

        const clientName =
          [client?.first_name, client?.last_name].filter(Boolean).join(' ').trim() ||
          client?.email ||
          'Unknown';

        const staffName =
          [staff?.first_name, staff?.last_name].filter(Boolean).join(' ').trim() || null;

        return {
          id: booking.id,
          clientName,
          clientEmail: client?.email ?? null,
          serviceName: service?.name ?? 'Unknown service',
          serviceCode: service?.service_code ?? null,
          staffName,
          locationName: location?.name ?? null,
          startTime: booking.start_time,
          status: booking.status,
          isRepeat: !!booking.parent_booking_id,
          parentBookingId: booking.parent_booking_id,
        };
      }) ?? [];

    return NextResponse.json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    console.error('[dashboard/recent-bookings] error', error);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}

