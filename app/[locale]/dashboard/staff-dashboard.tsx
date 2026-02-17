'use client';

import BookingsClient from './bookings/bookings-client';
import { useRouter } from 'next/navigation';

interface StaffDashboardProps {
    staff: {
        id: string;
        first_name: string;
    };
}

export default function StaffDashboard({ staff }: StaffDashboardProps) {
    const router = useRouter();

    return (
        <div className="container py-6 space-y-6">
            <h1 className="text-2xl font-bold">Staff Dashboard</h1>
            <BookingsClient 
                initialBookings={[]}
                initialPagination={{
                    page: 1,
                    totalPages: 1
                }}
                staffId={staff.id}
                onBookingClick={(booking) => router.push(`/dashboard/appointments/${booking.id}`)}
            />
        </div>
    );
}
