import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/db/server-supabase';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });
    const supabase = getServiceSupabase();
    const { data, error } = await supabase.from('users').select('id').ilike('email', email).limit(1);
    if (error) return NextResponse.json({ error: 'lookup failed' }, { status: 500 });
    return NextResponse.json({ exists: (data ?? []).length > 0 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}






