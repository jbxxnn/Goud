'use client';

import { Booking } from '@/lib/types/booking';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HugeiconsIcon } from '@hugeicons/react';
import { Calendar02Icon, Image01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { format, parseISO } from 'date-fns';

interface ResultCardProps {
    booking: Booking;
    onClick: (booking: Booking) => void;
}

export function ResultCard({ booking, onClick }: ResultCardProps) {
    const serviceName = booking.services?.name || 'Echo Appointment';
    const date = format(parseISO(booking.start_time), 'MMMM d, yyyy');
    const time = format(parseISO(booking.start_time), 'HH:mm');

    return (
        <Card
            className="group overflow-hidden rounded-xl border border-secondary shadow-sm hover:shadow-md transition-all cursor-pointer bg-card hover:bg-accent/50"
            onClick={() => onClick(booking)}
        >
            <div className="aspect-[4/3] bg-muted/30 flex items-center justify-center border-b border-border relative overflow-hidden">
                {/* Placeholder or thumbnail if we had one. For now, an icon/pattern */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 group-hover:scale-105 transition-transform duration-500" />
                <div className="relative z-10 flex flex-col items-center gap-3 text-muted-foreground group-hover:text-primary transition-colors">
                    <div className="p-4 bg-background/80 backdrop-blur-sm rounded-full shadow-sm group-hover:shadow-md transition-shadow">
                        <HugeiconsIcon icon={Image01Icon} size={32} className="" />
                    </div>
                    <span className="text-xs font-medium uppercase tracking-wider">View Gallery</span>
                </div>
            </div>

            <CardContent className="p-5">
                <div className="space-y-1 mb-3">
                    <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors">
                        {serviceName}
                    </h3>
                    <div className="flex items-center text-sm text-muted-foreground gap-2">
                        <HugeiconsIcon icon={Calendar02Icon} size={14} />
                        <span>{date} &bull; {time}</span>
                    </div>
                </div>
            </CardContent>

            <CardFooter className="px-5 pb-5 pt-0 flex justify-between items-center">
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">
                    Results Ready
                </Badge>
                <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground group-hover:text-primary pl-0 hover:pl-2 transition-all">
                    Open
                    <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
                </Button>
            </CardFooter>
        </Card>
    );
}
