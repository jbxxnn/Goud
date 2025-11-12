import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/db/server-supabase';
import { createBooking } from '@/lib/bookings/createBooking';
import { createUserAndProfile } from '@/lib/auth/account';
import { bookingRequestSchema } from '@/lib/validation/booking';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = bookingRequestSchema.safeParse(body);

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      const flattened = parsed.error.flatten();
      return NextResponse.json(
        {
          error: firstIssue?.message || 'Ongeldige boekingsaanvraag',
          details: flattened.fieldErrors,
        },
        { status: 400 },
      );
    }

    const {
      clientId,
      clientEmail,
      firstName,
      lastName,
      phone,
      address,
      dueDate,
      birthDate,
      midwifeId,
      houseNumber,
      postalCode,
      streetName,
      city,
      notes,
      serviceId,
      locationId,
      staffId,
      shiftId,
      startTime,
      endTime,
      priceEurCents,
      policyAnswers,
      addons,
    } = parsed.data;

    // Resolve client id: use provided or find/create by email
    let resolvedClientId = clientId as string | undefined;
    if (!resolvedClientId && clientEmail) {
      const supabase = getServiceSupabase();
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .ilike('email', clientEmail)
        .limit(1)
        .maybeSingle();
      if (existing?.id) {
        resolvedClientId = existing.id;
        // Update only fields that are provided (non-empty) to allow users to update their info during checkout
        const updates: Record<string, string | null> = {};
        if (firstName !== undefined && firstName !== '') updates.first_name = firstName;
        if (lastName !== undefined && lastName !== '') updates.last_name = lastName;
        if (phone !== undefined && phone !== '') updates.phone = phone;
        if (address !== undefined && address !== '') updates.address = address;
        if (Object.keys(updates).length > 0) {
          await supabase.from('users').update(updates).eq('id', existing.id);
        }
      } else {
        const user = await createUserAndProfile({ email: clientEmail, firstName, lastName });
        resolvedClientId = user.id;
        await getServiceSupabase()
          .from('users')
          .update({ phone: phone ?? null, address: address ?? null })
          .eq('id', user.id);
      }
    }

    const booking = await createBooking({
      clientId: resolvedClientId!,
      serviceId,
      locationId,
      staffId,
      shiftId,
      startTime,
      endTime,
      priceEurCents,
      notes,
      dueDate,
      birthDate,
      midwifeId,
      houseNumber,
      postalCode,
      streetName,
      city,
      policyAnswers,
      addons,
    });

    return NextResponse.json({ booking });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error)?.message || 'Unexpected error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get('clientId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const search = searchParams.get('search');

    const supabase = getServiceSupabase();

    // If search query provided, first find matching user IDs
    let matchingUserIds: string[] | null = null;
    if (search && search.trim()) {
      const searchTerm = search.trim();
      const { data: matchingUsers, error: userSearchError } = await supabase
        .from('users')
        .select('id')
        .or(`email.ilike.%${searchTerm}%,first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%`);
      
      if (userSearchError) {
        return NextResponse.json({ error: 'Failed to search users' }, { status: 500 });
      }
      
      matchingUserIds = matchingUsers?.map(u => u.id) || [];
      if (matchingUserIds.length === 0) {
        // No matching users, return empty result
        return NextResponse.json({
          success: true,
          data: [],
          pagination: {
            page,
            limit,
            total: 0,
            total_pages: 0,
          },
        });
      }
    }

    let query = supabase
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
      .order('start_time', { ascending: false });

    // If clientId provided, filter by client
    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    // If search provided, filter by matching user IDs
    if (matchingUserIds !== null && matchingUserIds.length > 0) {
      query = query.in('client_id', matchingUserIds);
    }

    // Filter by status if provided
    if (status) {
      query = query.eq('status', status);
    }

    // Filter by date range if provided
    if (dateFrom) {
      query = query.gte('start_time', dateFrom);
    }
    if (dateTo) {
      query = query.lte('start_time', dateTo);
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const { data, error, count } = await query.range(from, to);

    if (error) return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });

    // Fetch add-ons for all bookings
    const bookingIds = (data || []).map((b) => b.id);
    const addonsMap: Record<string, Array<{
      id: string;
      name: string;
      description: string | null;
      quantity: number;
      price_eur_cents: number;
    }>> = {};
    
    if (bookingIds.length > 0) {
      const { data: addonsData } = await supabase
        .from('booking_addons')
        .select(`
          booking_id,
          quantity,
          price_eur_cents,
          service_addons (
            id,
            name,
            description,
            price
          )
        `)
        .in('booking_id', bookingIds);
      
      // Group addons by booking_id
      for (const addon of addonsData || []) {
        if (!addon.booking_id) continue;
        const serviceAddon = Array.isArray(addon.service_addons) 
          ? addon.service_addons[0] 
          : addon.service_addons;
        
        if (!addonsMap[addon.booking_id]) {
          addonsMap[addon.booking_id] = [];
        }
        if (serviceAddon) {
          addonsMap[addon.booking_id].push({
            id: serviceAddon.id,
            name: serviceAddon.name || '',
            description: serviceAddon.description || null,
            quantity: addon.quantity || 1,
            price_eur_cents: addon.price_eur_cents || 0,
          });
        }
      }
    }

    // Attach addons to each booking
    const bookingsWithAddons = (data || []).map((booking) => ({
      ...booking,
      addons: addonsMap[booking.id] || [],
    }));

    const totalPages = count ? Math.ceil(count / limit) : 0;

    return NextResponse.json({
      success: true,
      data: bookingsWithAddons,
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: totalPages,
      },
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error)?.message || 'Unexpected error' }, { status: 500 });
  }
}



