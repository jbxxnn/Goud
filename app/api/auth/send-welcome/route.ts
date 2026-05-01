import { NextRequest, NextResponse } from 'next/server';
import { sendAccountWelcomeEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
    try {
        const { email, clientName } = await req.json();
        if (!email) {
            return NextResponse.json({ error: 'Missing email' }, { status: 400 });
        }

        await sendAccountWelcomeEmail(email, {
            clientName: clientName || email,
            dashboardLink: `${process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin}/dashboard`,
        });

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('[send-welcome] Failed:', error);
        return NextResponse.json({ error: 'Failed to send welcome email' }, { status: 500 });
    }
}
