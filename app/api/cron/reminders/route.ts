import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/db/server-supabase';
import { sendBookingReminderEmail } from '@/lib/email';
import { formatEuroCents } from '@/lib/currency/format';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    // 1. Verify Authentication (Optional but recommended for robust setups)
    // For Vercel Cron, you can check the authorization header if you set CRON_SECRET env var.
    // const authHeader = req.headers.get('authorization');
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //   return new Response('Unauthorized', { status: 401 });
    // }

    // For now, running open for testing, but relying on the obscure URL or future env var.

    try {
        const supabase = getServiceSupabase();

        // 2. Define Time Window: "Tomorrow"
        // We want to remind people about appointments happening roughly 24 hours from now.
        // A simple robust strategy for a daily cron at, say, 7 AM, is to check ALL bookings for the "Next Day".

        const now = new Date();
        const tomorrowStart = new Date(now);
        tomorrowStart.setDate(tomorrowStart.getDate() + 1);
        tomorrowStart.setHours(0, 0, 0, 0);

        const tomorrowEnd = new Date(tomorrowStart);
        tomorrowEnd.setHours(23, 59, 59, 999);

        console.log(`[Cron] Checking reminders for window: ${tomorrowStart.toISOString()} - ${tomorrowEnd.toISOString()}`);

        // 3. Query bookings
        const { data: bookings, error } = await supabase
            .from('bookings')
            .select(`
        id,
        start_time,
        reminder_sent,
        price_eur_cents,
        notes,
        created_by,
        users!bookings_created_by_fkey ( email, first_name ),
        services ( name ),
        locations ( name, address )
      `)
            .gte('start_time', tomorrowStart.toISOString())
            .lte('start_time', tomorrowEnd.toISOString())
            .eq('status', 'confirmed') // Only confirmed bookings
            .eq('reminder_sent', false); // Only those not yet reminded

        if (error) {
            console.error('[Cron] Database error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!bookings || bookings.length === 0) {
            console.log('[Cron] No bookings found requiring reminders.');
            return NextResponse.json({ success: true, count: 0, message: 'No reminders needed' });
        }

        console.log(`[Cron] Found ${bookings.length} bookings to remind.`);

        // 4. Send Emails & Update DB
        const results = [];

        for (const booking of bookings) {
            // Handle possibility of array or object return from Supabase
            // TS believes it's an array, runtime might be object or array depending on Supabase version/config
            const userOrUsers = booking.users as any;
            const userData = Array.isArray(userOrUsers) ? userOrUsers[0] : userOrUsers;

            const clientEmail = userData?.email;
            const clientName = userData?.first_name || 'Client';

            if (!clientEmail) {
                console.warn(`[Cron] Booking ${booking.id} has no client email. Skipping.`);
                results.push({ id: booking.id, status: 'skipped_no_email' });
                continue;
            }

            const serviceOrServices = booking.services as any;
            const serviceData = Array.isArray(serviceOrServices) ? serviceOrServices[0] : serviceOrServices;
            const serviceName = serviceData?.name || 'Service';

            const locationOrLocations = booking.locations as any;
            const locationData = Array.isArray(locationOrLocations) ? locationOrLocations[0] : locationOrLocations;
            const locationName = locationData?.name || 'Location';
            const address = locationData?.address;

            const formattedDate = new Date(booking.start_time).toLocaleDateString('nl-NL', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            const formattedTime = new Date(booking.start_time).toLocaleTimeString('nl-NL', {
                hour: '2-digit',
                minute: '2-digit'
            });

            const googleMapsLink = address
                ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
                : undefined;

            try {
                await sendBookingReminderEmail(clientEmail, {
                    clientName,
                    serviceName,
                    date: formattedDate,
                    time: formattedTime,
                    locationName,
                    bookingId: booking.id.substring(0, 8).toUpperCase(),
                    googleMapsLink
                });

                // Update DB
                const { error: updateError } = await supabase
                    .from('bookings')
                    .update({ reminder_sent: true })
                    .eq('id', booking.id);

                if (updateError) {
                    console.error(`[Cron] Failed to update reminder_sent for booking ${booking.id}`, updateError);
                    results.push({ id: booking.id, status: 'sent_but_failed_update', error: updateError.message });
                } else {
                    results.push({ id: booking.id, status: 'sent_success' });
                }

            } catch (err: any) {
                console.error(`[Cron] Failed to send email for booking ${booking.id}`, err);
                results.push({ id: booking.id, status: 'failed_send', error: err.message });
            }
        }

        return NextResponse.json({
            success: true,
            processed: bookings.length,
            results
        });

    } catch (err: any) {
        console.error('[Cron] Unexpected error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
