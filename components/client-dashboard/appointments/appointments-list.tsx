'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { format, parseISO, isPast } from 'date-fns';
import { Button } from '@/components/ui/button';
import { HugeiconsIcon } from '@hugeicons/react';
import { Loading03Icon, CalendarAdd01Icon } from '@hugeicons/core-free-icons';
import { toast } from 'sonner';
import Link from 'next/link';
import { DashboardHeader } from '../header';
import { Separator } from '@/components/ui/separator';

interface AppointmentsListProps {
    clientId: string;
}

export function AppointmentsList({ clientId }: AppointmentsListProps) {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [isResultsOpen, setIsResultsOpen] = useState(false);
    const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
    const [bookingToReschedule, setBookingToReschedule] = useState<Booking | null>(null);

    const fetchBookings = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                clientId: clientId,
                limit: '50',
                page: '1',
            });

            const response = await fetch(`/api/bookings?${params}`);
            const result: BookingsResponse = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to fetch bookings');
            }

            setBookings(result.data || []);
        } catch (err) {
            console.error(err);
            toast.error('Failed to load appointments');
        } finally {
            setLoading(false);
        }
    }, [clientId]);

    useEffect(() => {
        fetchBookings();
    }, [fetchBookings]);

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
            throw new Error(data.error || 'Failed to reschedule booking');
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
                throw new Error('Failed to cancel booking');
            }

            toast.success('Appointment cancelled successfully');
            fetchBookings(); // Refresh list
        } catch (err) {
            toast.error('Failed to cancel appointment');
            throw err; // Re-throw to let child component know it failed
        }
    };

    const handleViewResults = (booking: Booking) => {
        setSelectedBooking(booking);
        setIsResultsOpen(true);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <HugeiconsIcon icon={Loading03Icon} className="animate-spin w-8 h-8 text-primary" />
            </div>
        );
    }

    // Sort bookings: Upcoming first, then past
    const sortedBookings = [...bookings].sort((a, b) => {
        return new Date(b.start_time).getTime() - new Date(a.start_time).getTime();
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed':
                return 'bg-blue-100 text-blue-800 hover:bg-blue-100/80 border-blue-200';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100/80 border-yellow-200';
            case 'cancelled':
                return 'bg-red-100 text-red-800 hover:bg-red-100/80 border-red-200';
            case 'completed':
                return 'bg-green-100 text-green-800 hover:bg-green-100/80 border-green-200';
            default:
                return 'bg-gray-100 text-gray-800 hover:bg-gray-100/80';
        }
    };

    const getStatusLabel = (status: string, endTime: string) => {
        if (isPast(new Date(endTime)) && status === 'confirmed') return 'Completed';
        return status.charAt(0).toUpperCase() + status.slice(1);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <DashboardHeader
                    heading="My Appointments"
                    text="Manage your upcoming echoes and view your history."
                />
                <Button asChild>
                    <Link href="/dashboard/book">
                        <HugeiconsIcon icon={CalendarAdd01Icon} className="mr-2 h-4 w-4" />
                        Book New Echo
                    </Link>
                </Button>
            </div>

            <Separator />

            {sortedBookings.length === 0 ? (
                <div className="text-center py-12 bg-muted/10 rounded-lg border border-dashed">
                    <h3 className="text-lg font-medium">No appointments found</h3>
                    <p className="text-muted-foreground mt-1 mb-6">You haven't booked any echoes yet.</p>
                    <Button asChild>
                        <Link href="/dashboard/book">Book your first echo</Link>
                    </Button>
                </div>
            ) : (
                <div className="border rounded-lg overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date & Time</TableHead>
                                <TableHead>Service</TableHead>
                                <TableHead>Staff</TableHead>
                                <TableHead>Location</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
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
                                    <TableCell>{booking.services?.name || 'Appointment'}</TableCell>
                                    <TableCell>{booking.staff?.first_name || 'Staff'}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span>{booking.locations?.name || 'Clinic'}</span>
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
