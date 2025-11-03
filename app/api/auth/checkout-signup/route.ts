import { NextRequest, NextResponse } from 'next/server';
import { createUserAndProfile } from '@/lib/auth/account';

export async function POST(req: NextRequest) {
  try {
    const { email, password, firstName, lastName } = await req.json();
    if (!email || !password) return NextResponse.json({ error: 'email and password required' }, { status: 400 });
    const result = await createUserAndProfile({ email, password, firstName, lastName });
    return NextResponse.json({ userId: result.id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}






