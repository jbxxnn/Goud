import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/db/server-supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || 'week'; // week or month
    
    const supabase = getServiceSupabase();
    
    // Get today's date range (start and end of day in UTC)
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
    const todayStart = new Date(`${todayStr}T00:00:00.000Z`);
    const todayEnd = new Date(`${todayStr}T23:59:59.999Z`);
    
    // Count today's appointments (not cancelled)
    const { count: todayCount } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .gte('start_time', todayStart.toISOString())
      .lte('start_time', todayEnd.toISOString())
      .neq('status', 'cancelled');
    
    // Count total appointments (not cancelled)
    const { count: totalCount } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .neq('status', 'cancelled');
    
    // Get weekly activity data
    const weekData: { day: string; approved: number; rescheduled: number }[] = [];
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    // Get start of current week (Monday)
    const startOfWeek = new Date(todayStart);
    const dayOfWeek = startOfWeek.getUTCDay();
    const diff = startOfWeek.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust to Monday
    startOfWeek.setUTCDate(diff);
    startOfWeek.setUTCHours(0, 0, 0, 0);
    
    // Get end of week (Sunday)
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setUTCDate(startOfWeek.getUTCDate() + 6);
    endOfWeek.setUTCHours(23, 59, 59, 999);
    
    // For each day of the week, get appointments
    for (let i = 0; i < 7; i++) {
      const dayStart = new Date(startOfWeek);
      dayStart.setUTCDate(startOfWeek.getUTCDate() + i);
      dayStart.setUTCHours(0, 0, 0, 0);
      
      const dayEnd = new Date(dayStart);
      dayEnd.setUTCHours(23, 59, 59, 999);
      
      // Get all bookings for this day
      const { data: dayBookings } = await supabase
        .from('bookings')
        .select('status')
        .gte('start_time', dayStart.toISOString())
        .lte('start_time', dayEnd.toISOString())
        .neq('status', 'cancelled');
      
      // Count approved (confirmed) and rescheduled
      // For now, we'll consider confirmed as approved and anything else that's not cancelled as rescheduled
      // This is a simplification - adjust based on your status values
      const approved = dayBookings?.filter(b => b.status === 'confirmed').length || 0;
      const rescheduled = dayBookings?.filter(b => b.status === 'pending').length || 0;
      
      weekData.push({
        day: daysOfWeek[i],
        approved,
        rescheduled,
      });
    }
    
    return NextResponse.json({
      success: true,
      data: {
        todayAppointments: todayCount || 0,
        totalAppointments: totalCount || 0,
        weeklyActivity: weekData,
      },
    });
  } catch (e: any) {
    console.error('[dashboard/stats] error', e);
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}
