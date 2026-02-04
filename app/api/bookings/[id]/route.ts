import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/db/server-supabase';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
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
      `)
      .eq('id', id)
      .maybeSingle();

    if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Fetch add-ons for this booking
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
      .eq('booking_id', id);

    const addons = (addonsData || []).map((addon) => {
      const serviceAddon = Array.isArray(addon.service_addons)
        ? addon.service_addons[0]
        : addon.service_addons;
      return {
        id: serviceAddon?.id || '',
        name: serviceAddon?.name || '',
        description: serviceAddon?.description || null,
        quantity: addon.quantity || 1,
        price_eur_cents: addon.price_eur_cents || 0,
      };
    });

    return NextResponse.json({
      booking: {
        ...data,
        addons,
      }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { start_time, end_time, location_id, staff_id, shift_id } = body || {};
    if (!start_time || !end_time) return NextResponse.json({ error: 'start_time and end_time required' }, { status: 400 });
    if (!location_id || !staff_id || !shift_id) return NextResponse.json({ error: 'location_id, staff_id, and shift_id required' }, { status: 400 });

    const supabase = getServiceSupabase();
    // Fetch existing booking with details for email
    const { data: existing, error: getErr } = await supabase
      .from('bookings')
      .select(`
        id,
        status,
        start_time,
        users!client_id ( email, first_name ),
        services ( name ),
        locations ( name )
      `)
      .eq('id', id)
      .maybeSingle();

    if (getErr || !existing) {
      console.error('Failed to find booking for reschedule:', getErr);
      return NextResponse.json({ error: getErr ? getErr.message : 'Not found' }, { status: 404 });
    }
    if (existing.status === 'cancelled') return NextResponse.json({ error: 'Cannot reschedule cancelled booking' }, { status: 400 });

    // Verify the shift matches the location and staff
    const { data: shift, error: shiftErr } = await supabase
      .from('shifts')
      .select(`
        id,
        staff_id,
        location_id,
        is_active,
        locations ( name, address )
      `)
      .eq('id', shift_id)
      .maybeSingle();

    if (shiftErr || !shift) {
      console.error('Failed to find shift for reschedule:', shiftErr);
      return NextResponse.json({ error: shiftErr ? shiftErr.message : 'Shift not found' }, { status: 404 });
    }
    if (!shift.is_active) return NextResponse.json({ error: 'Shift is not active' }, { status: 400 });
    if (shift.location_id !== location_id) return NextResponse.json({ error: 'Shift location mismatch' }, { status: 400 });
    if (shift.staff_id !== staff_id) return NextResponse.json({ error: 'Shift staff mismatch' }, { status: 400 });

    // Update booking with new location, staff, shift, and times
    const { error: updErr, data } = await supabase
      .from('bookings')
      .update({
        start_time: start_time,
        end_time: end_time,
        location_id: location_id,
        staff_id: staff_id,
        shift_id: shift_id,
        // Reset reminder_sent when rescheduling so they get a new reminder
        reminder_sent: false
      })
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (updErr || !data) {
      console.error('Failed to update booking:', updErr);
      const msg = String(updErr?.message || '').toLowerCase();
      if (msg.includes('duplicate')) return NextResponse.json({ error: 'Slot already taken' }, { status: 409 });
      return NextResponse.json({ error: 'Failed to reschedule' }, { status: 500 });
    }

    // Send Reschedule Email
    try {
      // Safe access for array/object returns
      const userOrUsers = existing.users as any;
      const userData = Array.isArray(userOrUsers) ? userOrUsers[0] : userOrUsers;
      const clientEmail = userData?.email;
      const clientName = userData?.first_name || 'Client';

      const serviceOrServices = existing.services as any;
      const serviceData = Array.isArray(serviceOrServices) ? serviceOrServices[0] : serviceOrServices;
      const serviceName = serviceData?.name || 'Service';

      // Old date formatting
      const oldDateObj = new Date(existing.start_time);
      const oldDate = oldDateObj.toLocaleDateString('nl-NL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const oldTime = oldDateObj.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });

      // New location from shift query
      const locOrLocs = shift.locations as any;
      const locData = Array.isArray(locOrLocs) ? locOrLocs[0] : locOrLocs;
      const locationName = locData?.name || 'Location';
      const address = locData?.address;

      // New date formatting
      const newDateObj = new Date(start_time);
      const newDate = newDateObj.toLocaleDateString('nl-NL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const newTime = newDateObj.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });

      const googleMapsLink = address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
        : undefined;

      if (clientEmail) {
        const { sendBookingRescheduledEmail } = await import('@/lib/email');
        await sendBookingRescheduledEmail(clientEmail, {
          clientName,
          serviceName,
          oldDate,
          oldTime,
          newDate,
          newTime,
          locationName,
          bookingId: existing.id.substring(0, 8).toUpperCase(),
          googleMapsLink
        });
      }
    } catch (emailError) {
      console.error('Failed to send reschedule email:', emailError);
      // Don't block the response if email fails
    }

    return NextResponse.json({ booking: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status, notes } = body || {};

    // Build update object with only provided fields
    const updates: Record<string, any> = {};
    if (status !== undefined) updates.status = status;
    if (notes !== undefined) updates.notes = notes === null || notes === '' ? null : notes;
    if (body.internal_notes !== undefined) updates.internal_notes = body.internal_notes === null || body.internal_notes === '' ? null : body.internal_notes;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    // Fetch existing booking to include related data
    const { data: existing } = await supabase
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
      `)
      .eq('id', id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Update booking
    const { data, error } = await supabase
      .from('bookings')
      .update(updates)
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 });
    }

    // Send cancellation email if status changed to cancelled
    if (updates.status === 'cancelled') {
      // Run in background (fire and forget) to not block response
      triggerCancellationEmail(existing).catch(err => console.error('Background email error:', err));
      triggerRefund(existing).catch(err => console.error('Background refund error:', err));
    }

    // Fetch add-ons if they exist
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
      .eq('booking_id', id);

    const addons = (addonsData || []).map((addon) => {
      const serviceAddon = Array.isArray(addon.service_addons)
        ? addon.service_addons[0]
        : addon.service_addons;
      return {
        id: serviceAddon?.id || '',
        name: serviceAddon?.name || '',
        description: serviceAddon?.description || null,
        quantity: addon.quantity || 1,
        price_eur_cents: addon.price_eur_cents || 0,
      };
    });

    // Merge with existing related data
    const updatedBooking = {
      ...data,
      users: existing.users,
      services: existing.services,
      locations: existing.locations,
      staff: existing.staff,
      addons,
    };

    return NextResponse.json({ booking: updatedBooking });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}

