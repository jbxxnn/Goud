'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { startOfMonth, endOfMonth, subMonths, addMonths, format, startOfWeek, endOfWeek, subDays, addDays } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { HugeiconsIcon } from '@hugeicons/react';
import { Loading03Icon, CalendarIcon, ViewIcon, LeftToRightListDashIcon, PlusSignIcon, RotateLeft01Icon } from '@hugeicons/core-free-icons';
import { AddBookingDialog } from '@/calendar/components/dialogs/add-booking-dialog';
import { Staff } from '@/lib/types/staff';
import { Booking, BookingsResponse } from '@/lib/types/booking';
import { bookingToCalendarEvent } from '@/lib/utils/booking-mapper';
import { formatInTimeZone } from 'date-fns-tz';
import { CalendarProvider } from '@/calendar/contexts/calendar-context';
import { BookingCalendarContainer } from '@/components/booking-calendar-container';
import { CalendarSettings } from '@/components/calendar-settings';
import { IEvent } from '@/calendar/interfaces';
import { ShiftWithDetails, ShiftsWithDetailsResponse, shiftToCalendarEvent } from '@/lib/types/shift';
import { expandRecurringShifts } from '@/lib/utils/expand-recurring-shifts';
import type { TCalendarView } from '@/calendar/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PageContainer, { PageItem } from '@/components/ui/page-transition';
import { DataTable } from '@/components/ui/data-table';
import { createBookingColumns } from '@/components/bookings-table-columns';
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';
import BookingModal from '@/components/booking-modal';
import BookingRescheduleModal from '@/components/booking-reschedule-modal';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Calendar03Icon } from '@hugeicons/core-free-icons';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

interface BookingsClientProps {
  initialBookings: Booking[];
  initialPagination: {
    page: number;
    totalPages: number;
  };
  clientId?: string; // Optional: if provided, filter bookings for this client only
  staffId?: string; // Optional: if provided, filter bookings for this staff only
  onBookingClick?: (booking: Booking) => void;
  userRole?: string;
}

