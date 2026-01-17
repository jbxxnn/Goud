'use client';

import { Card } from '@/components/ui/card';
import { ScheduleTimeline } from '@/components/staff-dashboard/schedule-timeline';


import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UpcomingBookings } from "@/components/staff-dashboard/upcoming-bookings";
import { StaffBookingsList } from "@/components/staff-dashboard/staff-bookings-list";

interface StaffDashboardProps {
    staff: {
        id: string;
        first_name: string;
    };
}

export default function StaffDashboard({ staff }: StaffDashboardProps) {
    return (
        <div className="container py-6 space-y-6">

            <Tabs defaultValue="upcoming" className="w-full">
                <TabsList className="grid grid-cols-3 bg-accent max-w-sm ml-auto" style={{ borderRadius: '1rem' }}>
                    <TabsTrigger value="upcoming" style={{ borderRadius: '1rem' }}>Upcoming</TabsTrigger>
                    <TabsTrigger value="past" style={{ borderRadius: '1rem' }}>Past</TabsTrigger>
                    <TabsTrigger value="cancelled" style={{ borderRadius: '1rem' }}>Cancelled</TabsTrigger>
                </TabsList>

                <TabsContent value="upcoming" className="mt-4 max-w-2xl mx-auto">
                    {/* Reuse UpcomingBookings which now covers Today + Future */}
                    <UpcomingBookings staffId={staff.id} />
                </TabsContent>

                <TabsContent value="past" className="mt-4 max-w-2xl mx-auto">
                    <StaffBookingsList
                        staffId={staff.id}
                        status="completed"
                        emptyMessage="No completed past appointments found."
                    />
                </TabsContent>

                <TabsContent value="cancelled" className="mt-4 max-w-2xl mx-auto">
                    <StaffBookingsList
                        staffId={staff.id}
                        status="cancelled"
                        emptyMessage="No cancelled appointments found."
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
