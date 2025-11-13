'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WeeklyCalendar } from '@/components/ui/weekly-calendar';
import { HugeiconsIcon } from '@hugeicons/react';
import { ClockIcon, InformationCircleIcon, Loading03Icon } from '@hugeicons/core-free-icons';
import { DashboardActivityChart } from '@/components/dashboard-activity-chart';
import { DataTable } from '@/components/ui/data-table';
import { recentBookingsColumns } from '@/components/recent-bookings-table-columns';
import { format } from 'date-fns';
import Link from 'next/link';
import { Booking, RecentBookingSummary } from '@/lib/types/booking';

type ServicePeriod = 'day' | 'week' | 'month' | 'year';

interface ServiceBookingSeries {
  serviceId: string;
  serviceName: string;
  serviceCode: string | null;
  data: number[];
}

interface ServiceBookingTotals {
  serviceId: string;
  serviceName: string;
  serviceCode: string | null;
  count: number;
}

interface ServiceBookingsData {
  period: ServicePeriod;
  labels: string[];
  series: ServiceBookingSeries[];
  totals: ServiceBookingTotals[];
}

interface DashboardStats {
  todayAppointments: number;
  totalAppointments: number;
  serviceBookings: ServiceBookingsData;
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

export default function DashboardClient() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [upcomingAppointments, setUpcomingAppointments] = useState<Booking[]>([]);
  const [appointmentsCount, setAppointmentsCount] = useState(0);
  const [appointmentsPage, setAppointmentsPage] = useState(1);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [period, setPeriod] = useState<ServicePeriod>('week');
  const [recentBookings, setRecentBookings] = useState<RecentBookingSummary[]>([]);
  const [recentBookingsLoading, setRecentBookingsLoading] = useState(false);
  const recentBookingsTableColumns = useMemo(() => recentBookingsColumns, []);

  // Fetch dashboard stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`/api/dashboard/stats?period=${period}`);
      const data = await response.json();
      
