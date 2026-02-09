import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/db/server-supabase';
import { createBooking } from '@/lib/bookings/createBooking';
import { sendBookingConfirmationEmail } from '@/lib/email';
import { formatEuroCents } from '@/lib/currency/format';
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
      isTwin,
      continuationToken,
    } = parsed.data;

    // Mutable variables for repeat logic override
    let finalServiceId = serviceId;
    let finalPrice = priceEurCents;
    let finalEndTime = endTime;
    let parentBookingId: string | undefined;
    let continuationId: string | undefined;

    if (continuationToken) {
      const supabase = getServiceSupabase();
      const { data: continuation, error: contError } = await supabase
        .from('booking_continuations')
        .select('*, repeat_type:service_repeat_types(*)')
        .eq('token', continuationToken)
        .single();

      if (contError || !continuation) {
        return NextResponse.json({ error: 'Invalid or expired continuation token' }, { status: 400 });
      }
      if (new Date(continuation.expires_at) < new Date()) {
        return NextResponse.json({ error: 'Continuation token expired' }, { status: 400 });
      }
      if (continuation.claimed_booking_id) {
        return NextResponse.json({ error: 'Continuation token already used' }, { status: 400 });
      }

      // Override booking details
      parentBookingId = continuation.parent_booking_id;
      continuationId = continuation.id;
      if (continuation.repeat_type) {
        finalServiceId = continuation.repeat_type.service_id;
        finalPrice = continuation.repeat_type.price_eur_cents;
        const start = new Date(startTime);
        const end = new Date(start.getTime() + continuation.repeat_type.duration_minutes * 60000);
        finalEndTime = end.toISOString();
      }
    }

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
      serviceId: finalServiceId,
      locationId,
      staffId,
      shiftId,
      startTime,
      endTime: finalEndTime,
      priceEurCents: finalPrice,
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
      isTwin,
      parentBookingId,
      continuationId,
    });

    // Mark continuation as claimed
    if (continuationId) {
      const supabase = getServiceSupabase();
      await supabase
        .from('booking_continuations')
        .update({ claimed_booking_id: booking.id })
        .eq('id', continuationId);
    }

    // --- Send Email Confirmation ---
    try {
      // Fetch location and service details for the email
      const supabase = getServiceSupabase();

      const [
        { data: serviceData },
        { data: locationData }
      ] = await Promise.all([
        supabase.from('services').select('name').eq('id', serviceId).single(),
        supabase.from('locations').select('name, address').eq('id', locationId).single()
      ]);

      const formattedDate = new Date(startTime).toLocaleDateString('nl-NL', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const formattedTime = new Date(startTime).toLocaleTimeString('nl-NL', {
        hour: '2-digit',
        minute: '2-digit'
      });

      // Prepare addons list if any
      let emailAddons: { name: string; price: string }[] = [];
      if (booking.booking_addons && booking.booking_addons.length > 0) {
        // We might need to fetch addon names if not readily available in the returned booking object 
        // (createBooking returns the inserted booking, usually without joined relations unless specified)
        // For simplicity, we can fetch them or rely on what we passed if we want to be quick.
        // Better to fetch to be accurate.
        const { data: addonsDetails } = await supabase
          .from('booking_addons')
          .select(`
            price_eur_cents, 
            service_addons(name),
            service_addon_options(name)
          `)
          .eq('booking_id', booking.id);

        if (addonsDetails) {
          emailAddons = addonsDetails.map(a => {
            const sa = Array.isArray(a.service_addons) ? a.service_addons[0] : a.service_addons;
            const sao = Array.isArray(a.service_addon_options) ? a.service_addon_options[0] : a.service_addon_options;
            const displayName = sao ? `${sa?.name} - ${sao.name}` : (sa?.name || 'Add-on');
            return {
              name: displayName,
              price: formatEuroCents(a.price_eur_cents)
            };
          });
        }
      }

      const emailRecipient = midwifeClientEmail || clientEmail;

      if (emailRecipient && serviceData && locationData) {
        await sendBookingConfirmationEmail(emailRecipient, {
          clientName: firstName,
          serviceName: serviceData.name,
          date: formattedDate,
          time: formattedTime,
          locationName: locationData.name,
          price: formatEuroCents(priceEurCents),
          bookingId: booking.id.substring(0, 8).toUpperCase(), // Short ID for display
          notes: notes,
          addons: emailAddons,
          googleMapsLink: locationData.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationData.address)}` : undefined
        });
      }
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
      // We do NOT fail the request if email fails, just log it.
    }
    // -------------------------------

    // -------------------------------

    // Clear the lock if sessionToken is present
    if (parsed.data.sessionToken) {
      await getServiceSupabase()
        .from('booking_locks')
        .delete()
        .eq('session_token', parsed.data.sessionToken);
    }

    // -------------------------------
    // MOLLIE PAYMENT INTEGRATION
    // -------------------------------
    let checkoutUrl: string | undefined;

    try {
      const { default: mollieClient } = await import('@/lib/mollie/client');

      const payment = await mollieClient.payments.create({
        amount: {
          currency: 'EUR',
          value: (priceEurCents / 100).toFixed(2),
        },
        description: `Order #${booking.id}`,
        redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/booking/confirmation?bookingId=${booking.id}`,
        webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/mollie`,
        metadata: {
          booking_id: booking.id,
        },
      });

      if (payment.id) {
        const supabase = getServiceSupabase();
        const { error: updateError, data: updatedBooking } = await supabase
          .from('bookings')
          .update({
            mollie_payment_id: payment.id,
            payment_link: payment._links.checkout?.href,
            payment_status: 'unpaid'
          })
          .eq('id', booking.id)
          .select();

        if (updateError) {
          console.error('[Booking API] Failed to update booking with payment ID:', updateError);
        } else {
          console.log('[Booking API] Successfully updated booking payment ID. Rows affected:', updatedBooking?.length);
        }

        checkoutUrl = payment._links.checkout?.href;
      }
    } catch (paymentError) {
      console.error('Failed to create Mollie payment:', paymentError);
      // We do NOT fail the request if payment creation fails, but the user won't get a redirect.
      // They will land on confirmation page with 'unpaid' status.
    }

    return NextResponse.json({ booking, checkoutUrl });
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
    const staffId = searchParams.get('staffId');

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
        services (
          id,
          name,
          duration
        ),
        locations (
          id,
          name,
          color
        ),
        staff (
          id,
          first_name,
          last_name
        )
      `, { count: 'exact' })
      .order('start_time', { ascending: false });

    // If clientId provided, filter by created_by (Legacy behavior for Client Dashboard - bookings they CREATED)
    if (clientId) {
      query = query.eq('created_by', clientId);
    }

    // If patientId provided, filter by client_id (For Midwife Dashboard - bookings where they are the CLIENT/PATIENT)
    const patientId = searchParams.get('patientId');
    if (patientId) {
      query = query.eq('client_id', patientId);
    }

    // If search provided, filter by matching user IDs
    if (matchingUserIds !== null && matchingUserIds.length > 0) {
      query = query.in('created_by', matchingUserIds);
    }

    // Filter by staffId if provided
    if (staffId) {
      query = query.eq('staff_id', staffId);
    }

    // Filter by status if provided
    if (status) {
      if (status.includes(',')) {
        const statuses = status.split(',').map(s => s.trim());
        query = query.in('status', statuses);
      } else {
        query = query.eq('status', status);
      }
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

    if (error) {
      console.error('Supabase Query Error:', error);
      return NextResponse.json({ error: error.message, details: error }, { status: 500 });
    }

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
          ),
          service_addon_options (
            id,
            name
          )
        `)
        .in('booking_id', bookingIds);

      // Group addons by booking_id
      for (const addon of addonsData || []) {
        if (!addon.booking_id) continue;
        const serviceAddon = Array.isArray(addon.service_addons)
          ? addon.service_addons[0]
          : addon.service_addons;

        const serviceAddonOption = Array.isArray(addon.service_addon_options)
          ? addon.service_addon_options[0]
          : addon.service_addon_options;

        if (!addonsMap[addon.booking_id]) {
          addonsMap[addon.booking_id] = [];
        }
        if (serviceAddon) {
          addonsMap[addon.booking_id].push({
            id: serviceAddon.id,
            name: serviceAddonOption ? `${serviceAddon.name} - ${serviceAddonOption.name}` : (serviceAddon.name || ''),
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

    // Manual fetch for 'users' (client info) via created_by
    const userIds = [...new Set((data || []).map(b => b.created_by).filter(Boolean))] as string[];
    let usersMap: Record<string, any> = {};

    if (userIds.length > 0) {
      const { data: usersData } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, phone')
        .in('id', userIds);

      if (usersData) {
        usersData.forEach(u => {
          usersMap[u.id] = u;
        });
      }
    }

    const bookingsFinal = bookingsWithAddons.map(b => ({
      ...b,
      users: usersMap[b.created_by] || null
    }));

    const totalPages = count ? Math.ceil(count / limit) : 0;

    return NextResponse.json({
      success: true,
      data: bookingsFinal,
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



