'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Booking, BookingsResponse } from '@/lib/types/booking';
import { ActionButtons } from './action-buttons';
import { ResultsModal } from './results-modal';
import BookingRescheduleModal from '@/components/booking-reschedule-modal';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { format, parseISO, isPast, differenceInMinutes } from 'date-fns';
import { Button } from '@/components/ui/button';
import { HugeiconsIcon } from '@hugeicons/react';
import { Loading03Icon, CalendarAdd01Icon, Search01Icon } from '@hugeicons/core-free-icons';
import { toast } from 'sonner';
import Link from 'next/link';
import { DashboardHeader } from '../header';
import { Separator } from '@/components/ui/separator';

interface AppointmentsListProps {
    clientId: string;
    filterBy?: 'created_by' | 'client_id'; // Default: 'created_by'
}

export function AppointmentsList({ clientId, filterBy = 'created_by' }: AppointmentsListProps) {
    const t = useTranslations('Appointments');
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [isFetching, setIsFetching] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [isResultsOpen, setIsResultsOpen] = useState(false);
    const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
    const [bookingToReschedule, setBookingToReschedule] = useState<Booking | null>(null);

    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [dateFrom, setDateFrom] = useState<string>('');
    const [dateTo, setDateTo] = useState<string>('');

    const fetchBookings = useCallback(async (isInitial = false) => {
        try {
            if (isInitial) {
                setIsInitialLoading(true);
            } else {
                setIsFetching(true);
            }

            const queryParams: Record<string, string> = {
                limit: '50',
                page: '1',
            };

            // If we filter by created_by (default for clients), use 'clientId' param
            // If we filter by client_id (for midwives), use 'patientId' param
            if (filterBy === 'client_id') {
                queryParams.patientId = clientId;
            } else {
                queryParams.clientId = clientId;
            }

            if (statusFilter !== 'all') queryParams.status = statusFilter;
            if (searchQuery) queryParams.search = searchQuery;
            if (dateFrom) queryParams.dateFrom = dateFrom;
            if (dateTo) queryParams.dateTo = dateTo;

            const params = new URLSearchParams(queryParams);

            const response = await fetch(`/api/bookings?${params}`);
            const result: BookingsResponse = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to fetch bookings');
            }

            setBookings(result.data || []);
        } catch (err) {
            console.error(err);
            toast.error(t('toasts.loadError'));
        } finally {
            setIsInitialLoading(false);
            setIsFetching(false);
        }
    }, [clientId, filterBy, statusFilter, searchQuery, dateFrom, dateTo, t]);

    useEffect(() => {
        // Initial fetch
        fetchBookings(true);
    }, []);

    useEffect(() => {
        // Debounce search and filter updates
        // Skip initial mount as the separate useEffect handles it
        // We can check if isInitialLoading is already false to know it's an update
        if (!isInitialLoading) {
            const timeoutId = setTimeout(() => {
                fetchBookings(false);
            }, 300);
            return () => clearTimeout(timeoutId);
        }
    }, [fetchBookings, isInitialLoading]);

    const handleReschedule = (booking: Booking) => {
        setBookingToReschedule(booking);
        setIsRescheduleModalOpen(true);
    };

    const handleRescheduleConfirm = async (
        bookingId: string,
        newStartTime: string,
        newEndTime: string,
        locationId: string,
        staffId: string,
        shiftId: string
    ) => {
        const response = await fetch(`/api/bookings/${bookingId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                start_time: newStartTime,
                end_time: newEndTime,
                location_id: locationId,
                staff_id: staffId,
                shift_id: shiftId,
                status: 'confirmed', // Assuming instant confirm for reschedule, or revert to 'pending' if approval needed
            }),
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || t('toasts.rescheduleError'));
        }

        fetchBookings(); // Refresh list
    };

    const handleCancel = async (booking: Booking) => {
        try {
            const response = await fetch(`/api/bookings/${booking.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: 'cancelled' }),
            });

            if (!response.ok) {
                throw new Error(t('toasts.cancelFailed'));
            }

            toast.success(t('toasts.cancelSuccess'));
            fetchBookings(); // Refresh list
        } catch (err) {
            toast.error(t('toasts.cancelError'));
            throw err; // Re-throw to let child component know it failed
        }
    };

    const handleViewResults = (booking: Booking) => {
        setSelectedBooking(booking);
        setIsResultsOpen(true);
    };

    // Sort bookings: Upcoming first, then past
    const sortedBookings = [...bookings].sort((a, b) => {
        return new Date(b.start_time).getTime() - new Date(a.start_time).getTime();
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed':
                return 'bg-blue-600 text-white hover:bg-blue-600/80 border-blue-200';
            case 'pending':
                return 'bg-yellow-600 text-white hover:bg-yellow-600/80 border-yellow-200';
            case 'cancelled':
                return 'bg-red-600 text-white hover:bg-red-600/80 border-red-200';
            case 'completed':
                return 'bg-green-600 text-white hover:bg-green-600/80 border-green-200';
            default:
                return 'bg-gray-600 text-white hover:bg-gray-600/80';
        }
    };

    const getStatusLabel = (status: string, endTime: string) => {
        if (isPast(new Date(endTime)) && status === 'confirmed') return t('status.completed');

        const statusKey = status.toLowerCase() as keyof typeof mappedStatuses;
        // Map API statuses to translation keys
        const mappedStatuses = {
            pending: t('filters.pending'),
            confirmed: t('filters.confirmed'),
            cancelled: t('filters.cancelled'),
            completed: t('filters.completed')
        };
        return mappedStatuses[statusKey] || status.charAt(0).toUpperCase() + status.slice(1);
    };

    if (isInitialLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <HugeiconsIcon icon={Loading03Icon} className="animate-spin w-8 h-8 text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <DashboardHeader
                    heading={t('title')}
                    text={t('subtitle')}
                />
                <Button asChild>
                    <Link href="/dashboard/book">
                        <HugeiconsIcon icon={CalendarAdd01Icon} className="mr-2 h-4 w-4" />
                        {t('bookNew')}
                    </Link>
                </Button>
            </div>

            <Separator />

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4 bg-muted/30 p-4 rounded-lg border">
                {filterBy === 'client_id' && (
                    <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                        <div className="relative w-full">
                            <HugeiconsIcon icon={Search01Icon} className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder={t('searchPlaceholder')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </div>
                    </div>
                )}

                <div className="flex items-center gap-2">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                        <option value="all">{t('filters.allStatuses')}</option>
                        <option value="pending">{t('filters.pending')}</option>
                        <option value="confirmed">{t('filters.confirmed')}</option>
                        <option value="cancelled">{t('filters.cancelled')}</option>
                        <option value="completed">{t('filters.completed')}</option>
                    </select>
                </div>

                <div className="flex items-center gap-2">
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        placeholder={t('filters.from')}
                    />
                    <span className="text-muted-foreground">-</span>
                    <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        placeholder={t('filters.to')}
                    />
                </div>

                {(statusFilter !== 'all' || searchQuery || dateFrom || dateTo) && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            setStatusFilter('all');
                            setSearchQuery('');
                            setDateFrom('');
                            setDateTo('');
                        }}
                        className="h-9 px-2 lg:px-3"
                    >
                        {t('filters.reset')}
                    </Button>
                )}
            </div>

            {sortedBookings.length === 0 ? (
                <div className="text-center py-12 bg-muted/10 rounded-lg border border-dashed">
                    <h3 className="text-lg font-medium">{t('empty.title')}</h3>
                    <p className="text-muted-foreground mt-1 mb-6">{t('empty.description')}</p>
                    <Button asChild>
                        <Link href="/dashboard/book">{t('empty.cta')}</Link>
                    </Button>
                </div>
            ) : (
                <div className={`border rounded-lg overflow-hidden transition-opacity duration-200 ${isFetching ? 'opacity-50' : 'opacity-100'}`}>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('table.dateTime')}</TableHead>
                                {filterBy === 'client_id' && <TableHead>{t('table.client')}</TableHead>}
                                <TableHead>{t('table.service')}</TableHead>
                                <TableHead>{t('table.staff')}</TableHead>
                                <TableHead>{t('table.location')}</TableHead>
                                <TableHead>{t('table.status')}</TableHead>
                                <TableHead className="text-right">{t('table.actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedBookings.map((booking) => (
                                <TableRow key={booking.id}>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium">
                                                {format(parseISO(booking.start_time), 'MMM d, yyyy')}
                                            </span>
                                            <span className="text-sm text-muted-foreground">
                                                {format(parseISO(booking.start_time), 'HH:mm')} - {format(parseISO(booking.end_time), 'HH:mm')}
                                            </span>
                                        </div>
                                    </TableCell>
                                    {filterBy === 'client_id' && (
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium">
                                                    {booking.users ?
                                                        [booking.users.first_name, booking.users.last_name].filter(Boolean).join(' ') || t('table.unknown')
                                                        : t('table.unknown')}
                                                </span>
                                                {booking.users?.email && (
                                                    <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                                                        {booking.users.email}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                    )}
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <span>{booking.services?.name || t('table.unknown')}</span>
                                            {booking.is_twin && (
                                                <Badge
                                                    variant="secondary"
                                                    className="bg-purple-100 text-purple-700 hover:bg-purple-100/80 border-purple-200 text-[10px] px-1.5 py-0 h-5"
                                                >
                                                    Tweeling
                                                </Badge>
                                            )}
                                            {booking.isRepeat && (
                                                <Badge
                                                    variant="secondary"
                                                    className="bg-primary text-primary-foreground border-primary hover:bg-primary/20 h-4 text-xs px-1 uppercase font-bold tracking-wider"
                                                >
                                                    {differenceInMinutes(new Date(booking.end_time), new Date(booking.start_time))}
                                                </Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>{booking.staff?.first_name || t('table.staff')}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span>{booking.locations?.name || t('table.location')}</span>
                                            {/* <span className="text-xs text-muted-foreground truncate max-w-[150px]">{booking.locations?.address}</span> */}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant="outline"
                                            className={`capitalize ${getStatusColor(booking.status)}`}
                                        >
                                            {getStatusLabel(booking.status, booking.end_time)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <ActionButtons
                                            booking={booking}
                                            onReschedule={() => handleReschedule(booking)}
                                            onCancel={handleCancel}
                                            onViewResults={handleViewResults}
                                            isPast={isPast(new Date(booking.end_time))}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            <ResultsModal
                isOpen={isResultsOpen}
                onClose={() => {
                    setIsResultsOpen(false);
                    setSelectedBooking(null);
                }}
                booking={selectedBooking}
            />

            <BookingRescheduleModal
                isOpen={isRescheduleModalOpen}
                onClose={() => {
                    setIsRescheduleModalOpen(false);
                    setBookingToReschedule(null);
                }}
                booking={bookingToReschedule}
                onReschedule={handleRescheduleConfirm}
            />
        </div>
    );
}
