import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/db/server-supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');
    if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, phone, address, postal_code, house_number, street_name, city, birth_date, midwife_id, role')
      .ilike('email', email)
      .limit(1)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ user: null });
    return NextResponse.json({ user: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}




