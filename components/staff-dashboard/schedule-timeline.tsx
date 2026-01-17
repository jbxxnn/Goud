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
    UserIcon,
    ArrowRight01Icon,
    Loading03Icon
} from '@hugeicons/core-free-icons';
import { format, isToday, parseISO, isPast } from 'date-fns';
import { toast } from 'sonner';

import { ScanCompletionModal } from './scan-completion-modal';

import { useRouter } from 'next/navigation';

interface ScheduleTimelineProps {
    staffId: string;
}

export function ScheduleTimeline({ staffId }: ScheduleTimelineProps) {
    const router = useRouter();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Update current time every minute to check for "Late" status visually
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const fetchTodayBookings = useCallback(async () => {
        try {
            setLoading(true);
            const today = new Date();
            const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
            const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

            const params = new URLSearchParams({
                dateFrom: startOfDay,
                dateTo: endOfDay,
                staffId: staffId,
                limit: '100', // Ensure we get all for the day
                status: 'confirmed,ongoing,completed,cancelled' // We want to see everything
            });

            const response = await fetch(`/api/bookings?${params}`);
            const result: BookingsResponse = await response.json();

            if (!result.success) {
                console.error('Fetch error details:', result);
                throw new Error(result.error || 'Failed to fetch schedule');
            }

            // Sort by time
            const sorted = (result.data || []).sort((a, b) =>
                new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
            );

            setBookings(sorted);
        } catch (err) {
            console.error(err);
            toast.error('Failed to load schedule');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTodayBookings();
    }, [fetchTodayBookings]);

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
                <p>No appointments scheduled for today.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {bookings.map((booking) => {
                const start = parseISO(booking.start_time);
                const end = parseISO(booking.end_time);
                const isLate = booking.status === 'confirmed' && isPast(start) && !isToday(start); // Simple check, or check if start < now
                // Actually "Late" means: Current time > start time AND status is 'confirmed' (not checked_in or completed)
                const isLateAlert = booking.status === 'confirmed' && currentTime > start;

                return (
                    <Card key={booking.id} className={`transition-all hover:shadow-md ${isLateAlert ? 'border-l-4 border-l-rose-500' : ''}`}>
                        <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">

                            {/* Time & Status */}
                            <div className="flex flex-col gap-1 min-w-[100px]">
                                <div className="flex items-center gap-2 font-semibold text-lg">
                                    <HugeiconsIcon icon={Clock01Icon} size={18} className="text-muted-foreground" />
                                    {format(start, 'HH:mm')}
                                </div>
                                <div className="text-xs text-muted-foreground pl-7">
                                    {format(end, 'HH:mm')}
                                </div>
                                <div className="mt-1">
                                    <Badge variant={
                                        booking.status === 'completed' ? 'default' :
                                            booking.status === 'cancelled' ? 'destructive' :
                                                booking.status === 'ongoing' ? 'secondary' :
                                                    'outline'
                                    } className={
                                        booking.status === 'completed' ? 'bg-emerald-600 hover:bg-emerald-700' : ''
                                    }>
                                        {booking.status === 'confirmed' && isLateAlert ? 'LATE' : booking.status}
                                    </Badge>
                                </div>
                            </div>

                            {/* Client & Service */}
                            <div className="flex-1 space-y-1">
                                <h3 className="font-medium text-lg flex items-center gap-2">
                                    {booking.users?.first_name} {booking.users?.last_name}
                                </h3>
                                <div className="flex flex-col lg:flex-row gap-2 lg:gap-6 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                        <div className="w-2 h-2 rounded-full bg-primary/70" />
                                        {booking.services?.name}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <HugeiconsIcon icon={Location01Icon} size={14} />
                                        {booking.locations?.name || 'Main Clinic'}
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                                {booking.status !== 'cancelled' && (
                                    <Button
                                        className={booking.status === 'completed' ? 'bg-secondary text-secondary-foreground' : ''}
                                        onClick={() => router.push(`/dashboard/appointments/${booking.id}`)}
                                    >
                                        {booking.status === 'completed' ? 'View Details' : 'Start Scan'}
                                        <HugeiconsIcon icon={ArrowRight01Icon} className="ml-2 h-4 w-4" />
                                    </Button>
                                )}
                            </div>

                        </CardContent>
                    </Card>
                );
            })}

            <ScanCompletionModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setSelectedBooking(null);
                }}
                booking={selectedBooking}
                onComplete={fetchTodayBookings}
            />
        </div>
    );
}
