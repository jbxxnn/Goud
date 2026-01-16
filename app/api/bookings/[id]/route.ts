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
        services:services!service_id (
          id,
          name,
          duration
        ),
        locations:locations!location_id (
          id,
          name,
          color
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

    // Fetch user (client info) manually
    let user = null;
    if (data.created_by) {
      const { data: userData } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, phone')
        .eq('id', data.created_by)
        .maybeSingle();
      user = userData;
    }

    return NextResponse.json({
      booking: {
        ...data,
        addons,
        users: user,
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
    const { data: existing, error: getErr } = await supabase
      .from('bookings')
      .select('id, status')
      .eq('id', id)
      .maybeSingle();
    if (getErr || !existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (existing.status === 'cancelled') return NextResponse.json({ error: 'Cannot reschedule cancelled booking' }, { status: 400 });

    // Verify the shift matches the location and staff
    const { data: shift, error: shiftErr } = await supabase
      .from('shifts')
      .select('id, staff_id, location_id, is_active')
      .eq('id', shift_id)
      .maybeSingle();
    if (shiftErr || !shift) return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
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
      })
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (updErr || !data) {
      const msg = String(updErr?.message || '').toLowerCase();
      if (msg.includes('duplicate')) return NextResponse.json({ error: 'Slot already taken' }, { status: 409 });
      return NextResponse.json({ error: 'Failed to reschedule' }, { status: 500 });
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

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    // Fetch existing booking to include related data
    const { data: existing } = await supabase
      .from('bookings')
      .select(`
        *,
        services:services!service_id (
          id,
          name,
          duration
        ),
        locations:locations!location_id (
          id,
          name,
          color
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

    // Fetch user (client info) manually for updated booking
    let user = null;
    if (existing.created_by) {
      const { data: userData } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, phone')
        .eq('id', existing.created_by)
        .maybeSingle();
      user = userData;
    }

    // Merge with existing related data
    const updatedBooking = {
      ...data,
      users: user,
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







