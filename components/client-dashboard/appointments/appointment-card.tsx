'use client';

import { Booking } from '@/lib/types/booking';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HugeiconsIcon } from '@hugeicons/react';
import {
    Calendar02Icon,
    Location01Icon,
    UserIcon,
    Clock01Icon
} from '@hugeicons/core-free-icons';
import { format, isPast, parseISO } from 'date-fns';
import { ActionButtons } from './action-buttons';
import Link from 'next/link';

interface AppointmentCardProps {
    booking: Booking;
    onReschedule: (booking: Booking) => void;
    onCancel: (booking: Booking) => void;
    onViewResults?: (booking: Booking) => void;
}

export function AppointmentCard({ booking, onReschedule, onCancel, onViewResults }: AppointmentCardProps) {
    // Combine date and time to check if past
    // start_time is usually an ISO string in Supabase, so we can use it directly
    const endDateTimeString = booking.end_time; // Assuming fully qualified ISO, otherwise need to combine logic
    // If end_time is just time, we need to know the date.
    // In many setups, start_time/end_time are TIMESTAMPTZ. Let's assume that for now given the error about missing booking_date.

    const isAppointmentPast = isPast(new Date(booking.end_time));

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed':
                return 'bg-green-100 text-green-800 hover:bg-green-100/80 border-green-200';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100/80 border-yellow-200';
            case 'cancelled':
                return 'bg-red-100 text-red-800 hover:bg-red-100/80 border-red-200';
            case 'completed':
                return 'bg-gray-100 text-gray-800 hover:bg-gray-100/80 border-gray-200';
            default:
                return 'bg-gray-100 text-gray-800 hover:bg-gray-100/80';
        }
    };

    const getStatusLabel = (status: string) => {
        if (isAppointmentPast && status === 'confirmed') return 'Completed';
        return status.charAt(0).toUpperCase() + status.slice(1);
    };

    // Safe safe navigation to nested properties in case they are missing
    const serviceName = booking.services?.name || 'Appointment';
    const staffName = booking.staff?.first_name || 'Staff';
    const locationName = booking.locations?.name || 'Clinic';
    const locationAddress = booking.locations?.address;
    const note = booking.notes || 'No note';

    // Create google maps link if address exists
    const mapsLink = locationAddress
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationAddress)}`
        : null;

    return (
        <Card className="overflow-hidden rounded-xl bg-accent border border-secondary shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3 bg-muted/20 border-b border-secondary">
                <div className="flex justify-between items-start">
                    <div className="space-y-2">
                        <p className="text-secondary-foreground text-sm">
                            {format(parseISO(booking.start_time), 'HH:mm a')} - {format(parseISO(booking.end_time), 'HH:mm a')}
                        </p>
                        <h3 className="font-semibold text-2xl">{serviceName}</h3>
                        <div className="flex items-center text-xs text-secondary-foreground gap-2">
                            <HugeiconsIcon icon={Calendar02Icon} size={12} />
                            <span>{format(parseISO(booking.start_time), 'EEEE, MMMM d, yyyy')}</span>
                        </div>
                        {/* <div className="flex items-center text-xs text-primary-foreground bg-primary rounded-full"> */}
                        {/* <Badge className="gap-2 bg-secondary text-secondary-foreground">
                            <HugeiconsIcon icon={UserIcon} size={12} />
                            <p className="">{staffName}</p>
                        </Badge> */}
                        {/* </div> */}
                    </div>
                    <Badge
                        variant="outline"
                        className={`capitalize ${getStatusColor(booking.status)}`}
                    >
                        {getStatusLabel(booking.status)}
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="pt-4 grid gap-4 sm:grid-cols-2" style={{ minHeight: '100px' }}>
                <div className="space-y-3">
                    <div className="flex items-start gap-3 text-sm">
                        {/* <HugeiconsIcon icon={Location01Icon} size={18} className="text-muted-foreground mt-0.5" /> */}
                        <div>
                            <p className="font-medium">Notes</p>
                            <p className="text-xs text-secondary-foreground">{note}</p>
                        </div>
                    </div>
                </div>
            </CardContent>

            <CardFooter className="bg-muted/10 border-t border-secondary px-6 py-3 flex justify-end gap-2">
                <ActionButtons
                    booking={booking}
                    onReschedule={onReschedule}
                    onCancel={onCancel}
                    onViewResults={onViewResults}
                    isPast={isAppointmentPast}
                />
            </CardFooter>
        </Card>
    );
}
