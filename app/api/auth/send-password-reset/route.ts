import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/db/server-supabase';
import { sendPasswordResetEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
    try {
        const { email, redirectTo } = await req.json();
        if (!email || !redirectTo) {
            return NextResponse.json({ error: 'Missing email or redirectTo' }, { status: 400 });
        }

        const supabase = getServiceSupabase();
        const { data, error } = await (supabase as any).auth.admin.generateLink({
            type: 'recovery',
            email,
            options: {
                redirectTo,
            },
        });

        if (error) throw error;

        const actionLink = data?.properties?.action_link;
        if (!actionLink) {
            throw new Error('Failed to generate password reset link');
        }

        await sendPasswordResetEmail(email, {
            clientName: email,
            actionLink,
        });

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('[send-password-reset] Failed:', error);
        return NextResponse.json({ error: 'Failed to send password reset email' }, { status: 500 });
    }
}
