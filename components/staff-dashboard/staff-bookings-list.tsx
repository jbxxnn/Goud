'use client';

import { useState, useEffect, useCallback } from 'react';
import { Booking, BookingsResponse } from '@/lib/types/booking';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HugeiconsIcon } from '@hugeicons/react';
import {
    Calendar02Icon,
    Location01Icon,
    ArrowRight01Icon,
    Loading03Icon
} from '@hugeicons/core-free-icons';
import { AppointmentCard } from './appointment-card';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface StaffBookingsListProps {
    staffId: string;
    status: string; // 'completed' | 'cancelled'
    emptyMessage: string;
    limit?: number;
}

export function StaffBookingsList({ staffId, status, emptyMessage, limit = 50 }: StaffBookingsListProps) {
    const router = useRouter();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchBookings = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                staffId: staffId,
                status: status,
                limit: limit.toString(),
            });

            // For completed/cancelled, we usually want descending order (newest first)
            // The API default sort might need to be checked, or we client-side sort
            const response = await fetch(`/api/bookings?${params}`);
            const result: BookingsResponse = await response.json();

            if (!result.success) {
                console.error('Fetch error details:', result);
                throw new Error(result.error || 'Failed to fetch bookings');
            }

            // Sort descending by time
            const sorted = (result.data || []).sort((a, b) =>
                new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
            );

            setBookings(sorted);
        } catch (err) {
            console.error(err);
            toast.error('Failed to load bookings');
        } finally {
            setLoading(false);
        }
    }, [staffId, status, limit]);

    useEffect(() => {
        fetchBookings();
    }, [fetchBookings]);

    if (loading) {
        return (
            <div className="flex justify-center p-12">
                <HugeiconsIcon icon={Loading03Icon} className="animate-spin h-8 w-8 text-primary" />
            </div>
        );
    }

    if (bookings.length === 0) {
        return (
            <div className="text-center p-12 text-muted-foreground border border-dashed rounded-lg bg-muted/10">
                <p>{emptyMessage}</p>
            </div>
        );
    }

    // Group by Month
    const groupedBookings: { [key: string]: Booking[] } = {};
    bookings.forEach(booking => {
        const dateKey = format(parseISO(booking.start_time), 'yyyy-MM');
        if (!groupedBookings[dateKey]) {
            groupedBookings[dateKey] = [];
        }
        groupedBookings[dateKey].push(booking);
    });

    return (
        <div className="space-y-8">
            {Object.keys(groupedBookings).map(dateKey => {
                const monthBookings = groupedBookings[dateKey];
                const dateObj = parseISO(monthBookings[0].start_time);

                return (
                    <div key={dateKey} className="space-y-4">
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider sticky top-0 bg-background/95 backdrop-blur py-2 z-10">
                            <HugeiconsIcon icon={Calendar02Icon} size={16} />
                            {format(dateObj, 'MMMM yyyy')}
                        </h3>

                        <div className="space-y-3">
                            {monthBookings.map(booking => (
                                <AppointmentCard key={booking.id} booking={booking} />
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
