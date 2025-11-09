'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HugeiconsIcon } from '@hugeicons/react';
import { InformationCircleIcon, Loading03Icon } from '@hugeicons/core-free-icons';
import { DashboardActivityChart } from '@/components/dashboard-activity-chart';
import { format } from 'date-fns';
import Link from 'next/link';
import { Booking } from '@/lib/types/booking';

interface DashboardStats {
  todayAppointments: number;
  totalAppointments: number;
  weeklyActivity: {
    day: string;
    approved: number;
    rescheduled: number;
  }[];
}

interface StaffMember {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  locations: string[];
  services: string[];
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
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [staffLoading, setStaffLoading] = useState(true);
  const [period, setPeriod] = useState('week');

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
      const response = await fetch(`/api/dashboard/upcoming?date=${dateStr}&page=${appointmentsPage}&limit=10`);
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

  // Fetch staff preview
  const fetchStaff = useCallback(async () => {
    try {
      setStaffLoading(true);
      const response = await fetch('/api/dashboard/staff?limit=5');
      const data = await response.json();
      
      if (data.success) {
        setStaff(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch staff:', err);
    } finally {
      setStaffLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchUpcomingAppointments(), fetchStaff()]);
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

  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    return format(date, 'h:mm a');
  };

  const formatClientName = (booking: Booking) => {
    if (booking.users?.first_name && booking.users?.last_name) {
      return `${booking.users.first_name} & ${booking.users.last_name}`;
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
          <div>
            <h2 className="text-2xl font-bold mb-4">Appointments</h2>
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-muted p-2">
                      <HugeiconsIcon icon={InformationCircleIcon} className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground mb-1">Today&apos;s appointments</p>
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
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-muted p-2">
                      <HugeiconsIcon icon={InformationCircleIcon} className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground mb-1">Total appointments</p>
                      <p className="text-3xl font-bold">
                        {loading ? (
                          <HugeiconsIcon icon={Loading03Icon} className="h-6 w-6 animate-spin inline" />
                        ) : (
                          stats?.totalAppointments ? (stats.totalAppointments >= 1000 ? `${(stats.totalAppointments / 1000).toFixed(1)}K` : stats.totalAppointments.toString()) : '0'
                        )}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Appointments Activity Chart */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Appointments activity</h2>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Card>
              <CardContent className="p-6">
                {loading || !stats ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <HugeiconsIcon icon={Loading03Icon} className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <DashboardActivityChart data={stats.weeklyActivity} period={period === 'week' ? 'This Week' : 'This Month'} />
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Side - Calendar and Upcoming Appointments */}
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-4">Upcoming appointments</h2>
            <Card className="bg-[#8B4513] border-[#8B4513]">
              <CardContent className="p-4">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  className="rounded-md text-white [&_.rdp-button_previous]:text-white [&_.rdp-button_next]:text-white [&_.rdp-month_caption]:text-white [&_.rdp-weekday]:text-white [&_.rdp-day_button]:text-white [&_.rdp-day_button:hover]:bg-white/20 [&_.rdp-day_button[data-selected-single=true]]:bg-white [&_.rdp-day_button[data-selected-single=true]]:text-[#8B4513]"
                />
              </CardContent>
            </Card>
            
            <p className="text-sm text-muted-foreground mt-4">
              {appointmentsCount} Appointments {format(selectedDate, 'EEEE') === format(new Date(), 'EEEE') && format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? 'today' : `on ${format(selectedDate, 'MMMM d')}`}
            </p>

            <div className="space-y-2 mt-4">
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
                  <Card key={booking.id} className="bg-muted/50">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-1 bg-foreground rounded-full flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="flex -space-x-2">
                              <div className="w-6 h-6 rounded-full bg-primary/20 border-2 border-background flex items-center justify-center text-xs font-medium">
                                {formatClientName(booking).charAt(0).toUpperCase()}
                              </div>
                              <div className="w-6 h-6 rounded-full bg-secondary/20 border-2 border-background flex items-center justify-center text-xs font-medium">
                                {formatClientName(booking).split(' ')[1]?.charAt(0).toUpperCase() || '?'}
                              </div>
                            </div>
                            <p className="font-semibold text-sm truncate">
                              {formatClientName(booking)}
                            </p>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {booking.services?.name || 'Unknown Service'}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1 text-right">
                            {formatTime(booking.start_time)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Pagination */}
            {appointmentsCount > 10 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                {[1, 2, 3, 4, 5].map((num) => {
                  const totalPages = Math.ceil(appointmentsCount / 10);
                  if (num > totalPages) return null;
                  return (
                    <Button
                      key={num}
                      variant={appointmentsPage === num ? 'default' : 'outline'}
                      size="sm"
                      className="w-8 h-8 p-0"
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
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Staff</h2>
          <Link href="/dashboard/staff" className="text-sm text-muted-foreground hover:text-foreground">
            View all
          </Link>
        </div>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Name</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Phone Number</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Location</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Services</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {staffLoading ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center">
                        <HugeiconsIcon icon={Loading03Icon} className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
                      </td>
                    </tr>
                  ) : staff.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground">
                        No staff found
                      </td>
                    </tr>
                  ) : (
                    staff.map((member) => (
                      <tr key={member.id} className="border-b">
                        <td className="p-4">
                          {member.first_name} {member.last_name}
                        </td>
                        <td className="p-4 text-muted-foreground">
                          {member.phone || '-'}
                        </td>
                        <td className="p-4 text-muted-foreground">
                          {member.locations.length > 0 ? member.locations[0] : '-'}
                        </td>
                        <td className="p-4 text-muted-foreground">
                          {member.services.length > 0 ? member.services.slice(0, 2).join(', ') : '-'}
                        </td>
                        <td className="p-4">
                          <Link 
                            href={`/dashboard/staff`}
                            className="text-sm text-primary hover:underline"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
