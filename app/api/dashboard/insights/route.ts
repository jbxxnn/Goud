import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/db/server-supabase';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const startOfDay = (date: Date) => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (date: Date) => {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
};

const addDays = (date: Date, amount: number) => {
  return new Date(date.getTime() + amount * DAY_IN_MS);
};

const percentChange = (current: number, previous: number) => {
  if (!previous) {
    return current === 0 ? 0 : 100;
  }
  return ((current - previous) / previous) * 100;
};

const euros = (cents: number) => Number((cents / 100).toFixed(2));

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedRange = (searchParams.get('range') || 'week').toLowerCase();
    const range: 'week' | 'month' | 'year' = ['week', 'month', 'year'].includes(requestedRange)
      ? (requestedRange as 'week' | 'month' | 'year')
      : 'week';

    const rangeConfig = {
      week: {
        metricsDays: 30,
        segmentCount: 8,
        segmentSize: 1,
        labelFormatter: (start: Date, idx: number) =>
          addDays(start, idx).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      },
      month: {
        metricsDays: 90,
        segmentCount: 6,
        segmentSize: 5,
        labelFormatter: (_start: Date, idx: number) => `Week ${idx + 1}`,
      },
      year: {
        metricsDays: 365,
        segmentCount: 12,
        segmentSize: 30,
        labelFormatter: (start: Date, idx: number) =>
          addDays(start, idx * 30).toLocaleString('en-US', { month: 'short' }),
      },
    }[range];

    const supabase = getServiceSupabase();

    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const yesterdayStart = addDays(todayStart, -1);
    const yesterdayEnd = endOfDay(addDays(todayStart, -1));

    const metricsWindowDays = rangeConfig.metricsDays;
    const currentWindowStart = addDays(todayStart, -(metricsWindowDays - 1));
    const previousWindowEnd = addDays(currentWindowStart, -1);
    const previousWindowStart = addDays(previousWindowEnd, -(metricsWindowDays - 1));

    const totalTrendDays = rangeConfig.segmentCount * rangeConfig.segmentSize;
    const trendStart = addDays(todayStart, -(totalTrendDays - 1));
    const trendDays = rangeConfig.segmentCount;

    const { data: bookingsData, error: bookingsError } = await supabase
      .from('bookings')
      .select(
        `
          id,
          start_time,
          created_at,
          status,
          payment_status,
          price_eur_cents,
          services:services!service_id (
            id,
            name,
            service_code
          )
        `
      )
      .gte('start_time', previousWindowStart.toISOString())
      .lte('start_time', todayEnd.toISOString())
      .order('start_time', { ascending: true });

    if (bookingsError) {
      throw bookingsError;
    }

    const bookings = bookingsData ?? [];

    const bookingsInRange = (start: Date, end: Date) =>
      bookings.filter((booking) => {
        const bookingDate = new Date(booking.start_time);
        return bookingDate >= start && bookingDate <= end;
      });

    const sumRevenue = (start: Date, end: Date) =>
      bookingsInRange(start, end)
        .filter((booking) => booking.status !== 'cancelled')
        .reduce((sum, booking) => sum + (booking.price_eur_cents || 0), 0);

    const todayAppointments = bookingsInRange(todayStart, todayEnd).filter(
      (booking) => booking.status !== 'cancelled'
    ).length;
    const yesterdayAppointments = bookingsInRange(yesterdayStart, yesterdayEnd).filter(
      (booking) => booking.status !== 'cancelled'
    ).length;

    const revenueCurrent = sumRevenue(currentWindowStart, todayEnd);
    const revenuePrevious = sumRevenue(previousWindowStart, previousWindowEnd);

    const trendBookings = bookingsInRange(trendStart, todayEnd);
    const currentWindowBookings = bookingsInRange(currentWindowStart, todayEnd);

    const trendLabels = Array.from({ length: trendDays }, (_, idx) =>
      rangeConfig.labelFormatter(trendStart, idx)
    );

    const statusKeys: Array<'confirmed' | 'pending' | 'cancelled'> = [
      'confirmed',
      'pending',
      'cancelled',
    ];

    const statusTrendMap: Record<string, number[]> = {
      confirmed: Array(trendDays).fill(0),
      pending: Array(trendDays).fill(0),
      cancelled: Array(trendDays).fill(0),
    };

    const revenueTrendIncome = Array(trendDays).fill(0);
    const revenueTrendRefunds = Array(trendDays).fill(0);

    trendBookings.forEach((booking) => {
      const bookingDate = startOfDay(new Date(booking.start_time));
      const dayDiff = Math.floor((bookingDate.getTime() - trendStart.getTime()) / DAY_IN_MS);
      if (dayDiff < 0) {
        return;
      }

      const segmentIndex = Math.min(
        Math.floor(dayDiff / rangeConfig.segmentSize),
        trendDays - 1
      );

      if (segmentIndex < 0 || segmentIndex >= trendDays) {
        return;
      }

      if (statusTrendMap[booking.status]) {
        statusTrendMap[booking.status][segmentIndex] += 1;
      }

      const amountCents = booking.price_eur_cents || 0;
      if (booking.status !== 'cancelled') {
        revenueTrendIncome[segmentIndex] += amountCents;
      }
      if (booking.status === 'cancelled' || booking.payment_status === 'refunded') {
        revenueTrendRefunds[segmentIndex] += amountCents;
      }
    });

    const serviceCounts: Record<string, { name: string; count: number }> = {};
    currentWindowBookings.forEach((booking) => {
      const serviceName =
        (booking.services as { name?: string } | null)?.name?.toString() || 'Unknown service';
      if (!serviceCounts[serviceName]) {
        serviceCounts[serviceName] = { name: serviceName, count: 0 };
      }
      serviceCounts[serviceName].count += 1;
    });

    const serviceTotals = Object.values(serviceCounts);
    const totalServiceCount = serviceTotals.reduce((sum, entry) => sum + entry.count, 0) || 1;

    const pendingBookings = currentWindowBookings.filter((booking) => booking.status === 'pending')
      .length;
    const cancelledTrend = trendBookings.filter((booking) => booking.status === 'cancelled').length;
    const refundedBookings = currentWindowBookings.filter(
      (booking) => booking.payment_status === 'refunded'
    ).length;
    const todayConfirmed = bookingsInRange(todayStart, todayEnd).filter(
      (booking) => booking.status === 'confirmed'
    ).length;

    const { data: activityData, error: activityError } = await supabase
      .from('bookings')
      .select(
        `
          id,
          created_at,
          status,
          services:services!service_id (
            name
          ),
          users:users!client_id (
            first_name,
            last_name,
            email
          )
        `
      )
      .order('created_at', { ascending: false })
      .limit(5);

    if (activityError) {
      throw activityError;
    }

    const activityFeed = (activityData ?? []).map((entry) => {
      const user = entry.users as { first_name?: string | null; last_name?: string | null; email?: string | null } | null;
      const service = entry.services as { name?: string | null } | null;
      const clientName =
        [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.email || 'Unknown client';
      const serviceName = service?.name || 'service';
      let action = 'scheduled';
      if (entry.status === 'pending') {
        action = 'requested';
      } else if (entry.status === 'cancelled') {
        action = 'cancelled';
      }

      return {
        id: entry.id,
        message: `${clientName} ${action} ${serviceName}`,
        timestamp: entry.created_at,
        status: entry.status,
      };
    });

    const { count: totalClients } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'client');

    const { count: currentClientsWindow } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'client')
      .gte('created_at', currentWindowStart.toISOString())
      .lte('created_at', todayEnd.toISOString());

    const { count: previousClientsWindow } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'client')
      .gte('created_at', previousWindowStart.toISOString())
      .lte('created_at', previousWindowEnd.toISOString());

    const { count: activeStaff } = await supabase
      .from('staff')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    const { count: staffCurrentWindow } = await supabase
      .from('staff')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', currentWindowStart.toISOString())
      .lte('created_at', todayEnd.toISOString());

    const { count: staffPreviousWindow } = await supabase
      .from('staff')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', previousWindowStart.toISOString())
      .lte('created_at', previousWindowEnd.toISOString());

    return NextResponse.json({
      success: true,
      data: {
        metrics: {
          revenue: {
            value: euros(revenueCurrent),
            change: percentChange(revenueCurrent, revenuePrevious),
          },
          clients: {
            value: totalClients || 0,
            change: percentChange(currentClientsWindow || 0, previousClientsWindow || 0),
          },
          appointmentsToday: {
            value: todayAppointments,
            change: percentChange(todayAppointments, yesterdayAppointments),
          },
          activeStaff: {
            value: activeStaff || 0,
            change: percentChange(staffCurrentWindow || 0, staffPreviousWindow || 0),
          },
        },
        statusTrend: {
          labels: trendLabels,
          series: statusKeys.map((key) => ({
            key,
            label: key.charAt(0).toUpperCase() + key.slice(1),
            data: statusTrendMap[key],
          })),
        },
        revenueTrend: {
          labels: trendLabels,
          income: revenueTrendIncome.map(euros),
          refunds: revenueTrendRefunds.map(euros),
        },
        serviceDistribution: serviceTotals.map((entry) => ({
          label: entry.name,
          value: entry.count,
          percentage: Number(((entry.count / totalServiceCount) * 100).toFixed(1)),
        })),
        operational: {
          pendingBookings,
          cancellations: cancelledTrend,
          refunds: refundedBookings,
          todayConfirmed,
        },
        activityFeed,
        range,
      },
    });
  } catch (error) {
    console.error('[dashboard/insights] error', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unexpected error',
      },
      { status: 500 }
    );
  }
}


