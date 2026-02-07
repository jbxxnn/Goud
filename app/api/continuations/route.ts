import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/db/server-supabase';
import { z } from 'zod';
import { randomUUID } from 'crypto';

const createContinuationSchema = z.object({
    parent_booking_id: z.string().uuid(),
    repeat_type_id: z.string().uuid(),
});

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
        return NextResponse.json({ success: false, error: 'Token is required' }, { status: 400 });
    }

    try {
        const supabase = getServiceSupabase();

        // Query continuation without deep users join which might fail due to relation naming/ambiguity
        const { data: continuation, error } = await supabase
            .from('booking_continuations')
            .select(`
                *,
                repeat_type:service_repeat_types(*),
                parent_booking:bookings!booking_continuations_parent_booking_id_fkey(
                  id,
                  is_twin,
                  client_id,
                  created_by,
                  location_id,
                  service:services(id, name, description)
                )
            `)
            .eq('token', token)
            .single();

        if (error || !continuation) {
            if (error) console.error('Supabase error fetching continuation:', error);
            return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 404 });
        }

        // Check expiration
        if (new Date(continuation.expires_at) < new Date()) {
            return NextResponse.json({ success: false, error: 'Token expired' }, { status: 410 });
        }

        // Check if claimed
        if (continuation.claimed_booking_id) {
            return NextResponse.json({ success: false, error: 'Token already used' }, { status: 409 });
        }

        // Manually fetch user details for the parent booking to be robust
        const parentBooking = continuation.parent_booking as any;
        let userData = null;
        if (parentBooking) {
            const userId = parentBooking.client_id || parentBooking.created_by;
            if (userId) {
                const { data: user } = await supabase
                    .from('users')
                    .select('first_name, last_name, email, phone')
                    .eq('id', userId)
                    .single();
                userData = user;
            }
            parentBooking.users = userData;
        }

        return NextResponse.json({
            success: true,
            data: {
                continuation: {
                    id: continuation.id,
                    token: continuation.token,
                    expires_at: continuation.expires_at
                },
                repeatType: continuation.repeat_type,
                parentBooking: parentBooking
            }
        });

    } catch (error) {
        console.error('Error validating continuation token:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = getServiceSupabase();

        // Auth check should be here ideally.

        const body = await request.json();
        const validation = createContinuationSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { success: false, error: validation.error.issues[0].message },
                { status: 400 }
            );
        }

        const { parent_booking_id, repeat_type_id } = validation.data;

        // Verify parent booking exists
        const { data: booking, error: bookingError } = await supabase
            .from('bookings')
            .select('id, service_id')
            .eq('id', parent_booking_id)
            .single();

        if (bookingError || !booking) {
            return NextResponse.json(
                { success: false, error: 'Parent booking not found' },
                { status: 404 }
            );
        }

        // Verify repeat type belongs to service
        const { data: repeatType, error: repeatError } = await supabase
            .from('service_repeat_types')
            .select('id, service_id')
            .eq('id', repeat_type_id)
            .single();

        if (repeatError || !repeatType) {
            return NextResponse.json(
                { success: false, error: 'Repeat type not found' },
                { status: 404 }
            );
        }

        if (repeatType.service_id !== booking.service_id) {
            return NextResponse.json(
                { success: false, error: 'Repeat type does not belong to the booking service' },
                { status: 400 }
            );
        }

        // Generate token
        const token = randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, ''); // Long hex string

        // Expires in 30 days
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        const { data: continuation, error: insertError } = await supabase
            .from('booking_continuations')
            .insert({
                parent_booking_id,
                repeat_type_id,
                token,
                expires_at: expiresAt.toISOString(),
            })
            .select()
            .single();

        if (insertError) {
            console.error('Error creating continuation:', insertError);
            return NextResponse.json(
                { success: false, error: insertError.message },
                { status: 500 }
            );
        }

        // Return the link structure
        // TODO: Use env var for base URL?
        // For now we return relative path or let client construct it.
        const link = `/booking/repeat?token=${token}`;

        return NextResponse.json({
            success: true,
            data: {
                token,
                link,
                expires_at: expiresAt,
                continuation_id: continuation.id
            }
        });

    } catch (error) {
        console.error('Unexpected error creating continuation:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
