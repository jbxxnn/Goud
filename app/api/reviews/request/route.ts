import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/db/server-supabase';
import { sendReviewRequestEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
    try {
        const { bookingId } = await req.json();
        if (!bookingId) {
            return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 });
        }

        const supabase = getServiceSupabase();
        const { data: booking, error } = await supabase
            .from('bookings')
            .select('id, client_id, created_by, service_id')
            .eq('id', bookingId)
            .single();

        if (error || !booking) {
            return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
        }

        const userIds = [...new Set([booking.client_id, booking.created_by].filter(Boolean))];
        const [{ data: service }, { data: users }] = await Promise.all([
            supabase.from('services').select('name').eq('id', booking.service_id).single(),
            userIds.length > 0
                ? supabase.from('users').select('email, first_name, last_name').in('id', userIds)
                : Promise.resolve({ data: [] as any[] }),
        ]);

        const recipients = [...new Set((users || []).map((user: any) => user.email).filter(Boolean))];
        if (recipients.length === 0) {
            return NextResponse.json({ error: 'No recipient found' }, { status: 404 });
        }

        const primaryUser = (users || [])[0] as any;
        const clientName = [primaryUser?.first_name, primaryUser?.last_name].filter(Boolean).join(' ') || primaryUser?.email || 'Client';
        const reviewLink = process.env.GOOGLE_REVIEW_URL || process.env.NEXT_PUBLIC_GOOGLE_REVIEW_URL || 'https://goudecho.nl';

        await sendReviewRequestEmail(recipients, {
            clientName,
            serviceName: service?.name,
            reviewLink,
        });

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('[review-request] Failed:', error);
        return NextResponse.json({ error: 'Failed to send review request' }, { status: 500 });
    }
}
