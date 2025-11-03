import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/db/server-supabase';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = getServiceSupabase();
    const { data, error } = await supabase.from('bookings').select('*').eq('id', id).maybeSingle();
    if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ booking: data });
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
    const { status } = body || {};
    
    if (!status) return NextResponse.json({ error: 'status is required' }, { status: 400 });
    
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error || !data) return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 });
    return NextResponse.json({ booking: data });
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







