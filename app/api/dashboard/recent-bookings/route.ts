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
          created_by,
          start_time,
          end_time,
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

    // Fetch created_by users if any
    let bookings = data || [];
    if (bookings.length > 0) {
      const createdByIds = Array.from(new Set(bookings.map((b: any) => b.created_by).filter(Boolean)));

      if (createdByIds.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, first_name, last_name, email')
          .in('id', createdByIds);

        const userMap = new Map(users?.map((u) => [u.id, u]) || []);

        bookings = bookings.map((b: any) => ({
          ...b,
          created_by_user: b.created_by ? userMap.get(b.created_by) || null : null
        }));
      }
    }

    // Fetch add-ons for all bookings
    const bookingIds = bookings.map((b: any) => b.id);
    const addonsMap: Record<string, Array<any>> = {};

    if (bookingIds.length > 0) {
      const { data: addonsData } = await supabase
        .from('booking_addons')
        .select('booking_id, addon_id, quantity, price_eur_cents, option_id')
        .in('booking_id', bookingIds);

      if (addonsData && addonsData.length > 0) {
        const addonIds = [...new Set(addonsData.map(a => a.addon_id).filter(Boolean))];
        const optionIds = [...new Set(addonsData.map(a => a.option_id).filter(Boolean))];

        let serviceAddons: any[] = [];
        let serviceOptions: any[] = [];

        if (addonIds.length > 0) {
          const { data: saData } = await supabase.from('service_addons').select('id, name, description, price').in('id', addonIds);
          serviceAddons = saData || [];
        }
        
        if (optionIds.length > 0) {
          const { data: soData } = await supabase.from('service_addon_options').select('id, name').in('id', optionIds);
          serviceOptions = soData || [];
        }

        // Group addons by booking_id
        for (const addon of addonsData) {
          if (!addon.booking_id) continue;
          
          const sa = serviceAddons.find(s => s.id === addon.addon_id);
          const so = serviceOptions.find(o => o.id === addon.option_id);

          if (!addonsMap[addon.booking_id]) {
            addonsMap[addon.booking_id] = [];
          }
          if (sa) {
            addonsMap[addon.booking_id].push({
              id: sa.id,
              name: so ? `${sa.name} - ${so.name}` : (sa.name || ''),
              description: sa.description || null,
              quantity: addon.quantity || 1,
              price_eur_cents: addon.price_eur_cents || Math.round((sa.price || 0) * 100),
              option_id: addon.option_id
            });
          }
        }
        console.log('API AddonsMap:', JSON.stringify(addonsMap, null, 2));
      }
    }

    const formatted =
      bookings.map((booking: any) => {
        const client = booking.users;
        const createdBy = booking.created_by_user;
        const staff = booking.staff;
        const service = booking.services;
        const location = booking.locations;

        const primaryUser = createdBy || client;

        const clientName =
          [primaryUser?.first_name, primaryUser?.last_name].filter(Boolean).join(' ').trim() ||
          primaryUser?.email ||
          'Unknown';

        const staffName =
          [staff?.first_name, staff?.last_name].filter(Boolean).join(' ').trim() || null;

        return {
          id: booking.id,
          clientName,
          clientEmail: primaryUser?.email ?? null,
          serviceName: service?.name ?? 'Unknown service',
          serviceCode: service?.service_code ?? null,
          staffName,
          locationName: location?.name ?? null,
          startTime: booking.start_time,
          endTime: booking.end_time,
          status: booking.status,
          price_eur_cents: booking.price_eur_cents,
          isRepeat: !!booking.parent_booking_id,
          parentBookingId: booking.parent_booking_id,
          addons: addonsMap[booking.id] || [],
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

