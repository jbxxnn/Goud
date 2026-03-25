import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/db/server-supabase';
import { createClient } from '@/lib/supabase/server';
import { expandRecurringShift } from '@/lib/utils/expand-recurring-shifts';

// Helper function to verify user authentication and authorization for a specific booking
async function authorizeBookingAccess(bookingId: string, action: 'read' | 'update' | 'delete') {
  const authSupabase = await createClient();
  const { data: { user }, error: authError } = await authSupabase.auth.getUser();

  if (authError || !user) {
    return { authorized: false, error: 'Unauthorized', status: 401 };
  }

  const supabase = getServiceSupabase();

  // Fetch the booking owner info
  const { data: booking } = await supabase
    .from('bookings')
    .select('client_id, created_by')
    .eq('id', bookingId)
    .single();

  if (!booking) {
    return { authorized: false, error: 'Booking not found', status: 404 };
  }

  // Fetch user role
  const { data: userProfile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = userProfile?.role || 'client';

  // Role-based access control
  if (role === 'admin' || role === 'staff' || role === 'assistant') {
    return { authorized: true, supabase };
  }

  // Client and Midwife limits - cannot delete
  if (action === 'delete') {
    return { authorized: false, error: 'Forbidden: Only staff can delete bookings', status: 403 };
  }

  // Client rules: must be owner
  if (role === 'client') {
    if (booking.client_id !== user.id && booking.created_by !== user.id) {
      return { authorized: false, error: 'Forbidden: You do not own this booking', status: 403 };
    }
  }

  // Midwife rules: must have booked it
  if (role === 'midwife') {
    if (booking.client_id !== user.id) {
      return { authorized: false, error: 'Forbidden: You did not create this booking', status: 403 };
    }
  }

  return { authorized: true, supabase };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    // Check authorization
    const authResult = await authorizeBookingAccess(id, 'read');
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const supabase = authResult.supabase!;

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
          duration,
          custom_price_label,
          custom_price_description
        ),
        locations:locations!location_id (
          id,
          name
        ),
        staff:staff!staff_id (
          id,
          first_name,
          last_name
        ),
        booking_tag_mappings (
          tag:booking_tags (*)
        )
      `)
      .eq('id', id)
      .maybeSingle();

    if (error || !data) {
      if (error) console.error('Error fetching booking:', error);
      return NextResponse.json({ error: 'Not found', details: error }, { status: 404 });
    }

    // Fetch add-ons for this booking without PostgREST joins to circumvent missing FK constraint
    const { data: addonsData } = await supabase
      .from('booking_addons')
      .select('booking_id, addon_id, quantity, price_eur_cents, option_id')
      .eq('booking_id', id);

    let addons: any[] = [];
    if (addonsData && addonsData.length > 0) {
      const addonIds = [...new Set(addonsData.map((a: any) => a.addon_id).filter(Boolean))];
      const optionIds = [...new Set(addonsData.map((a: any) => a.option_id).filter(Boolean))];

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

      addons = addonsData.map((addon) => {
        const sa = serviceAddons.find(s => s.id === addon.addon_id);
        const so = serviceOptions.find(o => o.id === addon.option_id);
        
        return {
          id: sa?.id || addon.booking_id || '',
          name: so ? `${sa?.name} - ${so.name}` : (sa?.name || 'Add-on'),
          description: sa?.description || null,
          quantity: addon.quantity || 1,
          price_eur_cents: addon.price_eur_cents || Math.round((sa?.price || 0) * 100),
          option_id: addon.option_id
        };
      });
    }

    // Fetch created_by user details if present
    let createdByUser = null;
    if (data.created_by) {
      const { data: user } = await supabase
        .from('users')
        .select('first_name, last_name, email, phone')
        .eq('id', data.created_by)
        .single();
      createdByUser = user;
    }

    // Fetch Protocol Checklist Counts
    const { data: protocolItems } = await supabase
      .from('booking_protocol_checklist_items')
      .select('is_completed')
      .eq('booking_id', id);
    
    const protocol_items_count = protocolItems?.length || 0;
    const protocol_completed_count = protocolItems?.filter(i => i.is_completed).length || 0;

    return NextResponse.json({
      booking: {
        ...data,
        addons,
        created_by_user: createdByUser,
        isRepeat: !!data.parent_booking_id,
        protocol_items_count,
        protocol_completed_count
      }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Check authorization
    const authResult = await authorizeBookingAccess(id, 'update');
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const supabase = authResult.supabase!;

    const body = await req.json();
    const { start_time, end_time, location_id, staff_id, shift_id } = body || {};
    if (!start_time || !end_time) return NextResponse.json({ error: 'start_time and end_time required' }, { status: 400 });
    if (!location_id || !staff_id || !shift_id) return NextResponse.json({ error: 'location_id, staff_id, and shift_id required' }, { status: 400 });

    const baseShiftId = shift_id.split('-instance-')[0];

    // Fetch existing booking with details for email
    const { data: existing, error: getErr } = await supabase
      .from('bookings')
      .select(`
        id,
        status,
        start_time,
        client:users!client_id ( email, first_name ),
        created_by_user:users!created_by ( email ),
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
        is_recurring,
        recurrence_rule,
        start_time,
        end_time,
        locations ( name, address )
      `)
      .eq('id', baseShiftId)
      .maybeSingle();

    if (shiftErr || !shift) {
      console.error('Failed to find shift for reschedule:', shiftErr);
      return NextResponse.json({ error: shiftErr ? shiftErr.message : 'Shift not found' }, { status: 404 });
    }
    if (!shift.is_active) return NextResponse.json({ error: 'Shift is not active' }, { status: 400 });
    if (shift.location_id !== location_id) return NextResponse.json({ error: 'Shift location mismatch' }, { status: 400 });
    if (shift.staff_id !== staff_id) return NextResponse.json({ error: 'Shift staff mismatch' }, { status: 400 });

    // Time window checks for recurring shifts
    const start = new Date(start_time);
    const end = new Date(end_time);
    
    let validStart = new Date(shift.start_time);
    let validEnd = new Date(shift.end_time);

    if (shift_id.includes('-instance-') || shift.is_recurring) {
      const windowStart = new Date(start.getTime() - 24 * 60 * 60 * 1000);
      const windowEnd = new Date(start.getTime() + 24 * 60 * 60 * 1000);
      const instances = expandRecurringShift(shift as any, windowStart, windowEnd);

      const instance = instances.find(inst => {
        const s = new Date(inst.start_time);
        const e = new Date(inst.end_time);
        return start >= s && end <= e;
      });

      if (!instance) {
        return NextResponse.json({ error: 'Selected time is outside shift hours' }, { status: 400 });
      }
      validStart = new Date(instance.start_time);
      validEnd = new Date(instance.end_time);
    }

    if (start < validStart || end > validEnd) {
      return NextResponse.json({ error: 'Selected time is outside shift hours' }, { status: 400 });
    }

    // Update booking with new location, staff, shift, and times
    const { error: updErr, data } = await supabase
      .from('bookings')
      .update({
        start_time: start_time,
        end_time: end_time,
        location_id: location_id,
        staff_id: staff_id,
        shift_id: baseShiftId,
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
      // We need to fetch both client and booker emails if they differ
      const clientEmail = (existing.client as any)?.email;
      const clientName = (existing.client as any)?.first_name || 'Client';
      const createdByEmail = (existing.created_by_user as any)?.email;

      let emailRecipients: string[] = [];
      if (clientEmail) emailRecipients.push(clientEmail);
      if (createdByEmail && createdByEmail !== clientEmail) emailRecipients.push(createdByEmail);

      if (emailRecipients.length === 0) {
         console.warn('No email recipient found for reschedule email.');
      }

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

      if (emailRecipients.length > 0) {
        const { sendBookingRescheduledEmail } = await import('@/lib/email');
        await sendBookingRescheduledEmail(emailRecipients, {
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

    // Check authorization
    const authResult = await authorizeBookingAccess(id, 'update');
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const supabase = authResult.supabase!;

    const body = await req.json();
    const { status, notes, payment_status } = body || {};

    // Build update object with only provided fields
    const updates: Record<string, any> = {};
    if (status !== undefined) updates.status = status;
    if (notes !== undefined) updates.notes = notes === null || notes === '' ? null : notes;
    if (body.internal_notes !== undefined) updates.internal_notes = body.internal_notes === null || body.internal_notes === '' ? null : body.internal_notes;
    if (body.no_show_resolved_at !== undefined) updates.no_show_resolved_at = body.no_show_resolved_at;
    if (body.no_show_resolved_by !== undefined) updates.no_show_resolved_by = body.no_show_resolved_by;
    if (payment_status !== undefined) updates.payment_status = payment_status;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

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
          duration,
          custom_price_label,
          custom_price_description
        ),
        locations:locations!location_id (
          id,
          name
        ),
        staff:staff!staff_id (
          id,
          first_name,
          last_name
        ),
        booking_tag_mappings (
          tag:booking_tags (*)
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
      
      // Only trigger refund if the booking wasn't already completed or a no-show
      const skipRefundStatuses = ['completed', 'no_show'];
      if (!skipRefundStatuses.includes(existing.status)) {
        triggerRefund(existing).catch(err => console.error('Background refund error:', err));
      } else {
        console.log(`[PATCH] Skipping refund for booking ${id} because previous status was ${existing.status}`);
      }
    }

    // Fetch add-ons if they exist
    const { data: addonsData } = await supabase
      .from('booking_addons')
      .select('booking_id, addon_id, quantity, price_eur_cents, option_id')
      .eq('booking_id', id);

    let addons: any[] = [];
    if (addonsData && addonsData.length > 0) {
      const addonIds = [...new Set(addonsData.map((a: any) => a.addon_id).filter(Boolean))];
      const optionIds = [...new Set(addonsData.map((a: any) => a.option_id).filter(Boolean))];

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

      addons = addonsData.map((addon) => {
        const sa = serviceAddons.find(s => s.id === addon.addon_id);
        const so = serviceOptions.find(o => o.id === addon.option_id);

        return {
          id: sa?.id || addon.booking_id || '',
          name: so ? `${sa?.name} - ${so.name}` : (sa?.name || 'Add-on'),
          description: sa?.description || null,
          quantity: addon.quantity || 1,
          price_eur_cents: addon.price_eur_cents || Math.round((sa?.price || 0) * 100),
          option_id: addon.option_id
        };
      });
    }

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
    // We need to fetch both client and booker emails if they differ
    const clientEmail = (existingBooking.client as any)?.email;
    const clientName = (existingBooking.client as any)?.first_name || 'Client';
    const createdByEmail = (existingBooking.created_by_user as any)?.email;

    let emailRecipients: string[] = [];
    if (clientEmail) emailRecipients.push(clientEmail);
    if (createdByEmail && createdByEmail !== clientEmail) emailRecipients.push(createdByEmail);

    if (emailRecipients.length === 0) {
        console.warn('No email recipient found for cancellation email.');
    }

    const serviceOrServices = existingBooking.services as any;
    const serviceData = Array.isArray(serviceOrServices) ? serviceOrServices[0] : serviceOrServices;
    const serviceName = serviceData?.name || 'Service';

    const locOrLocs = existingBooking.locations as any;
    const locData = Array.isArray(locOrLocs) ? locOrLocs[0] : locOrLocs;
    const locationName = locData?.name || 'Location';

    const dateObj = new Date(existingBooking.start_time);
    const date = dateObj.toLocaleDateString('nl-NL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const time = dateObj.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });

    if (emailRecipients.length > 0) {
      const { sendBookingCancellationEmail } = await import('@/lib/email');
      await sendBookingCancellationEmail(emailRecipients, {
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

    // Check authorization (only staff/admin/assistant allowed)
    const authResult = await authorizeBookingAccess(id, 'delete');
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const supabase = authResult.supabase!;

    // Check if booking exists and is cancelled
    const { data: existing, error: checkErr } = await supabase
      .from('bookings')
      .select('id, status')
      .eq('id', id)
      .maybeSingle();

    if (checkErr || !existing) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    if (existing.status !== 'cancelled') {
        // Technically we usually only allow deleting cancelled bookings, but if the user
        // really wants to force delete, they should cancel it first.
        // For now, we keep this check.
      return NextResponse.json({ error: 'Only cancelled bookings can be deleted' }, { status: 400 });
    }

    // Clean up related data to avoid foreign key violations
    // 1. Delete booking addons
    const { error: addonsError } = await supabase
      .from('booking_addons')
      .delete()
      .eq('booking_id', id);

    if (addonsError) {
      console.error('Failed to delete booking addons:', addonsError);
      return NextResponse.json({ error: 'Failed to delete related addons' }, { status: 500 });
    }

    // 2. Delete checklist items
    const { error: checklistError } = await supabase
      .from('booking_checklist_items')
      .delete()
      .eq('booking_id', id);

    if (checklistError) {
      console.error('Failed to delete checklist items:', checklistError);
      return NextResponse.json({ error: 'Failed to delete related checklist items' }, { status: 500 });
    }

    // 3. Handle continuations
    // If this booking is a parent of a continuation, delete the continuation (it relies on this parent)
    // BUT first, we must unlink any child booking that references this continuation token
    
    // Find continuations linked to this parent booking
    const { data: parentContinuations } = await supabase
        .from('booking_continuations')
        .select('id')
        .eq('parent_booking_id', id);

    if (parentContinuations && parentContinuations.length > 0) {
        const continuationIds = parentContinuations.map(c => c.id);
        
        // Unlink child bookings referencing these continuations
        const { error: unlinkError } = await supabase
            .from('bookings')
            .update({ continuation_id: null })
            .in('continuation_id', continuationIds);

        if (unlinkError) {
             console.error('Failed to unlink child bookings from continuations:', unlinkError);
             return NextResponse.json({ error: 'Failed to unlink related child bookings' }, { status: 500 });
        }

        // Now safe to delete the continuations
        const { error: parentContError } = await supabase
            .from('booking_continuations')
            .delete()
            .eq('parent_booking_id', id);
        
        if (parentContError) {
            console.error('Failed to delete parent continuations:', parentContError);
            return NextResponse.json({ error: 'Failed to delete related continuations' }, { status: 500 });
        }
    }

    // If this booking itself claimed a continuation, release it (set claimed_booking_id to null)
    // blocking the delete of the booking if we don't clear this reference (if the FK is on claimed_booking_id)
    const { error: claimedContError } = await supabase
        .from('booking_continuations')
        .update({ claimed_booking_id: null })
        .eq('claimed_booking_id', id);

    if (claimedContError) {
        console.error('Failed to release claimed continuations:', claimedContError);
        return NextResponse.json({ error: 'Failed to update related continuations' }, { status: 500 });
    }

    // 4. Handle child bookings (linked via parent_booking_id)
    // If other bookings reference this one as a parent, unlink them
    const { error: childBookingError } = await supabase
        .from('bookings')
        .update({ parent_booking_id: null })
        .eq('parent_booking_id', id);

    if (childBookingError) {
        console.error('Failed to unlink child bookings:', childBookingError);
        return NextResponse.json({ error: 'Failed to unlink child bookings' }, { status: 500 });
    }

    // Permanently delete the cancelled booking
    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', id);

    if (error) {
        // If still finding FK violation, log it clearly
        console.error('Delete booking error:', error);
        return NextResponse.json({ error: 'Failed to delete booking', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}






