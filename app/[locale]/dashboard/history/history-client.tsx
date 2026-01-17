'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';
import { HugeiconsIcon } from '@hugeicons/react';
import { Calendar02Icon, Location01Icon, UserIcon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { useRouter } from 'next/navigation';

interface HistoryClientProps {
    appointments: any[];
}

export function HistoryClient({ appointments }: HistoryClientProps) {
    const router = useRouter();

    return (
        <div className="container py-6 max-w-5xl space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Past Appointments</h1>
                <p className="text-muted-foreground">View your completed and cancelled appointments.</p>
            </div>

            <div className="space-y-4">
                {appointments.length === 0 ? (
                    <Card>
                        <CardContent className="p-8 text-center text-muted-foreground">
                            No past appointments found.
                        </CardContent>
                    </Card>
                ) : (
                    appointments.map((booking) => (
                        <Card key={booking.id} className="cursor-pointer hover:bg-muted/5 transition-colors" onClick={() => router.push(`/dashboard/appointments/${booking.id}`)}>
                            <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Badge variant={booking.status === 'completed' ? 'default' : 'destructive'}>
                                            {booking.status}
                                        </Badge>
                                        <span className="font-semibold text-lg">{booking.users?.first_name} {booking.users?.last_name}</span>
                                    </div>
                                    <div className="text-sm text-muted-foreground flex items-center gap-4 flex-wrap">
                                        <span className="flex items-center gap-1">
                                            <HugeiconsIcon icon={Calendar02Icon} size={14} />
                                            {format(parseISO(booking.start_time), 'PPP')}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <HugeiconsIcon icon={Location01Icon} size={14} />
                                            {booking.locations?.name}
                                        </span>
                                        <span className="font-medium text-foreground">
                                            {booking.services?.name}
                                        </span>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm" className="hidden md:flex">
                                    View Details
                                    <HugeiconsIcon icon={ArrowRight01Icon} className="ml-2 h-4 w-4" />
                                </Button>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