export default function BookingsClient({
  initialBookings,
  initialPagination,
  clientId,
  staffId,
  onBookingClick,
  userRole
}: BookingsClientProps) {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const t = useTranslations('Bookings');
  const tStatus = useTranslations('BookingStatus');
  // State for filters and view
  const [page, setPage] = useState(initialPagination.page);
  const [limit, setLimit] = useState<number>(100);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('calendar');
  const [calendarView, setCalendarView] = useState<TCalendarView>('week');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const debouncedSearchQuery = useDebounce(searchQuery, 400);
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [locations, setLocations] = useState<{ id: string, name: string, color?: string }[]>([]);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isDateFromOpen, setIsDateFromOpen] = useState(false);
  const [isDateToOpen, setIsDateToOpen] = useState(false);

  useEffect(() => {
    const fetchLocations = async () => {
      const supabase = createClient();
      const { data } = await supabase.from('locations').select('id, name, color').eq('is_active', true).order('name');
      if (data) setLocations(data);
    };
    fetchLocations();
  }, []);

  // Modal states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
  const [isDeleteMode, setIsDeleteMode] = useState(false);

  const hasActiveFilters = statusFilter !== 'all' || locationFilter !== 'all' || dateFrom !== '' || dateTo !== '' || searchQuery !== '';

  const handleResetFilters = useCallback(() => {
    setStatusFilter('all');
    setLocationFilter('all');
    setDateFrom('');
    setDateTo('');
    setSearchQuery('');
    setPage(1);
  }, []);
  const [viewingBooking, setViewingBooking] = useState<Booking | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [reschedulingBooking, setReschedulingBooking] = useState<Booking | null>(null);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [loadingBookingId, setLoadingBookingId] = useState<string | null>(null);

  // Derive the active date from URL or default to today
  const activeDate = useMemo(() => {
    const dateParam = searchParams.get('date');
    if (dateParam) {
      const d = new Date(dateParam);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  }, [searchParams]);

  // Calculate the fetching range
  const { fetchDateFrom, fetchDateTo } = useMemo(() => {
    if (viewMode === 'table') {
      return { fetchDateFrom: dateFrom, fetchDateTo: dateTo };
    }
    
    // For calendar, we need to be careful with the 1000-item limit.
    // Instead of a broad 3-month window, we narrow it based on the current view.
    let start, end;
    if (calendarView === 'week' || calendarView === 'day') {
      // Current week +/- 1 week buffer
      start = startOfWeek(subDays(activeDate, 7), { weekStartsOn: 1 });
      end = endOfWeek(addDays(activeDate, 7), { weekStartsOn: 1 });
    } else {
      // Current month +/- 2 weeks buffer
      start = startOfMonth(subDays(activeDate, 14));
      end = endOfMonth(addDays(activeDate, 14));
    }

    return {
      fetchDateFrom: start.toISOString(),
      fetchDateTo: end.toISOString()
    };
  }, [viewMode, activeDate, dateFrom, dateTo, calendarView]);

  // Bookings Query
  const { data: bookingsData, isLoading: bookingsLoading, isFetching: bookingsFetching } = useQuery<BookingsResponse>({
    queryKey: ['bookings', page, limit, statusFilter, fetchDateFrom, fetchDateTo, debouncedSearchQuery, clientId, staffId, locationFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (fetchDateFrom) params.append('dateFrom', fetchDateFrom);
      if (fetchDateTo) params.append('dateTo', fetchDateTo);
      if (debouncedSearchQuery) params.append('search', debouncedSearchQuery);
      if (clientId) params.append('clientId', clientId);
      if (staffId) params.append('staffId', staffId);
      if (locationFilter && locationFilter !== 'all') params.append('locationId', locationFilter);

      // Sorting: Use start_time for calendar to ensure bookings in the window are shown first
      if (viewMode === 'calendar') {
        params.append('sortBy', 'start_time');
        params.append('sortOrder', 'asc');
      } else {
        // Table mode defaults to created_at desc
        params.append('sortBy', 'created_at');
        params.append('sortOrder', 'desc');
      }

      const response = await fetch(`/api/bookings?${params}`);
      const data: BookingsResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch bookings');
      }
      return data;
    },
    // Keep previous data while fetching new page for smoother pagination
    placeholderData: (previousData) => previousData,
  });

  const bookings = bookingsData?.data || [];
  const totalPages = bookingsData?.pagination?.total_pages || 0;
  const total = bookingsData?.pagination?.total || 0;
  const statusCounts = bookingsData?.statusCounts || {};
  const loading = bookingsLoading;
  
  // Breaks Query (for both staff dashboard and admin global calendar)
  const { data: breaksData } = useQuery({
    queryKey: ['staff-breaks', staffId || 'all', fetchDateFrom, fetchDateTo],
    enabled: viewMode === 'calendar',
    queryFn: async () => {
      const params = new URLSearchParams();
      if (staffId) params.append('staffId', staffId);
      if (fetchDateFrom) params.append('startDate', fetchDateFrom);
      if (fetchDateTo) params.append('endDate', fetchDateTo);
      
      const url = `/api/dashboard/staff-breaks?${params.toString()}`;
      const response = await fetch(url);
      const data = await response.json();
      return data.success ? data.data : [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const breaks = breaksData || [];
  
  // Shifts Query (to show active shifts in the background)
  const { data: shiftsData } = useQuery<ShiftWithDetails[]>({
    queryKey: ['shifts', 'all', staffId, locationFilter],
    queryFn: async () => {
      const dateToUse = new Date();
      const startOfMonth = new Date(dateToUse.getFullYear(), dateToUse.getMonth() - 1, 1);
      const endOfWindow = new Date(dateToUse.getFullYear(), dateToUse.getMonth() + 3, 0);

      const params = new URLSearchParams({
        with_details: 'true',
        start_date: startOfMonth.toISOString(),
        end_date: endOfWindow.toISOString(),
        limit: '1000',
      });

      if (staffId) params.append('staff_id', staffId);
      if (locationFilter && locationFilter !== 'all') params.append('location_id', locationFilter);

      const response = await fetch(`/api/shifts?${params}`);
      const data: ShiftsWithDetailsResponse = await response.json();
      if (!data.success) return [];
      
      const rawShifts = data.data || [];
      return expandRecurringShifts(rawShifts, startOfMonth, endOfWindow);
    },
    staleTime: 5 * 60 * 1000,
  });

  const shifts = shiftsData || [];
  
  // Staff Query (to get all active staff for the calendar)
  const { data: allStaffData } = useQuery<Staff[]>({
    queryKey: ['staff', 'active'],
    queryFn: async () => {
      const response = await fetch('/api/staff?active_only=true&limit=1000');
      const data = await response.json();
      if (!data.success) return [];
      return data.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const allStaff = allStaffData || [];

  const calendarEvents = useMemo(() => {
    const bookingEvents = bookings
      .filter(booking => booking.status !== 'cancelled')
      .map(booking => bookingToCalendarEvent(booking));
    
    const breakEvents = (breaks || []).map((b: any) => {
      const startLocalHhMm = formatInTimeZone(new Date(b.start_time), 'Europe/Amsterdam', 'HH:mm');
      const endLocalHhMm = formatInTimeZone(new Date(b.end_time), 'Europe/Amsterdam', 'HH:mm');
      const startYyyyMmDd = b.start_time.substring(0, 10);
      const endYyyyMmDd = b.end_time.substring(0, 10);

      const visualStartString = `${startYyyyMmDd}T${startLocalHhMm}:00`;
      const visualEndString = b.end_time > b.start_time && endYyyyMmDd !== startYyyyMmDd 
        ? `${endYyyyMmDd}T${endLocalHhMm}:00`
        : `${startYyyyMmDd}T${endLocalHhMm}:00`;

      const locationColor = locations.find(l => l.id === b.location_id)?.color || 'gray';

      return {
        id: `break-${b.id}`,
        startDate: visualStartString,
        endDate: visualEndString,
        title: b.name || 'Break',
        color: locationColor as any,
        description: `${b.name || 'Break'}\nStaff: ${b.staff?.first_name} ${b.staff?.last_name}`,
        user: {
          id: b.staff?.id || 'unassigned',
          name: b.staff ? `${b.staff.first_name} ${b.staff.last_name}` : 'Unassigned',
          picturePath: null,
        },
        metadata: { 
          isBreak: true,
          _originalStartTime: b.start_time,
          _originalEndTime: b.end_time
        }
      };
    }) as IEvent[];

    const shiftBackgroundEvents = (shifts || []).map(shift => {
      const event = shiftToCalendarEvent(shift);
      const locationColor = locations.find(l => l.id === shift.location_id)?.color || '#94a3b8';
      
      return {
        ...event,
        title: `Shift: ${event.title}`,
        color: locationColor as any, // Use location color for background shifts
        metadata: { ...event.metadata, isShift: true }
      };
    }) as IEvent[];

    return [...bookingEvents, ...breakEvents, ...shiftBackgroundEvents];
  }, [bookings, breaks, shifts, locations]);


  // Cancel booking
  const handleCancel = async (booking: Booking) => {
    setBookingToCancel(booking);
    setIsDeleteMode(false);
    setDeleteDialogOpen(true);
  };

  const confirmCancel = async () => {
    if (!bookingToCancel) return;
    setIsActionLoading(true);

    try {
      const response = await fetch(`/api/bookings/${bookingToCancel.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'cancelled' }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to cancel booking');
      }

      // Refresh bookings
      await queryClient.invalidateQueries({ queryKey: ['bookings'] });
      setDeleteDialogOpen(false);
      setBookingToCancel(null);
      toast.success(t('toasts.cancelSuccess'), {
        description: t('toasts.cancelSuccessDesc'),
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('toasts.cancelError');
      toast.error(t('toasts.cancelError'), {
        description: errorMessage,
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  // No Show booking
  const handleNoShow = async (booking: Booking) => {
    try {
      const response = await fetch(`/api/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'no_show' }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to mark as no show');
      }

      await queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast.success(t('toasts.noShowSuccess', { fallback: 'Successfully marked as no show' }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error marking as no show';
      toast.error(errorMessage);
      throw err;
    }
  };

  // Delete booking (permanently remove cancelled booking)
  const handleDelete = (booking: Booking) => {
    setBookingToCancel(booking);
    setIsDeleteMode(true);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!bookingToCancel) return;
    setIsActionLoading(true);

    try {
      const response = await fetch(`/api/bookings/${bookingToCancel.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete booking');
      }

      // Refresh bookings
      await queryClient.invalidateQueries({ queryKey: ['bookings'] });
      setDeleteDialogOpen(false);
      setBookingToCancel(null);
      toast.success(t('toasts.deleteSuccess'), {
        description: t('toasts.deleteSuccessDesc'),
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('toasts.deleteError');
      toast.error(t('toasts.deleteError'), {
        description: errorMessage,
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  // View booking
  const handleView = (booking: Booking) => {
    if (onBookingClick) {
      setLoadingBookingId(booking.id);
      onBookingClick(booking);
      return;
    }
    setViewingBooking(booking);
    setIsViewModalOpen(true);
  };

  // Reschedule booking
  const handleReschedule = async (
    bookingId: string,
    newStartTime: string,
    newEndTime: string,
    locationId: string,
    staffId: string,
    shiftId: string
  ) => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          start_time: newStartTime,
          end_time: newEndTime,
          location_id: locationId,
          staff_id: staffId,
          shift_id: shiftId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to reschedule booking');
      }

      await queryClient.invalidateQueries({ queryKey: ['bookings'] });
    } catch (err) {
      throw err;
    }
  };

  // Reset to page 1 when limit changes
  useEffect(() => {
    setPage(1);
  }, [limit]);

  useEffect(() => {
    if (viewMode === 'calendar') {
      setLimit(1000); // Fetch more for calendar mode
    } else {
      // Keep the current limit if it's already a table-friendly value (10, 25, 50, 100, 200)
      // otherwise default to 100
      setLimit(prev => (prev > 200 ? 100 : prev));
    }
  }, [viewMode]);

  const calendarUsersList = useMemo(() => {
    return allStaff.map(s => ({
      id: s.id,
      name: `${s.first_name} ${s.last_name}`,
      picturePath: null
    }));
  }, [allStaff]);

  return (
    <PageContainer className="space-y-6 p-6 bg-card">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-md font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground text-sm">
            {t('description')}
          </p>
        </div>

        <div className="flex items-center bg-accent rounded-full p-1 border">
          <Button
            variant={viewMode === 'calendar' ? 'secondary' : 'ghost'}
            size="sm"
            className="gap-2 h-8"
            onClick={() => setViewMode('calendar')}
          >
            <HugeiconsIcon icon={ViewIcon} size={16} />
            {t('views.calendar')}
          </Button>
          <Button
            variant={viewMode === 'table' ? 'secondary' : 'ghost'}
            size="sm"
            className="gap-2 h-8"
            onClick={() => setViewMode('table')}
          >
            <HugeiconsIcon icon={LeftToRightListDashIcon} size={16} />
            {t('views.list')}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        {viewMode === 'table' && (
          <>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">{t('filters.status')}:</label>
              <select
                title="Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border bg-card px-3 py-1.5 text-sm h-10"
                style={{ borderRadius: '1rem' }}
              >
                <option value="all">{t('filters.all')} ({statusCounts.all || 0})</option>
                <option value="pending">{tStatus('pending')} ({statusCounts.pending || 0})</option>
                <option value="confirmed">{tStatus('confirmed')} ({statusCounts.confirmed || 0})</option>
                <option value="ongoing">{tStatus('ongoing')} ({statusCounts.ongoing || 0})</option>
                <option value="completed">{tStatus('completed')} ({statusCounts.completed || 0})</option>
                <option value="cancelled">{tStatus('cancelled')} ({statusCounts.cancelled || 0})</option>
                <option value="no_show">{tStatus('no_show')} ({statusCounts.no_show || 0})</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">{t('filters.location', { fallback: 'Location' })}:</label>
              <select
                title={t('filters.location', { fallback: 'Location' })}
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="border bg-card px-3 py-1.5 text-sm h-10"
                style={{ borderRadius: '1rem' }}
              >
                <option value="all">{t('filters.allLocations', { fallback: 'All Locations' })}</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">{t('filters.from')}:</label>
              <Popover open={isDateFromOpen} onOpenChange={setIsDateFromOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-40 h-10 rounded-xl justify-start text-left font-normal border-gray-200 bg-white hover:bg-white focus:bg-white transition-all duration-200 px-3 text-sm shadow-sm",
                      !dateFrom && "text-muted-foreground"
                    )}
                    style={{ borderRadius: "1rem" }}
                  >
                    <HugeiconsIcon icon={Calendar03Icon} className="mr-2 h-4 w-4" />
                    {dateFrom ? format(new Date(dateFrom), "dd-MM-yyyy") : <span>{t('filters.selectDate', { fallback: 'Select Date' })}</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-xl shadow-xl border border-gray-100 bg-white overflow-hidden" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFrom ? new Date(dateFrom) : undefined}
                    onSelect={(date) => {
                      setDateFrom(date ? format(date, 'yyyy-MM-dd') : '');
                      setIsDateFromOpen(false);
                    }}
                    captionLayout="dropdown"
                    fromYear={2020}
                    toYear={new Date().getFullYear() + 5}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">{t('filters.to')}:</label>
              <Popover open={isDateToOpen} onOpenChange={setIsDateToOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-40 h-10 rounded-xl justify-start text-left font-normal border-gray-200 bg-white hover:bg-white focus:bg-white transition-all duration-200 px-3 text-sm shadow-sm",
                      !dateTo && "text-muted-foreground"
                    )}
                    style={{ borderRadius: "1rem" }}
                  >
                    <HugeiconsIcon icon={Calendar03Icon} className="mr-2 h-4 w-4" />
                    {dateTo ? format(new Date(dateTo), "dd-MM-yyyy") : <span>{t('filters.selectDate', { fallback: 'Select Date' })}</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-xl shadow-xl border border-gray-100 bg-white overflow-hidden" align="start">
                  <Calendar
                    mode="single"
                    selected={dateTo ? new Date(dateTo) : undefined}
                    onSelect={(date) => {
                      setDateTo(date ? format(date, 'yyyy-MM-dd') : '');
                      setIsDateToOpen(false);
                    }}
                    captionLayout="dropdown"
                    fromYear={2020}
                    toYear={new Date().getFullYear() + 5}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            {!clientId && (
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <label className="text-sm font-medium">{t('filters.search')}:</label>
                <div className="relative flex-1">
                  <Input
                    type="text"
                    placeholder={t('filters.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-10 pr-10"
                    style={{ borderRadius: '1rem' }}
                  />
                  {bookingsFetching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center">
                      <HugeiconsIcon icon={Loading03Icon} className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <CalendarProvider
                users={calendarUsersList}
                locations={locations}
                events={calendarEvents}
                entityType="booking"
                initialSettings={{}}
              >
                <AddBookingDialog onBookingCreated={() => queryClient.invalidateQueries({ queryKey: ['bookings'] })}>
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 h-10 px-4" style={{ borderRadius: '10rem' }}>
                    <HugeiconsIcon icon={PlusSignIcon} size={18} />
                    {/* {t('addBooking', { fallback: 'Add Booking' })} */}
                  </Button>
                </AddBookingDialog>
              </CalendarProvider>
            </div>
            {hasActiveFilters && (
              <Button
                variant="default"
                size="sm"
                onClick={handleResetFilters}
                className="text-primary-foreground hover:text-primary-foreground"
                style={{ borderRadius: '10rem' }}
              >
                <HugeiconsIcon icon={RotateLeft01Icon} className="mr-2 h-4 w-4" />
                {t('filters.reset')}
              </Button>
            )}
          </>
        )}
      </div>

      {/* Bookings Table */}
      <div>
        {viewMode === 'table' ? (
          <div className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center gap-3">
                  <HugeiconsIcon icon={Loading03Icon} className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              </div>
            ) : bookings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-muted p-3 mb-4">
                  <HugeiconsIcon icon={CalendarIcon} className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">{t('table.emptyTitle')}</h3>
                <p className="text-muted-foreground">
                  {t('table.emptyDescription')}
                </p>
              </div>
            ) : (
              <DataTable
                columns={createBookingColumns(
                  (key: string) => {
                    // Helper to try Bookings keys first, then fallback to common/status if needed
                    // This allows using generic keys like 'confirmed' directly or 'columns.client'
                    if (key.startsWith('columns.') || key.startsWith('cells.')) return t(key);
                    // For status keys
                    if (['pending', 'confirmed', 'cancelled', 'ongoing', 'completed', 'no_show'].includes(key)) return tStatus(key);
                    // Fallback or other keys
                    return t(key);
                  },
                  handleView,
                  handleCancel,
                  handleDelete,
                  !clientId && !staffId, // canDelete: true only if admin
                  !staffId, // showStaff: hide if we are in a staff-specific view
                  loadingBookingId
                )}
                data={bookings}
                emptyMessage={t('table.emptyMessage')}
                showColumnToggle={false}
                showPagination={false}
                pageSize={limit}
                manualPagination={true}
              />
            )}
          </div>
        ) : (
          <div className="bg-background">
            <CalendarProvider
              users={calendarUsersList}
              locations={locations}
              events={calendarEvents}
              initialSettings={{}} // You might want to persist settings
              entityType="booking"
            >
              <BookingCalendarContainer
                view={calendarView}
                userRole={userRole}
                onViewChange={setCalendarView}
                onEventClick={(event) => {
                  const booking = bookings.find(b => b.id === event.id);
                  if (booking) {
                    handleView(booking);
                  }
                }}
                onBookingCreated={() => {
                  queryClient.invalidateQueries({ queryKey: ['bookings'] });
                  queryClient.invalidateQueries({ queryKey: ['shifts'] });
                }}
              />
              {!staffId && <CalendarSettings />}
            </CalendarProvider>
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 0 && viewMode === 'table' && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t pt-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground whitespace-nowrap">{t('pagination.itemsPerPage')}:</label>
              <Select
                value={limit.toString()}
                onValueChange={(value) => {
                  setLimit(parseInt(value));
                  setPage(1); // Reset to first page when changing limit
                }}
              >
                <SelectTrigger className="w-[80px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="200">200</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {total > 0 ? (
                  <>{t('pagination.showing', { start: (page - 1) * limit + 1, end: Math.min(page * limit, total), total })}</>
                ) : (
                  <>{t('pagination.noBookings')}</>
                )}
              </span>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1 || loading}
                >
                  {t('pagination.previous')}
                </Button>

                <div className="flex items-center gap-1">
                  {/* Show page numbers */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPage(pageNum)}
                        disabled={loading}
                        className="w-10"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || loading}
                >
                  {t('pagination.next')}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Booking Detail Modal */}
      <BookingModal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setViewingBooking(null);
        }}
        booking={viewingBooking}
        onCancel={(booking) => {
          handleCancel(booking);
        }}
        onNoShow={(booking) => handleNoShow(booking)}
        onDelete={!clientId ? (booking) => {
          handleDelete(booking);
        } : undefined}
        onUpdate={(updatedBooking) => {
          setViewingBooking(updatedBooking);
          // Optimistically update the query cache to make it instant on the calendar
          queryClient.setQueriesData<BookingsResponse>({ queryKey: ['bookings'] }, (old) => {
            if (!old || !old.data) return old;
            return {
              ...old,
              data: old.data.map(b => b.id === updatedBooking.id ? updatedBooking : b)
            };
          });
          queryClient.invalidateQueries({ queryKey: ['bookings'] });
        }}
        onReschedule={(booking) => {
          setIsViewModalOpen(false);
          setReschedulingBooking(booking);
          setIsRescheduleModalOpen(true);
        }}
        userRole={userRole}
      />

      {/* Reschedule Modal */}
      <BookingRescheduleModal
        isOpen={isRescheduleModalOpen}
        onClose={() => {
          setIsRescheduleModalOpen(false);
          setReschedulingBooking(null);
        }}
        booking={reschedulingBooking}
        onReschedule={handleReschedule}
      />

      {/* Cancel/Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          if (!isActionLoading) {
            setDeleteDialogOpen(false);
            setBookingToCancel(null);
            setIsDeleteMode(false);
          }
        }}
        onConfirm={isDeleteMode ? confirmDelete : confirmCancel}
        title={isDeleteMode ? t('dialog.deleteTitle') : t('dialog.cancelTitle')}
        description={isDeleteMode
          ? t('dialog.deleteDescription')
          : t('dialog.cancelDescription')}
        itemName={bookingToCancel ? `Booking for ${bookingToCancel.users?.email || 'Unknown'}` : undefined}
        confirmButtonText={isDeleteMode ? t('dialog.deleteConfirm') : t('dialog.cancelConfirm')}
        confirmButtonVariant={isDeleteMode ? 'destructive' : 'default'}
        isLoading={isActionLoading}
      />
    </PageContainer>
  );
}

