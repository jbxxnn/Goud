import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/db/server-supabase';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'email required' }, { status: 400 });
    }

    const authSupabase = await createClient();
    const { data: { user }, error: authError } = await authSupabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getServiceSupabase();
    const { data: userProfile } = await supabase
      .from('users')
      .select('role, midwife_id')
      .eq('id', user.id)
      .single();

    const role = userProfile?.role;
    if (!['admin', 'staff', 'assistant', 'midwife'].includes(role || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, phone, address, postal_code, house_number, street_name, city, birth_date, midwife_id')
      .ilike('email', email)
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (
      role === 'midwife' &&
      data &&
      userProfile?.midwife_id &&
      data.midwife_id &&
      data.midwife_id !== userProfile.midwife_id
    ) {
      return NextResponse.json({ user: null, practiceMismatch: true });
    }

    return NextResponse.json({ user: data || null, practiceMismatch: false });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}
