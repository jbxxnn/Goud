import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/db/server-supabase';

type Period = 'day' | 'week' | 'month' | 'year';

interface PeriodConfig {
  start: Date;
  end: Date;
  labels: string[];
  getLabelIndex: (date: Date) => number;
}

const getUtcStartOfDay = (date: Date) => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

const getUtcEndOfDay = (date: Date) => {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
};

const getPeriodConfig = (period: Period, reference: Date): PeriodConfig => {
  const today = getUtcStartOfDay(reference);

  if (period === 'day') {
    const start = getUtcStartOfDay(today);
    const end = getUtcEndOfDay(today);
    return {
      start,
      end,
      labels: ['Today'],
      getLabelIndex: () => 0,
    };
  }

  if (period === 'week') {
    const start = getUtcStartOfDay(today);
    const dayOfWeek = start.getUTCDay();
    const diff = start.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    start.setUTCDate(diff);

    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const end = getUtcEndOfDay(new Date(start));
    end.setUTCDate(start.getUTCDate() + 6);

    return {
      start,
      end,
      labels,
      getLabelIndex: (date) => {
        const dayIndex = (date.getUTCDay() + 6) % 7; // convert Sunday(0) -> 6
        return dayIndex;
      },
    };
  }

  if (period === 'month') {
    const start = getUtcStartOfDay(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)));
    const end = getUtcEndOfDay(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0)));

    const weeksInMonth = Math.ceil((end.getUTCDate()) / 7);
    const labels = Array.from({ length: weeksInMonth }, (_, idx) => `Week ${idx + 1}`);

    return {
      start,
      end,
      labels,
      getLabelIndex: (date) => {
        const weekIndex = Math.floor((date.getUTCDate() - 1) / 7);
        return Math.min(weekIndex, labels.length - 1);
      },
    };
  }

  // year
  const start = getUtcStartOfDay(new Date(Date.UTC(today.getUTCFullYear(), 0, 1)));
  const end = getUtcEndOfDay(new Date(Date.UTC(today.getUTCFullYear(), 11, 31)));
  const monthLabels = Array.from({ length: 12 }, (_, idx) =>
    new Date(Date.UTC(today.getUTCFullYear(), idx, 1)).toLocaleString('en-US', { month: 'short' })
  );

  return {
    start,
    end,
    labels: monthLabels,
    getLabelIndex: (date) => date.getUTCMonth(),
  };
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedPeriod = (searchParams.get('period') || 'week').toLowerCase();
    const period: Period = ['day', 'week', 'month', 'year'].includes(requestedPeriod)
      ? (requestedPeriod as Period)
      : 'week';

    const supabase = getServiceSupabase();

    const now = new Date();
    const todayStart = getUtcStartOfDay(now);
    const todayEnd = getUtcEndOfDay(now);

    const { count: todayCount } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .gte('start_time', todayStart.toISOString())
      .lte('start_time', todayEnd.toISOString())
      .neq('status', 'cancelled');

    const { count: totalCount } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .neq('status', 'cancelled');

    const periodConfig = getPeriodConfig(period, now);

    const { data: bookingsData } = await supabase
      .from('bookings')
      .select(
        `
          id,
          start_time,
          status,
          services:services!service_id (
            id,
            name,
            service_code
          )
        `
      )
      .gte('start_time', periodConfig.start.toISOString())
      .lte('start_time', periodConfig.end.toISOString())
      .neq('status', 'cancelled');

    const labelsLength = periodConfig.labels.length;
    const serviceSeriesMap = new Map<
      string,
      {
        serviceId: string;
        serviceName: string;
        serviceCode: string | null;
        data: number[];
        total: number;
      }
    >();

    bookingsData?.forEach((booking) => {
      const service = booking.services as { id: string; name: string; service_code: string | null } | null;
      if (!service) {
        return;
      }
      const startTime = new Date(booking.start_time);
      const labelIndex = periodConfig.getLabelIndex(startTime);
      if (labelIndex < 0 || labelIndex >= labelsLength) {
        return;
      }

      const existing = serviceSeriesMap.get(service.id);
      if (!existing) {
        const dataArray = Array(labelsLength).fill(0);
        dataArray[labelIndex] = 1;
        serviceSeriesMap.set(service.id, {
          serviceId: service.id,
          serviceName: service.name,
          serviceCode: service.service_code ?? null,
          data: dataArray,
          total: 1,
        });
      } else {
        existing.data[labelIndex] += 1;
        existing.total += 1;
      }
    });

    const serviceSeries = Array.from(serviceSeriesMap.values()).sort((a, b) => b.total - a.total);
    const seriesOutput = serviceSeries.map(({ total, ...rest }) => rest);
    const totalsOutput = serviceSeries.map(({ serviceId, serviceName, serviceCode, total }) => ({
      serviceId,
      serviceName,
      serviceCode,
      count: total,
    }));

    return NextResponse.json({
      success: true,
      data: {
        todayAppointments: todayCount || 0,
        totalAppointments: totalCount || 0,
        serviceBookings: {
          period,
          labels: periodConfig.labels,
          series: seriesOutput,
          totals: totalsOutput,
        },
      },
    });
  } catch (e: any) {
    console.error('[dashboard/stats] error', e);
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}
