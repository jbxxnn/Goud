import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/db/server-supabase';
import { sendMagicLinkEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
    try {
        const { email, redirectTo, clientName } = await req.json();
        if (!email || !redirectTo) {
            return NextResponse.json({ error: 'Missing email or redirectTo' }, { status: 400 });
        }

        const supabase = getServiceSupabase();
        const { data, error } = await (supabase as any).auth.admin.generateLink({
            type: 'magiclink',
            email,
            options: {
                redirectTo,
            },
        });

        if (error) throw error;

        const actionLink = data?.properties?.action_link;
        if (!actionLink) {
            throw new Error('Failed to generate magic link');
        }

        await sendMagicLinkEmail(email, {
            clientName: clientName || email,
            actionLink,
        });

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('[send-magic-link] Failed:', error);
        return NextResponse.json({ error: 'Failed to send magic link email' }, { status: 500 });
    }
}
