import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/db/server-supabase';
import mollieClient from '@/lib/mollie/client';
import { sendPaymentFailedEmail, sendPaymentReceiptEmail } from '@/lib/email';
import { formatEuroCents } from '@/lib/currency/format';

export async function POST(req: NextRequest) {
    try {
        // Mollie sends the payment ID as a form-encoded "id" field
        let id: string | null = null;
        
        try {
            const formData = await req.formData();
            id = formData.get('id') as string;
        } catch (e) {
            // Fallback for non-form-data requests
            const { searchParams } = new URL(req.url);
            id = searchParams.get('id');
            
            if (!id) {
                try {
                    const body = await req.json();
                    id = body.id;
                } catch (e2) {}
            }
        }

        if (!id) {
            return NextResponse.json({ error: 'Missing id' }, { status: 400 });
        }

        const payment = await mollieClient.payments.get(id);
        const bookingId = (payment.metadata as any)?.booking_id;

        if (!bookingId) {
            return NextResponse.json({ error: 'Missing booking_id in metadata' }, { status: 400 });
        }

        const supabase = getServiceSupabase();

        // Map Mollie status to our payment_status enum
        // Mollie: open, canceled, pending, expired, failed, paid
        // Our DB: unpaid, paid, open, expired, failed, canceled 
        let dbStatus = 'open';
        if (payment.status === 'paid') dbStatus = 'paid';
        else if (payment.status === 'canceled') dbStatus = 'canceled';
        else if (payment.status === 'expired') dbStatus = 'expired';
        else if (payment.status === 'failed') dbStatus = 'failed';
        else if (payment.status === 'open') dbStatus = 'unpaid';
        else if (payment.status === 'pending') dbStatus = 'unpaid';

        const { error, data } = await supabase
            .from('bookings')
            .update({ payment_status: dbStatus })
            .eq('id', bookingId)
            .select('id, client_id, created_by, service_id, price_eur_cents, payment_link, payment_receipt_email_sent_at, payment_failed_email_sent_at');

        if (error) {
            console.error('[mollie-webhook] DB update failed:', error);
            return NextResponse.json({ error: 'DB update failed', details: error.message }, { status: 500 });
        }

        if (!data || data.length === 0) {
            return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
        }

        const booking = data[0];
        const shouldSendReceipt = dbStatus === 'paid' && !booking.payment_receipt_email_sent_at;
        const shouldSendFailure = ['failed', 'expired', 'canceled'].includes(dbStatus) && !booking.payment_failed_email_sent_at;

        if (shouldSendReceipt || shouldSendFailure) {
            try {
                const userIds = [...new Set([booking.client_id, booking.created_by].filter(Boolean))];
                const [{ data: service }, { data: users }] = await Promise.all([
                    supabase.from('services').select('name').eq('id', booking.service_id).single(),
                    userIds.length > 0
                        ? supabase.from('users').select('id, email, first_name, last_name').in('id', userIds)
                        : Promise.resolve({ data: [] as any[] }),
                ]);

                const recipients = [...new Set((users || []).map((user: any) => user.email).filter(Boolean))];
                const primaryUser = (users || [])[0] as any;
                const clientName = [primaryUser?.first_name, primaryUser?.last_name].filter(Boolean).join(' ') || primaryUser?.email || 'Client';
                const serviceName = service?.name || 'je afspraak';

                if (recipients.length > 0 && shouldSendReceipt) {
                    await sendPaymentReceiptEmail(recipients, {
                        clientName,
                        serviceName,
                        amount: formatEuroCents(booking.price_eur_cents),
                        bookingId: booking.id.substring(0, 8).toUpperCase(),
                        paymentId: id,
                    });

                    await supabase
                        .from('bookings')
                        .update({ payment_receipt_email_sent_at: new Date().toISOString() })
                        .eq('id', booking.id);
                }

                if (recipients.length > 0 && shouldSendFailure) {
                    await sendPaymentFailedEmail(recipients, {
                        clientName,
                        serviceName,
                        amount: formatEuroCents(booking.price_eur_cents),
                        paymentLink: booking.payment_link || undefined,
                        bookingId: booking.id.substring(0, 8).toUpperCase(),
                        reason: dbStatus,
                    });

                    await supabase
                        .from('bookings')
                        .update({ payment_failed_email_sent_at: new Date().toISOString() })
                        .eq('id', booking.id);
                }
            } catch (emailError) {
                console.error('[mollie-webhook] Payment email failed:', emailError);
            }
        }

        return NextResponse.json({ received: true });
    } catch (e) {
        console.error('[mollie-webhook] Error:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
