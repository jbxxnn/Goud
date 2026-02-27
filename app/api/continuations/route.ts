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
                  midwife_id,
                  other_midwife_name,
                  due_date,
                  birth_date,
                  gravida,
                  para,
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
            // Per DATABASE_MAPPING_RULES.md: created_by is the patient, client_id is the fallback/midwife
            const userId = parentBooking.created_by || parentBooking.client_id;
            if (userId) {
                const { data: user } = await supabase
                    .from('users')
                    .select('first_name, last_name, email, phone, house_number, postal_code, street_name, city, birth_date')
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

        // Send email to client
        // Fetch full details for email
        const { data: fullBooking } = await supabase
            .from('bookings')
            .select(`
                *,
                client:users!client_id (
                    first_name,
                    last_name,
                    email
                ),
                created_by_user:users!created_by (
                    email
                ),
                services:services!service_id (
                    name
                )
            `)
            .eq('id', parent_booking_id)
            .single();

        if (fullBooking) {
            let clientEmail = fullBooking.client?.email;
            let createdByEmail = fullBooking.created_by_user?.email;
            let firstName = fullBooking.client?.first_name;
            let lastName = fullBooking.client?.last_name;

            // Manual fetch for users if join was incomplete or ambiguous
            if (!clientEmail || !createdByEmail) {
                const userIds = [fullBooking.client_id, fullBooking.created_by].filter(Boolean) as string[];
                
                if (userIds.length > 0) {
                    const { data: users } = await supabase
                        .from('users')
                        .select('id, email, first_name, last_name')
                        .in('id', userIds);
                    
                    if (users) {
                        const clientUser = users.find(u => u.id === fullBooking.client_id);
                        const creatorUser = users.find(u => u.id === fullBooking.created_by);
                        
                        if (clientUser) {
                            clientEmail = clientUser.email;
                            firstName = clientUser.first_name;
                            lastName = clientUser.last_name;
                        }
                        if (creatorUser) {
                            createdByEmail = creatorUser.email;
                        }
                    }
                }
            }

            const clientName = [firstName, lastName].filter(Boolean).join(' ') || 'Client';
            const serviceName = fullBooking.services?.name || 'Service';

            let emailRecipients: string[] = [];
            if (clientEmail) emailRecipients.push(clientEmail);
            if (createdByEmail && createdByEmail !== clientEmail) emailRecipients.push(createdByEmail);

            if (emailRecipients.length > 0) {
                // Determine base URL
                const protocol = request.headers.get('x-forwarded-proto') || 'http';
                const host = request.headers.get('host') || 'goudecho.nl';
                const baseUrl = `${protocol}://${host}`;
                const fullLink = `${baseUrl}${link}`;

                // We import dynamically or use the function we just added
                const { sendRepeatBookingEmail } = await import('@/lib/email');

                await sendRepeatBookingEmail(emailRecipients, {
                    clientName,
                    serviceName,
                    link: fullLink
                }).catch(err => console.error('Failed to send repeat booking email', err));
            }
        }

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
