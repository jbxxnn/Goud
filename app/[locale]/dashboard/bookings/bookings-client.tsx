'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { HugeiconsIcon } from '@hugeicons/react';
import { Loading03Icon, CalendarIcon, ViewIcon, LeftToRightListDashIcon } from '@hugeicons/core-free-icons';
import { Booking, BookingsResponse } from '@/lib/types/booking';
import { bookingToCalendarEvent } from '@/lib/utils/booking-mapper';
import { CalendarProvider } from '@/calendar/contexts/calendar-context';
import { BookingCalendarContainer } from '@/components/booking-calendar-container';
import { CalendarSettings } from '@/components/calendar-settings';
import { IEvent } from '@/calendar/interfaces';
import { TCalendarView } from '@/calendar/types';
import { DataTable } from '@/components/ui/data-table';
import { createBookingColumns } from '@/components/bookings-table-columns';
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';
import BookingModal from '@/components/booking-modal';
import BookingRescheduleModal from '@/components/booking-reschedule-modal';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

interface BookingsClientProps {
  initialBookings: Booking[];
  initialPagination: {
    page: number;
    totalPages: number;
  };
  clientId?: string; // Optional: if provided, filter bookings for this client only
}

export default function BookingsClient({
  initialBookings,
  initialPagination,
  clientId
}: BookingsClientProps) {
  const t = useTranslations('Bookings');
  const tStatus = useTranslations('BookingStatus');
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(initialPagination.page);
  const [limit, setLimit] = useState<number>(100);
  const [totalPages, setTotalPages] = useState(initialPagination.totalPages);
  const [total, setTotal] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('calendar');
  const [calendarView, setCalendarView] = useState<TCalendarView>('month');
  const [calendarEvents, setCalendarEvents] = useState<IEvent[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [viewingBooking, setViewingBooking] = useState<Booking | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [reschedulingBooking, setReschedulingBooking] = useState<Booking | null>(null);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);

  // Fetch bookings
  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      if (dateFrom) {
        params.append('dateFrom', dateFrom);
      }

      if (dateTo) {
        params.append('dateTo', dateTo);
      }

      if (searchQuery) {
        params.append('search', searchQuery);
      }

      if (clientId) {
        params.append('clientId', clientId);
      }

      const response = await fetch(`/api/bookings?${params}`);
      const data: BookingsResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch bookings');
      }

      setBookings(data.data || []);
      if (data.pagination) {
        setTotalPages(data.pagination.total_pages);
        setTotal(data.pagination.total);
      }

      // Update calendar events whenever bookings change
      if (data.data) {
        const events = data.data.map(booking => bookingToCalendarEvent(booking));
        setCalendarEvents(events);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('toasts.loadError');
      toast.error(t('toasts.loadError'), {
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter, dateFrom, dateTo, searchQuery, clientId, viewMode]); // Added viewMode to refresh when switching views logic if needed, though fetch is manual mostly or effect based

  // Cancel booking
  const handleCancel = async (booking: Booking) => {
    setBookingToCancel(booking);
    setIsDeleteMode(false);
    setDeleteDialogOpen(true);
  };

  const confirmCancel = async () => {
    if (!bookingToCancel) return;

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
      await fetchBookings();
      setDeleteDialogOpen(false);
      setBookingToCancel(null);
      await fetchBookings();
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

    try {
      const response = await fetch(`/api/bookings/${bookingToCancel.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete booking');
      }

      // Refresh bookings
      await fetchBookings();
      setDeleteDialogOpen(false);
      setBookingToCancel(null);
      await fetchBookings();
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
    }
  };

  // View booking
  const handleView = (booking: Booking) => {
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

      await fetchBookings();
    } catch (err) {
      throw err;
    }
  };

  // Reset to page 1 when limit changes
  useEffect(() => {
    setPage(1);
  }, [limit]);

  useEffect(() => {
    // If we are in calendar mode, we might want to fetch more items or a specific range
    // For now, let's just stick to standard fetch. 
    // Ideally for calendar we should fetch by date range, but we are reusing the list API for now.
    // If the list is paginated, the calendar will only show the current page.
    // TODO: Ideally update fetchBookings to handle 'calendar' mode by fetching a larger range or all for the month.
    if (viewMode === 'calendar') {
      setLimit(100); // Temporary hack to get more items for calendar
    } else {
      setLimit(10);
    }
  }, [viewMode]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Extract users for the calendar filter (staff)
  const calendarUsers = bookings
    .map(b => b.staff)
    .filter((s): s is NonNullable<typeof s> => !!s)
    .map(s => ({
      id: s.first_name, // Using first name as ID temporarily because booking.staff object doesn't have ID, only names? Wait, booking.staff_id exists but the expanded object might not have it.
      // Let's check booking type. Booking has staff_id. The expanded object `staff` has `first_name` and `last_name`.
      // We need the ID for the user select to work with the event user ID.
      // The event user ID is set to `booking.staff_id` in the mapper.
      // So we need `booking.staff_id` here.
      // But we are iterating over `bookings` and `b.staff` object doesn't have ID.
      // We can use `b.staff_id` paired with `b.staff` details.
    }))
  // We need unique users.

  const uniqueStaffMap = new Map();
  bookings.forEach(b => {
    if (b.staff_id && b.staff) {
      uniqueStaffMap.set(b.staff_id, {
        id: b.staff_id,
        name: `${b.staff.first_name} ${b.staff.last_name}`,
        picturePath: null
      });
    }
  });

  const calendarUsersList = Array.from(uniqueStaffMap.values());

  return (
    <div className="space-y-6 p-6 bg-card" style={{ borderRadius: '0.5rem' }}>
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
                className="border rounded-md px-3 py-1.5 text-sm h-11"
                style={{ borderRadius: '0.2rem' }}
              >
                <option value="all">{t('filters.all')}</option>
                <option value="pending">{t('filters.pending')}</option>
                <option value="confirmed">{t('filters.confirmed')}</option>
                <option value="cancelled">{t('filters.cancelled')}</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">{t('filters.from')}:</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">{t('filters.to')}:</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-40"
              />
            </div>
            {!clientId && (
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <label className="text-sm font-medium">{t('filters.search')}:</label>
                <Input
                  type="text"
                  placeholder={t('filters.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
              </div>
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
                    if (['pending', 'confirmed', 'cancelled', 'ongoing', 'completed'].includes(key)) return tStatus(key);
                    // Fallback or other keys
                    return t(key);
                  },
                  handleView,
                  handleCancel,
                  handleDelete,
                  !clientId, // Only allow delete if not a client (i.e., admin)
                  // (booking) => {
                  //   setReschedulingBooking(booking);
                  //   setIsRescheduleModalOpen(true);
                  // }
                )}
                data={bookings}
                emptyMessage={t('table.emptyMessage')}
                showColumnToggle={false}
              />
            )}
          </div>
        ) : (
          <div className="bg-background">
            <CalendarProvider
              users={calendarUsersList}
              events={calendarEvents}
              initialSettings={{}} // You might want to persist settings
              entityType="booking"
            >
              <BookingCalendarContainer
                view={calendarView}
                onViewChange={setCalendarView}
              />
              <CalendarSettings />
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
        onDelete={!clientId ? (booking) => {
          handleDelete(booking);
        } : undefined}
        onUpdate={(updatedBooking) => {
          setViewingBooking(updatedBooking);
          fetchBookings();
        }}
        onReschedule={(booking) => {
          setIsViewModalOpen(false);
          setReschedulingBooking(booking);
          setIsRescheduleModalOpen(true);
        }}
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
          setDeleteDialogOpen(false);
          setBookingToCancel(null);
          setIsDeleteMode(false);
          // Keep the booking modal open if they cancel the confirmation
        }}
        onConfirm={isDeleteMode ? confirmDelete : confirmCancel}
        title={isDeleteMode ? t('dialog.deleteTitle') : t('dialog.cancelTitle')}
        description={isDeleteMode
          ? t('dialog.deleteDescription')
          : t('dialog.cancelDescription')}
        itemName={bookingToCancel ? `Booking for ${bookingToCancel.users?.email || 'Unknown'}` : undefined}
        confirmButtonText={isDeleteMode ? t('dialog.deleteConfirm') : t('dialog.cancelConfirm')}
        confirmButtonVariant={isDeleteMode ? 'destructive' : 'default'}
      />
    </div>
  );
}

