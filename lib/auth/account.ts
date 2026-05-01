import { getServiceSupabase } from '@/lib/db/server-supabase';
import { sendAccountWelcomeEmail } from '@/lib/email';

export async function emailExists(email: string): Promise<boolean> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase.from('users').select('id').ilike('email', email).limit(1);
  if (error) throw error;
  return (data ?? []).length > 0;
}

export async function createUserAndProfile(params: { email: string; password?: string; firstName?: string; lastName?: string; }): Promise<{ id: string }>
{
  const supabase = getServiceSupabase();
  // Create auth user via Admin API (service role required)
  const password = params.password || cryptoRandomString(16);
  const { data: auth, error: authErr } = await (supabase as any).auth.admin.createUser({
    email: params.email,
    password,
    email_confirm: true,
  });
  if (authErr || !auth?.user?.id) throw authErr || new Error('Failed to create user');
  const userId = auth.user.id as string;

  // Optionally update profile fields in users table
  await supabase.from('users').update({ first_name: params.firstName ?? null, last_name: params.lastName ?? null }).eq('id', userId);
  try {
    await sendAccountWelcomeEmail(params.email, {
      clientName: [params.firstName, params.lastName].filter(Boolean).join(' ') || params.email,
      dashboardLink: `${process.env.NEXT_PUBLIC_APP_URL || 'https://goudecho.nl'}/dashboard`,
    });
  } catch (error) {
    console.error('[createUserAndProfile] Failed to send welcome email:', error);
  }
  return { id: userId };
}

function cryptoRandomString(length: number): string {
  const bytes = new Uint8Array(length);
  if (typeof window === 'undefined') {
    // Node
    const { randomFillSync } = require('crypto');
    randomFillSync(bytes);
  } else {
    crypto.getRandomValues(bytes);
  }
  return Buffer.from(bytes).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, length);
}






