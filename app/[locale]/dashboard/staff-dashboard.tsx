'use client';

import BookingsClient from './bookings/bookings-client';
import { CreateTaskDialog } from '@/components/dashboard/create-task-dialog';
import { Button } from '@/components/ui/button';
import { HugeiconsIcon } from '@hugeicons/react';
import { Task01Icon } from '@hugeicons/core-free-icons';
import { useTranslations } from 'next-intl';

interface StaffDashboardProps {
    staff: {
        id: string;
        first_name: string;
    };
}

export default function StaffDashboard({ staff }: StaffDashboardProps) {
    const t = useTranslations('CreateTaskDialog');

    return (
        <div className="relative flex h-[calc(100vh-5.5rem)] min-h-0 flex-col overflow-hidden p-4">
            <div className="min-h-0 flex-1 overflow-hidden">
                <BookingsClient
                    initialBookings={[]}
                    initialPagination={{
                        page: 1,
                        totalPages: 1
                    }}
                    staffId={staff.id}
                    userRole="staff"
                    fillParent
                />
            </div>
            <div className="absolute bottom-6 right-6 z-20">
                <CreateTaskDialog
                    trigger={
                        <Button
                            aria-label={t('trigger')}
                            size="icon"
                            className="h-12 w-12 rounded-full shadow-lg"
                        >
                            <HugeiconsIcon icon={Task01Icon} size={22} />
                        </Button>
                    }
                />
            </div>
        </div>
    );
}
