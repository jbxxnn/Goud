'use client';

import BookingsClient from './bookings/bookings-client';
import { CreateTaskDialog } from '@/components/dashboard/create-task-dialog';
import { useTranslations } from 'next-intl';

interface StaffDashboardProps {
    staff: {
        id: string;
        first_name: string;
    };
}

export default function StaffDashboard({ staff }: StaffDashboardProps) {
    const t = useTranslations('StaffDashboard');

    return (
        <div className="container py-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">{t('title')}</h1>
                <CreateTaskDialog />
            </div>
            <BookingsClient 
                initialBookings={[]}
                initialPagination={{
                    page: 1,
                    totalPages: 1
                }}
                staffId={staff.id}
                userRole="staff"
            />
        </div>
    );
}