      if (data.success) {
        setStats(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, [period]);

  // Fetch upcoming appointments for selected date
  const fetchUpcomingAppointments = useCallback(async () => {
    try {
      setAppointmentsLoading(true);
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const response = await fetch(`/api/dashboard/upcoming?date=${dateStr}&page=${appointmentsPage}&limit=5`);
      const data: UpcomingAppointmentsResponse = await response.json();
      
      if (data.success) {
        setUpcomingAppointments(data.data || []);
        setAppointmentsCount(data.pagination.total);
      }
    } catch (err) {
      console.error('Failed to fetch upcoming appointments:', err);
    } finally {
      setAppointmentsLoading(false);
    }
  }, [selectedDate, appointmentsPage]);

  const fetchRecentBookings = useCallback(async () => {
    try {
      setRecentBookingsLoading(true);
      const response = await fetch('/api/dashboard/recent-bookings?limit=10');
      const data = await response.json();

      if (data.success) {
        setRecentBookings(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch recent bookings:', err);
    } finally {
      setRecentBookingsLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchUpcomingAppointments(), fetchRecentBookings()]);
      setLoading(false);
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchUpcomingAppointments();
  }, [fetchUpcomingAppointments]);

  useEffect(() => {
    fetchRecentBookings();
  }, [fetchRecentBookings]);

  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    return format(date, 'h:mm a');
  };

  const formatClientName = (booking: Booking) => {
    if (booking.users?.first_name && booking.users?.last_name) {
      return `${booking.users.first_name} ${booking.users.last_name}`;
    }
    if (booking.users?.first_name) {
      return booking.users.first_name;
    }
    return booking.users?.email || 'Unknown';
  };

  return (
    <div className="space-y-6 p-6">
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Stats, Activity, Staff */}
        <div className="lg:col-span-2 space-y-6">
          {/* Appointments Stats Cards */}
          <div className="p-4 bg-card border rounded-lg" style={{borderRadius: '0.2rem'}}>
            <h2 className="text-sm font-bold mb-6">Appointments</h2>
            <div className="grid grid-cols-2 gap-4">
              <Card className='bg-muted border-muted' style={{borderRadius: '0.2rem'}}>
                <CardContent className="p-4">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                        <HugeiconsIcon icon={InformationCircleIcon} className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mb-1">Today&apos;s appointments</p>
                    </div>
                    <div className="flex-1"> 
                      <p className="text-3xl font-bold">
                        {loading ? (
                          <HugeiconsIcon icon={Loading03Icon} className="h-6 w-6 animate-spin inline" />
                        ) : (
                          stats?.todayAppointments || 0
                        )}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className='bg-muted border-muted' style={{borderRadius: '0.2rem'}}>
                <CardContent className="p-4">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                        <HugeiconsIcon icon={InformationCircleIcon} className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mb-1">Total appointments</p>
                    </div>
                    <div className="flex-1">
                      <p className="text-3xl font-bold">
                        {loading ? (
                          <HugeiconsIcon icon={Loading03Icon} className="h-6 w-6 animate-spin inline" />
                        ) : (
                          stats?.totalAppointments || 0
                        )}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

      {/* Service Activity Chart */}
          <div className="p-4 bg-card border rounded-lg" style={{borderRadius: '0.2rem'}}>
            <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-bold">Service booking activity</h2>
          <Select value={period} onValueChange={(value) => setPeriod(value as ServicePeriod)}>
            <SelectTrigger className="w-[160px] bg-card border-muted" style={{borderRadius: '10rem'}}>
                  <SelectValue />
                </SelectTrigger>
            <SelectContent className="bg-card border border-muted" style={{borderRadius: '0.5rem'}}>
              <SelectItem value="day">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="p-2"> 
              {loading || !stats ? (
                <div className="flex items-center justify-center h-[260px]">
                    <HugeiconsIcon icon={Loading03Icon} className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <DashboardActivityChart data={stats.serviceBookings} />
              )}
            </div>
          </div>
        </div>

        {/* Right Side - Calendar and Upcoming Appointments */}
        <div className="space-y-6">
          <div className="p-4 bg-card border rounded-lg" style={{borderRadius: '0.2rem'}}>
            <h2 className="text-sm font-bold mb-6">Upcoming appointments</h2>
            <div className="bg-accent border-muted" style={{borderRadius: '0.2rem'}}>
                <WeeklyCalendar
                  selectedDate={selectedDate}
                  onSelect={setSelectedDate}
                  className="text-foreground"
                />
            </div>
            
            <p className="text-xs font-semibold text-muted-foreground mt-4">
              {appointmentsCount} Appointments {format(selectedDate, 'EEEE') === format(new Date(), 'EEEE') && format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? 'today' : `on ${format(selectedDate, 'MMMM d')}`}
            </p>

            <div className="space-y-2 mt-8">
              {appointmentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <HugeiconsIcon icon={Loading03Icon} className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : upcomingAppointments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No appointments scheduled
                </p>
              ) : (
                upcomingAppointments.map((booking) => (
                  <div key={booking.id} className="rounded-lg bg-muted/50 border-l-4 border-primary">
                    <div className="flex items-start py-2 pl-4">
                      <div className="h-full w-1 rounded-full bg-foreground" />
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          {/* <div className="flex -space-x-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-background bg-primary/20 text-xs font-medium">
                              {formatClientName(booking).charAt(0).toUpperCase()}
                            </div>
                            <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-background bg-secondary/20 text-xs font-medium">
                              {booking.staff?.first_name?.charAt(0)?.toUpperCase() || booking.staff?.last_name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                          </div> */}
                          <div className="flex flex-col gap-1">
                          <p className="font-semibold text-sm truncate max-w-[100%]">
                            {formatClientName(booking)}
                          </p>
                          {booking.staff?.first_name ? (
                            <span className="text-xs text-muted-foreground truncate">
                              {booking.staff.first_name}
                              {booking.staff.last_name ? ` ${booking.staff.last_name}` : ''}
                              {booking.services?.service_code ? ` • ${booking.services.service_code}` : ''}
                            </span>
                          ) : null}
                          {/* <p className="text-sm text-muted-foreground">
                          {booking.services?.name || 'Unknown Service'} {booking.services?.service_code ? ` (${booking.services.service_code})` : ''}
                        </p> */}
                        </div>
                        <p className="text-xs text-primary">
                        <HugeiconsIcon icon={ClockIcon} className="h-2 w-2 inline-block mr-1 text-primary" /> {formatTime(booking.start_time)}
                      </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            {appointmentsCount > 5 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                {[1, 2, 3, 4, 5].map((num) => {
                  const totalPages = Math.ceil(appointmentsCount / 5);
                  if (num > totalPages) return null;
                  return (
                    <Button
                      key={num}
                      variant={appointmentsPage === num ? 'default' : 'outline'}
                      size="sm"
                      className="w-6 h-6 p-0 rounded-full"
                      style={{ borderRadius: '10rem' }}
                      onClick={() => setAppointmentsPage(num)}
                    >
                      {num}
                    </Button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Staff Preview - Full Width */}
      <div className="p-4 bg-card border rounded-lg" style={{borderRadius: '0.2rem'}}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold">Latest bookings</h2>
          <Link href="/dashboard/bookings" className="text-sm text-muted-foreground hover:text-foreground">
            View all
          </Link>
        </div>
        <div>
            {recentBookingsLoading ? (
              <div className="flex items-center justify-center py-12">
                <HugeiconsIcon icon={Loading03Icon} className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <DataTable
                columns={recentBookingsTableColumns}
                data={recentBookings}
                emptyMessage="No recent bookings to display."
                showSearchBar={false}
                showPagination={false}
              />
            )}
          </div>
      </div>
    </div>
  );
}
