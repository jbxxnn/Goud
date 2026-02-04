import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/db/server-supabase';
import { z } from 'zod';

const lockSchema = z.object({
    serviceId: z.string().uuid(),
    locationId: z.string().uuid(),
    staffId: z.string().uuid(),
    shiftId: z.string().uuid(),
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
    sessionToken: z.string().min(1),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const result = lockSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { error: 'Invalid request data', details: result.error.flatten() },
                { status: 400 }
            );
        }

        const { serviceId, locationId, staffId, shiftId, startTime, endTime, sessionToken } = result.data;
        const start = new Date(startTime);
        const end = new Date(endTime);
        const supabase = getServiceSupabase();

        // 1. Check for existing BOOKINGS
        const { count: bookingCount, error: bookingErr } = await supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .eq('shift_id', shiftId)
            .neq('status', 'cancelled')
            .lt('start_time', end.toISOString())
            .gt('end_time', start.toISOString());

        if (bookingErr) throw bookingErr;
        if (bookingCount && bookingCount > 0) {
            return NextResponse.json({ error: 'SLOT_BOOKED' }, { status: 409 });
        }

        // 2. Check for existing LOCKS (active and not by me)
        const { count: lockCount, error: lockErr } = await supabase
            .from('booking_locks')
            .select('*', { count: 'exact', head: true })
            .eq('shift_id', shiftId) // Check for locks on this SHIFT (resource), not just service
            .gt('expires_at', new Date().toISOString())
            .neq('session_token', sessionToken) // Allow re-locking by same session
            .lt('start_time', end.toISOString())
            .gt('end_time', start.toISOString());

        if (lockErr) throw lockErr;
        if (lockCount && lockCount > 0) {
            return NextResponse.json({ error: 'SLOT_LOCKED' }, { status: 409 });
        }

        // 3. Create or Refresh Lock
        // We try to insert. 
        // Optimization: If I already have a lock, update it? Or just insert new one?
        // Let's just insert a new one for simplicity, or delete my old ones for this slot?
        // To keep it clean, let's delete any old locks by THIS session for THIS time first (refresh)
        await supabase
            .from('booking_locks')
            .delete()
            .eq('session_token', sessionToken)
            .eq('start_time', startTime); // Approximate match

        const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

        const { data: lock, error: insertErr } = await supabase
            .from('booking_locks')
            .insert({
                service_id: serviceId,
                location_id: locationId,
                staff_id: staffId,
                shift_id: shiftId,
                start_time: startTime,
                end_time: endTime,
                expires_at: expiresAt.toISOString(),
                session_token: sessionToken,
            })
            .select('id, expires_at')
            .single();

        if (insertErr) {
            console.error('Lock insert error', insertErr);
            throw new Error('Failed to acquire lock');
        }

        return NextResponse.json({
            success: true,
            lockId: lock.id,
            expiresAt: lock.expires_at
        });

    } catch (error) {
        console.error('[booking-lock] error', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const sessionToken = searchParams.get('sessionToken');

        if (!sessionToken) {
            return NextResponse.json({ error: 'Missing sessionToken' }, { status: 400 });
        }

        const supabase = getServiceSupabase();

        const { error } = await supabase
            .from('booking_locks')
            .delete()
            .eq('session_token', sessionToken);

        if (error) {
            console.error('[booking-lock-delete] error', error);
            return NextResponse.json({ error: 'Failed to release lock' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[booking-lock-delete] error', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
