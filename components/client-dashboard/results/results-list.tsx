'use client';

import { useState, useEffect, useCallback } from 'react';
import { Booking, BookingsResponse } from '@/lib/types/booking';
import { ResultCard } from './result-card';
import { ResultsModal } from '../appointments/results-modal';
import { HugeiconsIcon } from '@hugeicons/react';
import { Loading03Icon, Image02Icon } from '@hugeicons/core-free-icons';
import { toast } from 'sonner';

interface ResultsListProps {
    clientId: string;
}

export function ResultsList({ clientId }: ResultsListProps) {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [isResultsOpen, setIsResultsOpen] = useState(false);

    const fetchCompletedBookings = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                clientId: clientId,
                limit: '100', // Fetch more for history
                // We will filter client side or ask API for status if supported. 
                // Assuming API returns all, we filter here.
            });

            const response = await fetch(`/api/bookings?${params}`);
            const result: BookingsResponse = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to fetch bookings');
            }

            // Filter for COMPLETED bookings only
            const completed = (result.data || []).filter(b => b.status === 'completed');

            // Sort by date descending
            completed.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

            setBookings(completed);
        } catch (err) {
            console.error(err);
            toast.error('Failed to load results');
        } finally {
            setLoading(false);
        }
    }, [clientId]);

    useEffect(() => {
        fetchCompletedBookings();
    }, [fetchCompletedBookings]);

    const handleOpenResults = (booking: Booking) => {
        setSelectedBooking(booking);
        setIsResultsOpen(true);
    };

    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center h-64 text-muted-foreground gap-2">
                <HugeiconsIcon icon={Loading03Icon} className="animate-spin w-8 h-8 text-primary" />
                <p>Loading your results...</p>
            </div>
        );
    }

    if (bookings.length === 0) {
        return (
            <div className="text-center py-16 bg-muted/10 rounded-xl border border-dashed flex flex-col items-center">
                <div className="p-4 bg-muted rounded-full mb-4">
                    <HugeiconsIcon icon={Image02Icon} size={32} className="text-muted-foreground" />
                </div>
                <h3 className="text-xl font-medium">No results available</h3>
                <p className="text-muted-foreground mt-2 max-w-sm">
                    Once your appointments are completed, your ultrasound photos and videos will appear here.
                </p>
            </div>
        );
    }

    return (
        <>
            <div className="grid grid-cols-1 sc:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {bookings.map((booking) => (
                    <ResultCard
                        key={booking.id}
                        booking={booking}
                        onClick={handleOpenResults}
                    />
                ))}
            </div>

            <ResultsModal
                isOpen={isResultsOpen}
                onClose={() => {
                    setIsResultsOpen(false);
                    setSelectedBooking(null);
                }}
                booking={selectedBooking}
            />
        </>
    );
}
