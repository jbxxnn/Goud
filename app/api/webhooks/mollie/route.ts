import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/db/server-supabase';
import mollieClient from '@/lib/mollie/client';

export async function POST(req: NextRequest) {
    try {
        // Mollie sends the payment ID as a form-encoded "id" field
        const formData = await req.formData();
        const id = formData.get('id') as string;

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

        const { error } = await supabase
            .from('bookings')
            .update({ payment_status: dbStatus })
            .eq('id', bookingId);

        if (error) {
            console.error('[mollie-webhook] DB update failed:', error);
            return NextResponse.json({ error: 'DB update failed' }, { status: 500 });
        }

        return NextResponse.json({ received: true });
    } catch (e) {
        console.error('[mollie-webhook] Error:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
