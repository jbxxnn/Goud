'use client';

import { Card } from '@/components/ui/card';
import { DashboardHeader } from '@/components/client-dashboard/header';
import { Separator } from '@/components/ui/separator';
import { ScheduleTimeline } from '@/components/staff-dashboard/schedule-timeline';


interface StaffDashboardProps {
    staff: {
        id: string;
        first_name: string;
    };
}

export default function StaffDashboard({ staff }: StaffDashboardProps) {
    return (
        <div className="container py-6 space-y-6">
            <DashboardHeader
                heading="Staff Dashboard"
                text={`Welcome back, ${staff.first_name}. Manage your daily schedule.`}
            />
            <Separator />

            <Card className="p-6 border-none shadow-none bg-transparent">
                <ScheduleTimeline staffId={staff.id} />
            </Card>
        </div>
    );
}
