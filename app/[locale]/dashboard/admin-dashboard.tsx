'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DashboardCalendar } from '@/components/dashboard/dashboard-calendar';
import { HugeiconsIcon } from '@hugeicons/react';
// import { TrendingUp } from 'lucide-react';
import {
  CalendarCheckInIcon,
  //   ClockIcon,
  CoinsEuroIcon,
  InformationCircleIcon,
  Loading03Icon,
  //   UserIcon,
} from '@hugeicons/core-free-icons';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Legend,
  Sector,
} from 'recharts';
import type { PieSectorDataItem } from 'recharts/types/polar/Pie';
import { DataTable } from '@/components/ui/data-table';
import { getRecentBookingsColumns } from '@/components/recent-bookings-table-columns';
import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';
import { Booking, BookingStatus, RecentBookingSummary } from '@/lib/types/booking';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface InsightMetric {
  value: number;
  change: number;
}

interface TrendSeries {
  key: BookingStatus;
  label: string;
  data: number[];
}

interface DashboardInsights {
  metrics: {
    revenue: InsightMetric;
    clients: InsightMetric;
    appointmentsToday: InsightMetric;
    activeStaff: InsightMetric;
  };
  statusTrend: {
    labels: string[];
    series: TrendSeries[];
  };
  revenueTrend: {
    labels: string[];
    income: number[];
    refunds: number[];
  };
  serviceDistribution: {
    label: string;
    value: number;
    percentage: number;
  }[];
  operational: {
    pendingBookings: number;
    cancellations: number;
    refunds: number;
    todayConfirmed: number;
  };
  activityFeed: {
    id: string;
    message: string;
    timestamp: string;
    status: BookingStatus;
  }[];
  range: 'week' | 'month' | 'year';
}

