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
      midwifeClientEmail,
    } = parsed.data;

    // Resolve created_by:
    // 1. If midwifeClientEmail provided, look up that user's ID (midwife booking for client)
    // 2. Otherwise use the currently logged-in user's ID
    let createdByUserId: string | undefined;

    if (midwifeClientEmail) {
      const supabase = getServiceSupabase();
      const { data: cwUser } = await supabase
        .from('users')
        .select('id')
        .ilike('email', midwifeClientEmail)
        .maybeSingle();

      if (cwUser?.id) {
        createdByUserId = cwUser.id;
      } else {
        // User not found, create new account for client
        const newUser = await createUserAndProfile({
          email: midwifeClientEmail,
          firstName: firstName,
          lastName: lastName,
        });
        createdByUserId = newUser.id;
      }
    }

    if (!createdByUserId) {
      const authHeader = req.headers.get('Authorization');
      const token = authHeader?.replace('Bearer ', '') || '';
      const sessionResponse = await getServiceSupabase().auth.getUser(token);
      createdByUserId = sessionResponse.data.user?.id;
    }

    // Resolve client id: use provided or find/create by email
    let resolvedClientId = clientId as string | undefined;
    if (!resolvedClientId && clientEmail) {
      const supabase = getServiceSupabase();
      // Logic for resolving client_id (Booking Owner)
      // Note: If this is a midwife booking, clientEmail is the midwife's email, so resolvedClientId = Midwife ID.
      // If regular booking, clientEmail is user's email, resolvedClientId = User ID.
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .ilike('email', clientEmail)
        .limit(1)
        .maybeSingle();

      if (existing?.id) {
        resolvedClientId = existing.id;
      } else {
        // Fallback if no user exists for clientEmail (unlikely for logged-in user, but possible)
        const user = await createUserAndProfile({ email: clientEmail, firstName, lastName });
        resolvedClientId = user.id;
      }
    }

    // UPDATE PROFILE DATA LOGIC
    // We update the profile of whoever the "Target" is.
    // If midwifeClientEmail is present -> Target is createdByUserId (The Client).
    // If NOT present -> Target is resolvedClientId (The User booking for themselves).

    const targetUpdateUserId = midwifeClientEmail ? createdByUserId : resolvedClientId;

    if (targetUpdateUserId) {
      const supabase = getServiceSupabase();
      const updates: Record<string, string | null> = {};
      if (firstName !== undefined && firstName !== '') updates.first_name = firstName;
      if (lastName !== undefined && lastName !== '') updates.last_name = lastName;
      if (phone !== undefined && phone !== '') updates.phone = phone;
      if (address !== undefined && address !== '') updates.address = address;
      if (postalCode !== undefined && postalCode !== '') updates.postal_code = postalCode;
      if (houseNumber !== undefined && houseNumber !== '') updates.house_number = houseNumber;
      if (streetName !== undefined && streetName !== '') updates.street_name = streetName;
      if (city !== undefined && city !== '') updates.city = city;
      if (birthDate !== undefined && birthDate !== '') updates.birth_date = birthDate;

      // midwifeId logic:
      // If midwife is booking (midwifeClientEmail present), we might want to set the client's midwife_id to THIS midwife.
      // Assuming 'midwifeId' in payload is the selected midwife from dropdown.
      if (midwifeId !== undefined && midwifeId !== null && midwifeId !== '' && typeof midwifeId === 'string') {
        updates.midwife_id = midwifeId.trim();
      }

      if (Object.keys(updates).length > 0) {
        await supabase.from('users').update(updates).eq('id', targetUpdateUserId);
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
      createdBy: createdByUserId,
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



