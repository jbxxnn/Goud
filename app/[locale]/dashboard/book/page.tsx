'use client';

import { BookingProvider } from '@/app/[locale]/(public)/booking/_components/booking-context';
import { ClientBookingFlow } from './client-booking-flow';
import { useTranslations } from 'next-intl';

export default function BookingPage() {
    const t = useTranslations('Dashboard');

    return (
        <BookingProvider>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">{t('menu.bookNewEcho')}</h1>
                    <p className="mt-1 text-sm text-gray-600">
                        Select a service and time for your next appointment.
                    </p>
                </div>

                <ClientBookingFlow />
            </div>
        </BookingProvider>
    );
}