interface UpcomingAppointmentsResponse {
  success: boolean;
  data: Booking[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

import { useQuery } from '@tanstack/react-query';
import PageContainer, { PageItem } from '@/components/ui/page-transition';

const STATUS_COLORS: Record<BookingStatus, string> = {
  confirmed: '#3B82F6',
  pending: '#F59E0B',
  cancelled: '#6b7280',
  ongoing: '#3B82F6',
  completed: '#10B981',
};

const PIE_COLORS = ['#0EA5E9', '#10B981', '#6366F1', '#F97316', '#A855F7'];

const useMetricConfig = () => {
  const t = useTranslations('AdminDashboard.metrics');

  return useMemo<Array<{
    key: keyof DashboardInsights['metrics'];
    label: string;
    helper: string;
    prefix?: string;
    icon: typeof CoinsEuroIcon;
  }>>(() => [
    {
      key: 'revenue',
      label: t('revenue.label'),
      helper: t('revenue.helper'),
      prefix: '€',
      icon: CoinsEuroIcon,
    },
    {
      key: 'clients',
      label: t('clients.label'),
      helper: t('clients.helper'),
      icon: InformationCircleIcon,
    },
    {
      key: 'appointmentsToday',
      label: t('appointmentsToday.label'),
      helper: t('appointmentsToday.helper'),
      icon: CalendarCheckInIcon,
    },
  ], [t]);
};

const formatEuro = (value?: number) => {
  if (value === undefined || value === null) return '—';
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);
};

const formatDelta = (value?: number) => {
  if (value === undefined || Number.isNaN(value)) return '0%';
  const rounded = Number(value.toFixed(2));
  const prefix = rounded > 0 ? '+' : '';
  return `${prefix}${rounded}%`;
};

const statusBadgeVariant = (status: BookingStatus | string) => {
  switch (status) {
    case 'confirmed':
      return 'confirmed';
    case 'pending':
      return 'pending';
    case 'cancelled':
      return 'destructive';
    case 'ongoing':
      return 'ongoing';
    case 'completed':
      return 'completed';
    default:
      return 'secondary';
  }
};

export default function DashboardClient() {
  const t = useTranslations('AdminDashboard');
  const tRoot = useTranslations();
  const metricConfig = useMetricConfig();

  const [insightsRange] = useState<'week' | 'month' | 'year'>('week');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [appointmentsPage] = useState(1);
  const [activeServiceIndex, setActiveServiceIndex] = useState(0);

  const recentBookingsTableColumns = useMemo(() => getRecentBookingsColumns(t, tRoot), [t, tRoot]);

  // Insights Query
  const { data: insights, isLoading: insightsLoading } = useQuery<DashboardInsights>({
    queryKey: ['dashboard-insights', insightsRange],
    queryFn: async () => {
      const response = await fetch(`/api/dashboard/insights?range=${insightsRange}`);
      const data = await response.json();
      if (!data.success) throw new Error('Failed to load insights');
      return data.data;
    },
  });

  // Upcoming Appointments Query
  const { data: upcomingData, isLoading: appointmentsLoading } = useQuery<UpcomingAppointmentsResponse>({
    queryKey: ['upcoming-appointments', format(selectedDate, 'yyyy-MM-dd'), appointmentsPage],
    queryFn: async () => {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const response = await fetch(
        `/api/dashboard/upcoming?date=${dateStr}&page=${appointmentsPage}&limit=6`
      );
      const data = await response.json();
      if (!data.success) throw new Error('Failed to fetch upcoming appointments');
      return data;
    },
  });

  const upcomingAppointments = upcomingData?.data || [];
  const appointmentsCount = upcomingData?.pagination?.total || 0;

  // Recent Bookings Query
  const { data: recentBookings = [], isLoading: recentBookingsLoading } = useQuery<RecentBookingSummary[]>({
    queryKey: ['recent-bookings'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/recent-bookings?limit=10');
      const data = await response.json();
      if (!data.success) throw new Error('Failed to load recent bookings');
      return data.data || [];
    },
  });

  const appointmentsTrendData = useMemo(() => {
    if (!insights) return [];
    const confirmedSeries = insights.statusTrend.series.find(
      (series) => series.key === 'confirmed'
    );
    const cancelledSeries = insights.statusTrend.series.find(
      (series) => series.key === 'cancelled'
    );
    return insights.statusTrend.labels.map((label, idx) => ({
      label,
      confirmed: confirmedSeries?.data[idx] ?? 0,
      cancelled: cancelledSeries?.data[idx] ?? 0,
    }));
  }, [insights]);

  const revenueChartData = useMemo(() => {
    if (!insights) return [];
    return insights.revenueTrend.labels.map((label, idx) => ({
      label,
      income: insights.revenueTrend.income[idx] ?? 0,
      refunds: insights.revenueTrend.refunds[idx] ?? 0,
    }));
  }, [insights]);

  const reports = useMemo(() => {
    if (!insights) {
      return [];
    }
    return [
      {
        title: t('reports.pendingConfirmations'),
        value: `${insights.operational.pendingBookings} bookings`, // "bookings" word might need translation too if it's dynamic
        detail: t('reports.details.followUp'), // reusing checking for consistency
      },
      {
        title: t('reports.cancellations'),
        value: `${insights.operational.cancellations}`,
        detail: t('reports.details.followUp'),
      },
      {
        title: t('reports.refundedPayments'),
        value: `${insights.operational.refunds}`,
        detail: t('reports.details.processed'),
      },
      {
        title: t('reports.confirmedToday'),
        value: `${insights.operational.todayConfirmed}`,
        detail: t('reports.details.ready'),
      },
    ];
  }, [insights, t]);

  const serviceDistribution = useMemo(
    () => insights?.serviceDistribution ?? [],
    [insights?.serviceDistribution]
  );
  const activeService = serviceDistribution[activeServiceIndex];
  //   const totalServiceBookings = useMemo(
  //     () => serviceDistribution.reduce((sum, entry) => sum + entry.value, 0),
  //     [serviceDistribution]
  //   );

  const formatClientName = (booking: Booking) => {
    if (booking.users?.first_name && booking.users?.last_name) {
      return `${booking.users.first_name} ${booking.users.last_name}`;
    }
    if (booking.users?.first_name) {
      return booking.users.first_name;
    }
    return booking.users?.email || 'Unknown';
  };

  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    return format(date, 'HH:mm');
  };
  const handleServiceEnter = (_: unknown, index: number) => {
    setActiveServiceIndex(index);
  };

  const renderActiveServiceShape = (props: PieSectorDataItem) => {
    const radius = props.outerRadius ?? 0;
    return <Sector {...props} outerRadius={radius + 8} />;
  };