// Helper to trigger cancellation email
async function triggerCancellationEmail(existingBooking: any) {
  try {
    const userOrUsers = existingBooking.users as any;
    const userData = Array.isArray(userOrUsers) ? userOrUsers[0] : userOrUsers;
    const clientEmail = userData?.email;
    const clientName = userData?.first_name || 'Client';

    const serviceOrServices = existingBooking.services as any;
    const serviceData = Array.isArray(serviceOrServices) ? serviceOrServices[0] : serviceOrServices;
    const serviceName = serviceData?.name || 'Service';

    const locOrLocs = existingBooking.locations as any;
    const locData = Array.isArray(locOrLocs) ? locOrLocs[0] : locOrLocs;
    const locationName = locData?.name || 'Location';

    const dateObj = new Date(existingBooking.start_time);
    const date = dateObj.toLocaleDateString('nl-NL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const time = dateObj.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });

    if (clientEmail) {
      const { sendBookingCancellationEmail } = await import('@/lib/email');
      await sendBookingCancellationEmail(clientEmail, {
        clientName,
        serviceName,
        date,
        time,
        locationName,
        bookingId: existingBooking.id.substring(0, 8).toUpperCase(),
      });
    }
  } catch (emailError) {
    console.error('Failed to send cancellation email:', emailError);
  }
}

// Helper to trigger Mollie refund
async function triggerRefund(booking: any) {
  console.log('[triggerRefund] Checking refund for booking:', booking.id, 'Payment ID:', booking.mollie_payment_id);

  if (!booking.mollie_payment_id) {
    console.log('[triggerRefund] No mollie_payment_id found, skipping.');
    return;
  }

  try {
    const { processRefundOrCancel } = await import('@/lib/mollie/actions');
    const result = await processRefundOrCancel(booking.mollie_payment_id, booking.price_eur_cents);

    // Update DB status if meaningful change
    const supabase = getServiceSupabase();
    let status = 'refunded';
    if (result === 'payment_cancelled') status = 'canceled';
    if (result === 'no_action') return; // Don't overwrite if nothing happened

    await supabase
      .from('bookings')
      .update({ payment_status: status })
      .eq('id', booking.id);

  } catch (e: any) {
    console.error('Failed to trigger refund:', e);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = getServiceSupabase();

    // Check if booking exists and is cancelled
    const { data: existing, error: checkErr } = await supabase
      .from('bookings')
      .select('id, status')
      .eq('id', id)
      .maybeSingle();

    if (checkErr || !existing) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    if (existing.status !== 'cancelled') {
      return NextResponse.json({ error: 'Only cancelled bookings can be deleted' }, { status: 400 });
    }

    // Permanently delete the cancelled booking
    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', id);

    if (error) return NextResponse.json({ error: 'Failed to delete booking' }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}






