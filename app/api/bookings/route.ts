import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/db/server-supabase';
import { createClient } from '@/lib/supabase/server';
import { createBooking } from '@/lib/bookings/createBooking';
import { sendBookingConfirmationEmail } from '@/lib/email';
import { formatEuroCents } from '@/lib/currency/format';
import { createUserAndProfile } from '@/lib/auth/account';
import { bookingRequestSchema } from '@/lib/validation/booking';

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunked: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunked.push(array.slice(i, i + size));
  }
  return chunked;
}

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
      otherMidwifeName,
      houseNumber,
      postalCode,
      streetName,
      city,
      notes,
      gravida,
      para,
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
      if (midwifeId !== undefined && midwifeId !== null && midwifeId !== '' && midwifeId !== 'other' && typeof midwifeId === 'string') {
        updates.midwife_id = midwifeId.trim();
      }

      if (Object.keys(updates).length > 0) {
        await supabase.from('users').update(updates).eq('id', targetUpdateUserId);
      }
    }

    let finalNotes = notes || '';

    const booking = await createBooking({
      clientId: resolvedClientId!,
      serviceId: finalServiceId,
      locationId,
      staffId,
      shiftId,
      startTime,
      endTime: finalEndTime,
      priceEurCents: finalPrice,
      notes: finalNotes,
      dueDate,
      birthDate,
      midwifeId: midwifeId === 'other' ? undefined : midwifeId,
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
      gravida,
      para,
      otherMidwifeName,
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
          .select('booking_id, addon_id, quantity, price_eur_cents, option_id')
          .eq('booking_id', booking.id);

        if (addonsDetails && addonsDetails.length > 0) {
          const addonIds = [...new Set(addonsDetails.map(a => a.addon_id).filter(Boolean))];
          const optionIds = [...new Set(addonsDetails.map(a => a.option_id).filter(Boolean))];

          let serviceAddons: any[] = [];
          let serviceOptions: any[] = [];

          if (addonIds.length > 0) {
            const { data: saData } = await supabase.from('service_addons').select('id, name').in('id', addonIds);
            serviceAddons = saData || [];
          }
          if (optionIds.length > 0) {
            const { data: soData } = await supabase.from('service_addon_options').select('id, name').in('id', optionIds);
            serviceOptions = soData || [];
          }

          emailAddons = addonsDetails.map(a => {
            const sa = serviceAddons.find(s => s.id === a.addon_id);
            const sao = serviceOptions.find(o => o.id === a.option_id);
            const displayName = sao ? `${sa?.name} - ${sao.name}` : (sa?.name || 'Add-on');
            
            return {
              name: displayName,
              price: formatEuroCents(a.price_eur_cents)
            };
          });
        }
      }

      // Determine email recipient(s)
      let emailRecipients: string[] = [];
      if (clientEmail) {
         emailRecipients.push(clientEmail);
      }
      if (midwifeClientEmail && midwifeClientEmail !== clientEmail) {
         emailRecipients.push(midwifeClientEmail);
      }
      // Depending on Auth setup, createdByUserId might belong to an email we don't know directly here.
      // Easiest is to just use clientEmail and midwifeClientEmail which are passed in the payload.
      if (emailRecipients.length === 0) {
         console.warn('No email recipient found for confirmation email.');
      }

      if (emailRecipients.length > 0 && serviceData && locationData) {
        await sendBookingConfirmationEmail(emailRecipients, {
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
    const locationId = searchParams.get('locationId');
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('order') || searchParams.get('sortOrder') || 'desc';

    const authSupabase = await createClient();
    const { data: { user }, error: authError } = await authSupabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getServiceSupabase();

    // Fetch user profile to get their role
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const userRole = userProfile?.role || 'client';

    // If search query provided, first find matching user IDs
    let matchingUserIds: string[] | null = null;
    let exactDateFilter = '';
    let partialDateUserIds: string[] = [];
    let numbers: string[] = [];
    let searchTerm = '';
    let terms: string[] = [];

    if (search && search.trim()) {
      searchTerm = search.trim();
      
      const isDutchDate = /^\d{1,2}[\s\-./]\d{1,2}[\s\-./]\d{2,4}$/.test(searchTerm);
      const isIsoDate = /^\d{4}[\s\-./]\d{1,2}[\s\-./]\d{1,2}$/.test(searchTerm);
      const isPartialDate = /^[0-9\-\/.\s]+$/.test(searchTerm);
      
      if (isDutchDate) {
          const parts = searchTerm.split(/[\s\-./]+/);
          let y = parts[2];
          if (y.length === 2) y = parseInt(y) > 20 ? `19${y}` : `20${y}`;
          const m = parts[1].padStart(2, '0');
          const d = parts[0].padStart(2, '0');
          exactDateFilter = `${y}-${m}-${d}`;
      } else if (isIsoDate) {
          const parts = searchTerm.split(/[\s\-./]+/);
          const y = parts[0];
          const m = parts[1].padStart(2, '0');
          const d = parts[2].padStart(2, '0');
          exactDateFilter = `${y}-${m}-${d}`;
      } else if (isPartialDate) {
          // It's a partial date like "2026" or "02-20". Supabase doesn't support ilike on dates.
          // We will fetch all booking IDs and their dates, and filter them in JS.
          const { data: partialBookings } = await supabase.from('bookings').select('id, birth_date').not('birth_date', 'is', null);
          if (partialBookings) {
             const cleanSearch = searchTerm.replace(/[\s./]/g, '-');
             const matchedIds = partialBookings
                 .filter(b => b.birth_date && b.birth_date.includes(cleanSearch))
                 .map(b => b.id);
             
             if (matchedIds.length > 0) {
                 exactDateFilter = `partial_ids:${matchedIds.join(',')}`;
             } else {
                 exactDateFilter = 'partial_ids:none';
             }
          }
      }

      let queryBuilder = supabase.from('users').select('id');
      // Instead of keeping users.birth_date, we will just use the `first_name`, `last_name`, and `email` for users table search
      terms = searchTerm.split(/\s+/).filter(Boolean);
      const orConditions = terms.map(term => `first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%`);
      
      orConditions.forEach(condition => {
          queryBuilder = queryBuilder.or(condition);
      });

      const { data: matchingUsers, error: userSearchError } = await queryBuilder;
      
      console.log('SearchTerm:', searchTerm);
      console.log('Terms:', terms);
      console.log('exactDateFilter:', exactDateFilter);
      console.log('partialDateUserIds:', partialDateUserIds);
      console.log('matchingUsers from regex/name:', matchingUsers);

      if (userSearchError) {
        return NextResponse.json({ error: 'Failed to search users' }, { status: 500 });
      }

      let matchingUserIdsSet = new Set<string>();
      if (matchingUsers) {
        matchingUsers.forEach(u => matchingUserIdsSet.add(u.id));
      }

      matchingUserIds = Array.from(matchingUserIdsSet);
      if (matchingUserIds.length === 0 && !exactDateFilter) {
        // No matching users and no valid date filter constructed, return empty
        return NextResponse.json({
          debug_info: { searchTerm, terms, exactDateFilter, partialDateUserIds, matchingUsers },
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

    const anyUserId = searchParams.get('anyUserId');
    const patientId = searchParams.get('patientId');

    // --- Status Counts Logic ---
    const statusKeys = ['pending', 'confirmed', 'cancelled', 'ongoing', 'completed', 'no_show'];
    
    const buildBaseFilter = (q: any) => {
        let filtered = q;
        if (anyUserId) {
          filtered = filtered.or(`created_by.eq.${anyUserId},client_id.eq.${anyUserId}`);
        }
        if (clientId && !anyUserId) {
          filtered = filtered.eq('created_by', clientId);
        }
        if (patientId && !anyUserId) {
          filtered = filtered.eq('client_id', patientId);
        }

        if (matchingUserIds !== null && matchingUserIds.length > 0) {
          const idList = `(${matchingUserIds.join(',')})`;
          if (exactDateFilter) {
              if (exactDateFilter.startsWith('partial_ids:')) {
                 const val = exactDateFilter.split(':')[1];
                 if (val !== 'none') {
                    filtered = filtered.or(`client_id.in.${idList},created_by.in.${idList},id.in.(${val})`);
                 } else {
                    filtered = filtered.or(`client_id.in.${idList},created_by.in.${idList}`);
                 }
              } else {
                 filtered = filtered.or(`client_id.in.${idList},created_by.in.${idList},birth_date.eq.${exactDateFilter}`);
              }
          } else {
              filtered = filtered.or(`client_id.in.${idList},created_by.in.${idList}`);
          }
        } else if (exactDateFilter) {
            if (exactDateFilter.startsWith('partial_ids:')) {
               const val = exactDateFilter.split(':')[1];
               if (val !== 'none') {
                   filtered = filtered.or(`id.in.(${val})`);
               } else {
                   filtered = filtered.eq('id', '00000000-0000-0000-0000-000000000000');
               }
            } else {
               filtered = filtered.or(`birth_date.eq.${exactDateFilter}`);
            }
        }

        if (staffId) filtered = filtered.eq('staff_id', staffId);
        if (locationId && locationId !== 'all') filtered = filtered.eq('location_id', locationId);
        if (dateFrom) filtered = filtered.gte('start_time', dateFrom);
        if (dateTo) filtered = filtered.lte('start_time', dateTo);
        
        // --- Security Boundary ---
        if (userRole === 'client') {
            filtered = filtered.or(`created_by.eq.${user.id},client_id.eq.${user.id}`);
        } else if (userRole === 'midwife') {
            filtered = filtered.eq('client_id', user.id);
        }
        // staff, admin, and assistant can view all (filters applied above suffice)
        
        return filtered;
    };

    const statusCountsPromise = Promise.all([
        buildBaseFilter(supabase.from('bookings').select('*', { count: 'exact', head: true })),
        ...statusKeys.map(s => buildBaseFilter(supabase.from('bookings').select('*', { count: 'exact', head: true })).eq('status', s))
    ]).then(results => {
        const counts: Record<string, number> = {
            all: results[0].count || 0
        };
        statusKeys.forEach((s, i) => {
            counts[s] = results[i+1].count || 0;
        });
        return counts;
    });

    let query = supabase
      .from('bookings')
      .select(`
        *,
        birth_date,
        due_date,
        midwife_id,
        gravida,
        para,
        other_midwife_name,
        services (
          id,
          name,
          service_code,
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
      `, { count: 'exact' });

    query = buildBaseFilter(query);

    if (status) {
      if (status.includes(',')) {
        const statuses = status.split(',').map(s => s.trim());
        query = query.in('status', statuses);
      } else {
        query = query.eq('status', status);
      }
    }

    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const [ { data, error, count }, statusCounts ] = await Promise.all([
        query.range(from, to),
        statusCountsPromise
    ]);

    if (error) {
      console.error('Supabase Query Error:', error);
      return NextResponse.json({ error: error.message, details: error }, { status: 500 });
    }

    let finalData = data || [];
    let finalCount = count || 0;

    // Fetch add-ons for all bookings
    const bookingIds = finalData.map((b) => b.id);
    const addonsMap: Record<string, Array<{
      id: string;
      name: string;
      description: string | null;
      quantity: number;
      price_eur_cents: number;
      option_id?: string | null;
    }>> = {};

    if (bookingIds.length > 0) {
      // Chunk results to avoid URI length limits when requesting many IDs at once
      const idChunks = chunkArray(bookingIds, 100);
      const results = await Promise.all(idChunks.map(chunk => 
        supabase
          .from('booking_addons')
          .select('booking_id, addon_id, quantity, price_eur_cents, option_id')
          .in('booking_id', chunk)
      ));
      const addonsData = results.flatMap(r => r.data || []);

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
      }
    }

    // Attach addons to each booking
    const bookingsWithAddons = finalData.map((booking) => ({
      ...booking,
      addons: addonsMap[booking.id] || [],
    }));

    // Manual fetch for 'users' (client info)
    // Priority MUST be created_by (Booker) -> client_id (Patient fallback)
    // We fetch users for both fields to ensure we have the data.
    const createdByIds = finalData.map(b => b.created_by).filter(Boolean) as string[];
    const clientIds = finalData.map(b => b.client_id).filter(Boolean) as string[];
    const userIds = [...new Set([...createdByIds, ...clientIds])];

    let usersMap: Record<string, any> = {};

    if (userIds.length > 0) {
      // Chunk results to avoid URI length limits when requesting many IDs at once
      const idChunks = chunkArray(userIds, 100);
      const results = await Promise.all(idChunks.map(chunk => 
        supabase
          .from('users')
          .select('id, email, first_name, last_name, phone, address, house_number, street_name, postal_code, city, birth_date, midwife_id')
          .in('id', chunk)
      ));
      const usersData = results.flatMap(r => r.data || []);

      if (usersData) {
        usersData.forEach(u => {
          usersMap[u.id] = u;
        });
      }
    }

    const bookingsFinal = bookingsWithAddons.map(b => ({
      ...b,
      users: usersMap[b.created_by] || usersMap[b.client_id] || null,
      isRepeat: !!b.parent_booking_id
    }));

    const totalPagesValue = finalCount ? Math.ceil(finalCount / limit) : 0;

    return NextResponse.json({
      success: true,
      data: bookingsFinal,
      pagination: {
        page,
        limit,
        total: finalCount,
        total_pages: totalPagesValue,
      },
      statusCounts
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error)?.message || 'Unexpected error' }, { status: 500 });
  }
}