  return (
    <PageContainer className="space-y-6 p-6 bg-card">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,2.1fr)_minmax(0,0.9fr)]">
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {metricConfig.map((config) => {
              const metric = insights?.metrics[config.key];
              const changeValue = metric?.change ?? 0;
              const isPositive = changeValue >= 0;
              const metricValue = metric?.value;
              const formattedValue =
                metricValue === undefined
                  ? '—'
                  : config.prefix
                    ? formatEuro(metricValue)
                    : metricValue.toLocaleString('nl-NL');
              return (
                <Card
                  key={config.key}
                  className="border border-muted bg-card shadow-lg rounded-[10px]"
                >
                  <CardContent className="p-0">
                    <div className="flex items-center justify-between p-4 pb-0">
                      <div>

                        <div className="flex items-center gap-2">
                          <HugeiconsIcon icon={config.icon} className="h-3 w-3 text-primary" />
                          <p className="text-xs text-muted-foreground">{config.label}</p>
                        </div>
                        <p className="mt-2 text-3xl font-semibold">{formattedValue}</p>
                      </div>
                    </div>
                    <p
                      className={cn(
                        'mt-4 text-xs font-semibold bg-muted px-4 py-2 rounded-b-[10px]',
                        isPositive ? 'text-emerald-600' : 'text-rose-600'
                      )}
                    >
                      {insightsLoading ? (
                        <HugeiconsIcon
                          icon={Loading03Icon}
                          className="h-4 w-4 animate-spin text-muted-foreground"
                        />
                      ) : (
                        formatDelta(changeValue)
                      )}{' '}
                      <span className="text-muted-foreground font-normal">{config.helper}</span>
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid gap-6 xl:grid-cols-1">
            <Card className="border border-muted bg-card rounded-[10px]">
              <CardContent className="p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold">{t('charts.allBookings.title')}</p>
                    <h3 className="text-xs font-normal">{t('charts.allBookings.subtitle')}</h3>
                  </div>
                  {/* <div className="flex items-center gap-1 rounded-full border border-border bg-muted/40 p-1 text-xs">
                    {rangeOptions.map((option) => (
                      <button
                        key={option.key}
                        onClick={() => setInsightsRange(option.key)}
                        className={cn(
                          'px-2.5 py-1 rounded-full font-semibold transition-colors',
                          insightsRange === option.key
                            ? 'bg-card text-primary shadow-sm'
                            : 'text-muted-foreground'
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div> */}
                </div>
                <div className="mt-0 h-[240px]">
                  {insightsLoading ? (
                    <div className="flex h-full items-center justify-center">
                      <HugeiconsIcon
                        icon={Loading03Icon}
                        className="h-6 w-6 animate-spin text-muted-foreground"
                      />
                    </div>
                  ) : (
                    <ResponsiveContainer>
                      <BarChart data={appointmentsTrendData} barCategoryGap={32} margin={{ left: -18, right: 12, top: 16, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1ede6" vertical={false} />
                        <XAxis
                          dataKey="label"
                          axisLine={false}
                          tickLine={false}
                          height={40}
                          tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
                        />
                        <YAxis
                          allowDecimals={false}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                          width={36}
                        />
                        <Tooltip
                          cursor={{ fill: '#F6EAE4' }}
                          contentStyle={{
                            backgroundColor: '#F6EAE4',
                            borderRadius: 5,
                            borderColor: '#f2ebe0',
                            fontSize: 12,
                          }}
                        />
                        <Legend
                          verticalAlign="top"
                          height={36}
                          wrapperStyle={{ paddingBottom: 8, paddingLeft: 18 }}
                          content={({ payload }: { payload: { value: string; color: string }[] }) => (
                            <div className="flex gap-4 text-xs font-medium">
                              {payload?.map((entry: { value: string; color: string }) => (
                                <div key={entry.value} className="flex items-center gap-2">
                                  <span
                                    className="inline-block h-2.5 w-2.5 rounded-full"
                                    style={{ backgroundColor: entry.color }}
                                  />
                                  <span className="text-muted-foreground">{entry.value}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        />
                        <Bar
                          dataKey="confirmed"
                          name="Confirmed"
                          fill={STATUS_COLORS.confirmed}
                          radius={[8, 8, 0, 0]}
                          barSize={18}
                        />
                        <Bar
                          dataKey="cancelled"
                          name="Cancelled"
                          fill={STATUS_COLORS.cancelled}
                          radius={[8, 8, 0, 0]}
                          barSize={18}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border border-muted rounded-[10px]">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{t('charts.revenue.title')}</p>
                    <h3 className="text-xs font-normal">{t('charts.revenue.subtitle')}</h3>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {insights?.range === 'week'
                      ? t('charts.revenue.lastSevenDays')
                      : insights?.range === 'month'
                        ? t('charts.revenue.lastSixWeeks')
                        : t('charts.revenue.yearToDate')}
                  </span>
                </div>
                <div className="mt-6 h-[240px]">
                  {insightsLoading ? (
                    <div className="flex h-full items-center justify-center">
                      <HugeiconsIcon
                        icon={Loading03Icon}
                        className="h-6 w-6 animate-spin text-muted-foreground"
                      />
                    </div>
                  ) : (
                    <ResponsiveContainer>
                      <LineChart data={revenueChartData} margin={{ left: -20, right: 12, top: 16, bottom: 0 }}>
                        <XAxis
                          dataKey="label"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value: number) => `€${value}`}
                        />
                        <Tooltip
                          formatter={(value: number | string) => formatEuro(value as number)}
                          contentStyle={{ borderRadius: 5, borderColor: '#f2ebe0', backgroundColor: '#F6EAE4', fontSize: 12 }}

                        />
                        <Line
                          type="monotone"
                          dataKey="income"
                          stroke="#6b7280"
                          strokeWidth={3}
                          dot={false}
                          name={t('charts.revenue.legend.income')}
                        />
                        <Line
                          type="monotone"
                          dataKey="refunds"
                          stroke="#AF6438"
                          strokeWidth={3}
                          dot={false}
                          name={t('charts.revenue.legend.refunds')}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card className="border border-muted rounded-[10px]">
              <CardContent className="p-6 flex flex-col gap-6">
                <div className="">
                  <p className="text-sm font-semibold">{t('charts.services.title')}</p>
                  <h3 className="text-xs">{t('charts.services.subtitle')}</h3>
                </div>
                <div className="flex flex-col items-center gap-4">
                  {serviceDistribution.length ? (
                    <div className="w-full">
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Tooltip
                            cursor={false}
                            contentStyle={{
                              borderRadius: 5,
                              borderColor: '#F6EAE4',
                              backgroundColor: '#F6EAE4',
                              color: 'hsl(var(--foreground))',
                              fontSize: 12,
                            }}
                          />
                          <Pie
                            data={serviceDistribution}
                            dataKey="value"
                            nameKey="label"
                            innerRadius={70}
                            outerRadius={90}
                            strokeWidth={5}
                            paddingAngle={4}
                            activeIndex={activeServiceIndex}
                            onMouseEnter={handleServiceEnter}
                            activeShape={renderActiveServiceShape}
                          >
                            {serviceDistribution.map((_, idx) => (
                              <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          {activeService ? (
                            <g>
                              <text
                                x="50%"
                                y="45%"
                                textAnchor="middle"
                                className="text-3xl font-semibold fill-foreground"
                              >
                                {activeService.value}
                              </text>
                              <text
                                x="50%"
                                y="60%"
                                textAnchor="middle"
                                className="text-xs fill-muted-foreground"
                              >
                                {t('charts.services.bookings')}
                              </text>
                            </g>
                          ) : null}
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="flex h-40 w-full items-center justify-center text-sm text-muted-foreground">
                      {t('charts.services.noData')}
                    </div>
                  )}
                  <div className="grid w-full gap-3 sm:grid-cols-1">
                    {serviceDistribution.slice(0, 4).map((service, idx) => (
                      <div
                        key={service.label}
                        className={cn(
                          'flex items-center gap-3 rounded-lg',
                          activeService?.label === service.label && 'border-primary bg-primary/5'
                        )}
                      >
                        <span
                          className="inline-flex h-2 w-2 rounded-full"
                          style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                        />
                        <div className="flex items-center justify-between w-full">
                          <p className="text-xs text-foreground">{service.label}</p>
                          <p className="text-xs font-semibold">
                            {service.percentage}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* {activeService && (
                    <div className="flex flex-col items-center gap-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2 font-semibold text-foreground">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        {activeService.percentage}% of all bookings
                      </div>
                      <p>
                        {totalServiceBookings.toLocaleString()} total appointments across services
                      </p>
                    </div>
                  )} */}
                </div>
              </CardContent>
            </Card>

            {/* <Card className="border border-muted rounded-[20px]">
              <CardContent className="p-6">
                <p className="text-xs text-muted-foreground">Doctors&apos; schedule</p>
                <h3 className="text-lg font-semibold">Upcoming shifts</h3>
                <div className="mt-4 space-y-4">
                  {appointmentsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <HugeiconsIcon
                        icon={Loading03Icon}
                        className="h-6 w-6 animate-spin text-muted-foreground"
                      />
                    </div>
                  ) : upcomingAppointments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No appointments scheduled.</p>
                  ) : (
                    upcomingAppointments.slice(0, 4).map((booking) => (
                      <div key={booking.id} className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-sm">
                            {booking.staff?.first_name
                              ? `${booking.staff.first_name} ${booking.staff.last_name || ''}`
                              : formatClientName(booking)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {booking.services?.name || 'Unknown service'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">{formatTime(booking.start_time)}</p>
                          <p className="text-xs text-emerald-600">Available</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card> */}

            <Card className="border border-muted bg-muted rounded-[10px]">
              <CardContent className="p-6">
                <p className="text-sm font-semibold">{t('reports.title')}</p>
                <h3 className="text-xs font-normal">{t('reports.subtitle')}</h3>
                <div className="mt-4 space-y-4">
                  {reports.map((report) => (
                    <div
                      key={report.title}
                      className="flex items-center justify-between rounded-lg bg-border border p-3 text-sm shadow-md"
                      style={{ borderRadius: '1rem' }}
                    >
                      <p className="text-xs font-semibold">{report.title}</p>
                      <p className="text-lg font-semibold">{report.value}</p>
                      {/* <p className="text-xs text-muted-foreground">{report.detail}</p> */}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border border-muted rounded-[10px]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{t('recentBookings.title')}</p>
                  <h3 className="text-xs font-normal">{t('recentBookings.subtitle')}</h3>
                </div>
                <Link href="/dashboard/bookings" className="text-xs text-primary hover:underline">
                  {t('recentBookings.viewAll')}
                </Link>
              </div>
              <div className="mt-4">
                {recentBookingsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <HugeiconsIcon
                      icon={Loading03Icon}
                      className="h-6 w-6 animate-spin text-muted-foreground"
                    />
                  </div>
                ) : (
                  <DataTable
                    columns={recentBookingsTableColumns}
                    data={recentBookings}
                    emptyMessage={t('recentBookings.empty')}
                    showSearchBar={false}
                    showPagination={false}
                    showColumnToggle={false}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border border-muted bg-background rounded-[10px]">
            <CardContent className="p-4">
              {/* <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{format(selectedDate, 'MMMM yyyy')}</p>
                  <h3 className="text-lg font-semibold">Schedule</h3>
                </div>
                <Button variant="outline" size="sm">
                  <HugeiconsIcon icon={Calendar02Icon} className="mr-2 h-4 w-4" />
                  Add event
                </Button>
              </div> */}
              <div className="">
                <DashboardCalendar
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                />
              </div>
              <p className="mt-8 text-xs font-semibold text-muted-foreground">
                {t('schedule.appointmentsOn', { count: appointmentsCount, date: format(selectedDate, 'EEEE, d MMMM') })}
              </p>
              <div className="mt-4 space-y-3">
                {appointmentsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <HugeiconsIcon
                      icon={Loading03Icon}
                      className="h-6 w-6 animate-spin text-muted-foreground"
                    />
                  </div>
                ) : upcomingAppointments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    {t('schedule.noAppointments')}
                  </p>
                ) : (
                  upcomingAppointments.map((booking) => (
                    <div key={booking.id} className="flex gap-3">
                      <div className="flex-1 rounded-xl border border-border bg-card px-4 py-3 shadow-md">
                        <div className="flex items-center justify-between">
                          <div className="w-10 text-xs font-semibold text-muted-foreground">
                            {formatTime(booking.start_time)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold">
                              {booking.services?.name || t('recentBookings.unknownService')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatClientName(booking)}
                            </p>
                          </div>
                          <Badge variant={statusBadgeVariant(booking.status)} className="text-xs capitalize">
                            {booking.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-muted rounded-[10px]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{t('activity.title')}</p>
                  <h3 className="text-xs font-normal">{t('activity.subtitle')}</h3>
                </div>
                <Button variant="ghost" size="sm">
                  {t('activity.viewAll')}
                </Button>
              </div>
              <div className="mt-4 space-y-4">
                {insights?.activityFeed?.length ? (
                  insights.activityFeed.map((item) => (
                    <div
                      key={item.id}
                      className="bg-gray-50 rounded-xl p-4 shadow-md"
                    >
                      <div className="flex items-center justify-between text-sm">
                        <p className="font-medium">{item.message}</p>
                        {/* <Badge variant={statusBadgeVariant(item.status)} className="text-xs capitalize">
                            {item.status}
                            </Badge> */}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">{t('activity.empty')}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}



