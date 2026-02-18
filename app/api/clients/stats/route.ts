import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/db/server-supabase';

const parseDateParam = (value: string | null, fallback: Date): Date => {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
};

export async function GET(req: NextRequest) {
  try {
    const supabase = getServiceSupabase();
    const { searchParams } = new URL(req.url);

    const defaultStart = new Date(new Date().getFullYear(), 0, 1);
    const defaultEnd = new Date();

    const startDate = parseDateParam(searchParams.get('startDate'), defaultStart);
    const endDate = parseDateParam(searchParams.get('endDate'), defaultEnd);

    if (startDate > endDate) {
      return NextResponse.json(
        { error: 'startDate cannot be greater than endDate' },
        { status: 400 }
      );
    }

    const startIso = startDate.toISOString();
    const endIso = endDate.toISOString();

    // Get total clients count
    const { count: totalClients, error: totalClientsError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'client');

    if (totalClientsError) throw new Error(totalClientsError.message);

    // Clients with bookings in range
    const { data: bookingRows, error: bookingsError } = await supabase
      .from('bookings')
      .select('client_id')
      .neq('status', 'cancelled')
      .gte('start_time', startIso)
      .lte('start_time', endIso);

    if (bookingsError) throw new Error(bookingsError.message);

    const clientsWithBookings = new Set(
      (bookingRows || [])
        .map((b) => b.client_id)
        .filter((id): id is string => Boolean(id))
    ).size;

    // Clients with upcoming bookings within range (from now or start)
    const now = new Date();
    const upcomingStart = now > startDate ? now : startDate;
    const { data: upcomingRows, error: upcomingError } = await supabase
      .from('bookings')
      .select('client_id')
      .neq('status', 'cancelled')
      .gte('start_time', upcomingStart.toISOString())
      .lte('start_time', endIso);

    if (upcomingError) throw new Error(upcomingError.message);

    const clientsWithUpcoming = new Set(
      (upcomingRows || [])
        .map((b) => b.client_id)
        .filter((id): id is string => Boolean(id))
    ).size;

    // Revenue in range
    const { data: revenueRows, error: revenueError } = await supabase
      .from('bookings')
      .select('price_eur_cents')
      .neq('status', 'cancelled')
      .gte('start_time', startIso)
      .lte('start_time', endIso);

    if (revenueError) throw new Error(revenueError.message);

    const totalRevenue = (revenueRows || []).reduce(
      (sum, b) => sum + (b.price_eur_cents || 0),
      0
    );

    return NextResponse.json({
      success: true,
      data: {
        totalClients: totalClients || 0,
        clientsWithBookings,
        clientsWithUpcoming,
        totalRevenue,
      },
    });
  } catch (e: unknown) {
    console.error('[clients/stats] error details:', {
      message: (e as Error)?.message,
      stack: (e as Error)?.stack,
      cause: (e as Error)?.cause,
      name: (e as Error)?.name,
      env: {
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      }
    });
    return NextResponse.json(
      { error: (e as Error)?.message || 'Unexpected error' },
      { status: 500 }
    );
  }
}

