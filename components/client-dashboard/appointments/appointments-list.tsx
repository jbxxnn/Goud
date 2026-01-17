'use client';

import { useState, useEffect, useCallback } from 'react';
import { Booking, BookingsResponse } from '@/lib/types/booking';
import { AppointmentCard } from './appointment-card';
import { ResultsModal } from './results-modal';
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
        // TODO: Implement reschedule logic (modal)
        toast.info('Rescheduling feature coming soon');
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sortedBookings.map((booking) => (
                        <AppointmentCard
                            key={booking.id}
                            booking={booking}
                            onReschedule={handleReschedule}
                            onCancel={handleCancel}
                            onViewResults={handleViewResults}
                        />
                    ))}
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
        </div>
    );
}
