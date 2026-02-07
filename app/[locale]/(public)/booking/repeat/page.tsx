'use client';

import { useSearchParams } from 'next/navigation';
import { BookingProvider } from '../_components/booking-context';
import { BookingFlow } from '../_components/booking-flow';
import { Suspense } from 'react';

function RepeatBookingContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    return (
        <BookingProvider continuationToken={token || undefined}>
            <BookingFlow />
        </BookingProvider>
    );
}

export default function RepeatBookingPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
            <RepeatBookingContent />
        </Suspense>
    );
}
