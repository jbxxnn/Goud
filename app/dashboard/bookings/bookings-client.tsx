'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { HugeiconsIcon } from '@hugeicons/react';
import { Loading03Icon, CalendarIcon } from '@hugeicons/core-free-icons';
import { Booking, BookingsResponse } from '@/lib/types/booking';
import { DataTable } from '@/components/ui/data-table';
import { createBookingColumns } from '@/components/bookings-table-columns';
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';
import BookingModal from '@/components/booking-modal';
import BookingRescheduleModal from '@/components/booking-reschedule-modal';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface BookingsClientProps {
  initialBookings: Booking[];
  initialPagination: {
    page: number;
    totalPages: number;
  };
}

export default function BookingsClient({ 
  initialBookings, 
  initialPagination 
}: BookingsClientProps) {
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(initialPagination.page);
  const [limit, setLimit] = useState<number>(10);
  const [totalPages, setTotalPages] = useState(initialPagination.totalPages);
  const [total, setTotal] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
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
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch bookings';
      toast.error('Failed to load bookings', {
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter, dateFrom, dateTo, searchQuery]);

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
      toast.success('Booking cancelled', {
        description: 'The booking has been cancelled successfully.',
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel booking';
      toast.error('Failed to cancel booking', {
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
      toast.success('Booking deleted', {
        description: 'The booking has been permanently deleted.',
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete booking';
      toast.error('Failed to delete booking', {
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

  // Load data when filters change
  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Bookings</h1>
          <p className="text-muted-foreground">
            Manage all appointments and bookings
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Status:</label>
          <select
            title="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border rounded-md px-3 py-1.5 text-sm"
            style={{ borderRadius: '0.2rem' }}
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">From:</label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">To:</label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <label className="text-sm font-medium">Search:</label>
          <Input
            type="text"
            placeholder="Client name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
        </div>
      </div>

      {/* Bookings Table */}
      <div>
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
              <h3 className="text-lg font-medium mb-2">No bookings found</h3>
              <p className="text-muted-foreground">
                There are no bookings matching your criteria
              </p>
            </div>
          ) : (
            <DataTable
              columns={createBookingColumns(
                handleView,
                handleCancel,
                handleDelete,
                (booking) => {
                  setReschedulingBooking(booking);
                  setIsRescheduleModalOpen(true);
                }
              )}
              data={bookings}
            />
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t pt-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground whitespace-nowrap">Items per page:</label>
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
                  <>Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} bookings</>
                ) : (
                  <>No bookings found</>
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
                  Previous
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
                  Next
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
        onDelete={(booking) => {
          handleDelete(booking);
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
        title={isDeleteMode ? 'Delete Booking' : 'Cancel Booking'}
        description={isDeleteMode 
          ? 'Are you sure you want to permanently delete this booking? This action cannot be undone.'
          : 'Are you sure you want to cancel this appointment? The booking will be marked as cancelled.'}
        itemName={bookingToCancel ? `Booking for ${bookingToCancel.users?.email || 'Unknown'}` : undefined}
        confirmButtonText={isDeleteMode ? 'Delete' : 'Cancel Appointment'}
        confirmButtonVariant={isDeleteMode ? 'destructive' : 'default'}
      />
    </div>
  );
}

