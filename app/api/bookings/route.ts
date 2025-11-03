import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/db/server-supabase';
import { createBooking } from '@/lib/bookings/createBooking';
import { createUserAndProfile } from '@/lib/auth/account';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      clientId,
      clientEmail,
      firstName,
      lastName,
      phone,
      address,
      serviceId,
      locationId,
      staffId,
      shiftId,
      startTime,
      endTime,
      priceEurCents,
      notes,
    } = body || {};

    if ((!clientId && !clientEmail) || !serviceId || !locationId || !staffId || !shiftId || !startTime || !endTime || typeof priceEurCents !== 'number') {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

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
        await getServiceSupabase().from('users').update({ phone: phone ?? null, address: address ?? null }).eq('id', user.id);
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
    });

    return NextResponse.json({ booking });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
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

    const totalPages = count ? Math.ceil(count / limit) : 0;

    return NextResponse.json({
      success: true,
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: totalPages,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}



