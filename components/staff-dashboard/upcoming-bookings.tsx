'use client';

import { useState, useEffect, useCallback } from 'react';
import { Booking, BookingsResponse } from '@/lib/types/booking';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HugeiconsIcon } from '@hugeicons/react';
import {
    Calendar02Icon,
    Clock01Icon,
    Location01Icon,
    ArrowRight01Icon,
    Loading03Icon
} from '@hugeicons/core-free-icons';
import { format, parseISO, isSameDay, addDays } from 'date-fns';
import { toast } from 'sonner';

import { useRouter } from 'next/navigation';

interface UpcomingBookingsProps {
    staffId: string;
}

export function UpcomingBookings({ staffId }: UpcomingBookingsProps) {
    const router = useRouter();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchUpcomingBookings = useCallback(async () => {
        try {
            setLoading(true);
            const today = new Date();
            const tomorrow = addDays(today, 1);
            const startOfTomorrow = new Date(tomorrow.setHours(0, 0, 0, 0)).toISOString();
            // Fetch next 30 days
            const thirtyDaysLater = addDays(today, 30);
            const endOfPeriod = new Date(thirtyDaysLater.setHours(23, 59, 59, 999)).toISOString();

            const params = new URLSearchParams({
                dateFrom: startOfTomorrow,
                dateTo: endOfPeriod,
                staffId: staffId,
                limit: '100',
                status: 'confirmed,ongoing' // Only active future types
            });

            const response = await fetch(`/api/bookings?${params}`);
            const result: BookingsResponse = await response.json();

            if (!result.success) {
                console.error('Fetch error details:', result);
                throw new Error(result.error || 'Failed to fetch upcoming schedule');
            }

            // Sort by time
            const sorted = (result.data || []).sort((a, b) =>
                new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
            );

            setBookings(sorted);
        } catch (err) {
            console.error(err);
            toast.error('Failed to load upcoming schedule');
        } finally {
            setLoading(false);
        }
    }, [staffId]);

    useEffect(() => {
        fetchUpcomingBookings();
    }, [fetchUpcomingBookings]);

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
                <p>No upcoming appointments found for the next 30 days.</p>
            </div>
        );
    }

    // Group by Date
    const groupedBookings: { [key: string]: Booking[] } = {};
    bookings.forEach(booking => {
        const dateKey = format(parseISO(booking.start_time), 'yyyy-MM-dd');
        if (!groupedBookings[dateKey]) {
            groupedBookings[dateKey] = [];
        }
        groupedBookings[dateKey].push(booking);
    });

    return (
        <div className="space-y-6">
            {Object.keys(groupedBookings).map(dateKey => {
                const dayBookings = groupedBookings[dateKey];
                const dateObj = parseISO(dayBookings[0].start_time);

                return (
                    <div key={dateKey} className="space-y-3">
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                            <HugeiconsIcon icon={Calendar02Icon} size={16} />
                            {format(dateObj, 'EEEE, MMMM d')}
                        </h3>

                        <div className="space-y-3">
                            {dayBookings.map(booking => (
                                <Card key={booking.id} className="hover:shadow-sm transition-shadow">
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="p-2 bg-primary/5 rounded-lg text-primary font-semibold text-sm w-[60px] text-center">
                                                {format(parseISO(booking.start_time), 'HH:mm')}
                                            </div>
                                            <div>
                                                <div className="font-medium">
                                                    {booking.users?.first_name} {booking.users?.last_name}
                                                </div>
                                                <div className="text-sm text-muted-foreground flex items-center gap-3">
                                                    <span>{booking.services?.name}</span>
                                                    <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                                                    <span className="flex items-center gap-1">
                                                        <HugeiconsIcon icon={Location01Icon} size={12} />
                                                        {booking.locations?.name || 'Main Clinic'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <Badge variant="outline">
                                                {booking.status}
                                            </Badge>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="hidden sm:flex"
                                                onClick={() => router.push(`/dashboard/appointments/${booking.id}`)}
                                            >
                                                View
                                                <HugeiconsIcon icon={ArrowRight01Icon} className="ml-2 h-4 w-4" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
