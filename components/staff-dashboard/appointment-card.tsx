'use client';

import { useState } from 'react';

import { Booking } from '@/lib/types/booking';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HugeiconsIcon } from '@hugeicons/react';
import {
    Clock01Icon,
    Location01Icon,
    ArrowRight01Icon,
    MoreHorizontalIcon,
    Loading03Icon
} from '@hugeicons/core-free-icons';
import { format, parseISO, addMinutes, differenceInMinutes } from 'date-fns';
import { useRouter } from 'next/navigation';

interface AppointmentCardProps {
    booking: Booking;
}

export function AppointmentCard({ booking }: AppointmentCardProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const start = parseISO(booking.start_time);

    // Fallback duration if not present (should be in service)
    const end = parseISO(booking.end_time);

    const handleClick = () => {
        setIsLoading(true);
        router.push(`/dashboard/appointments/${booking.id}`);
    };

    return (
        <Card
            className="hover:shadow-md transition-all cursor-pointer group"
            style={{ borderRadius: '1rem' }}
            onClick={handleClick}
        >
            <CardContent className="flex items-stretch p-0">
                {/* Left: Date Block */}
                <div className="w-[85px] flex flex-col items-center justify-center border-r border-border py-4 px-2 bg-muted" style={{ borderRadius: '1rem' }}>
                    <span className="text-xs font-semibold text-primary/80 uppercase tracking-wider">
                        {format(start, 'EEE')}
                    </span>
                    <span className="text-3xl font-bold text-primary">
                        {format(start, 'd')}
                    </span>
                </div>

                {/* Middle: Content */}
                <div className="flex-1 p-4 flex flex-col justify-center gap-1">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                        {/* Time Range */}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-[120px]">
                            <HugeiconsIcon icon={Clock01Icon} size={16} />
                            <span>
                                {format(start, 'HH:mm')} - {format(end, 'HH:mm')}
                            </span>
                        </div>

                        {/* Location */}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-[120px]">
                            <HugeiconsIcon icon={Location01Icon} size={16} />
                            <span className="truncate max-w-[150px]">
                                {booking.locations?.name || 'Main Clinic'}
                            </span>
                        </div>


                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">


                        {/* Title */}
                        <span className="font-semibold text-base">
                            {booking.services?.name}
                            {booking.isRepeat && <Badge variant="secondary" className="bg-primary text-primary-foreground border-primary hover:bg-primary/20 h-4 text-xs px-1 uppercase font-bold tracking-wider">
                                {differenceInMinutes(new Date(booking.end_time), new Date(booking.start_time))}
                            </Badge>} <br />
                            with {booking.users?.first_name} {booking.users?.last_name}
                        </span>
                        {/* Status */}
                        {/* <Badge variant={
                            booking.status === 'completed' ? 'default' :
                                booking.status === 'cancelled' ? 'destructive' :
                                    booking.status === 'ongoing' ? 'secondary' :
                                        'outline'
                        } className="w-fit">
                            {booking.status}
                        </Badge> */}
                    </div>
                </div>

                {/* Right: Actions */}
                <div className="hidden sm:flex items-center justify-center p-4 border-l border-border/50">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground bg-muted hover:text-primary"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <HugeiconsIcon icon={Loading03Icon} className="animate-spin" size={20} />
                        ) : (
                            <HugeiconsIcon icon={ArrowRight01Icon} size={20} />
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
