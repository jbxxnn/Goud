'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog';
import { HugeiconsIcon } from '@hugeicons/react';
import {
    CalendarAdd01Icon,
    Calendar01Icon,
    Cancel01Icon,
    MoreHorizontalIcon,
    Image01Icon
} from '@hugeicons/core-free-icons';
import { Booking } from '@/lib/types/booking';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useTranslations } from 'next-intl';

interface ActionButtonsProps {
    booking: Booking;
    onReschedule: (booking: Booking) => void;
    onCancel: (booking: Booking) => void;
    onViewResults?: (booking: Booking) => void;
    isPast?: boolean;
}

export function ActionButtons({ booking, onReschedule, onCancel, onViewResults, isPast }: ActionButtonsProps) {
    const t = useTranslations('Appointments.actions');
    const [isCancelOpen, setIsCancelOpen] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);

    // Helper to generate ICS file content
    const handleAddToCalendar = () => {
        const startTime = new Date(booking.start_time);
        const endTime = new Date(booking.end_time);

        // Format dates for ICS (YYYYMMDDTHHMMSSZ)
        // Note: This is a simple implementation. Ideally use a library like 'ics' or 'date-fns' helpers if complex timezones are involved.
        // For now assuming local time or Z depending on app set up. Let's use simple string replacement for now.
        const formatDate = (date: Date) => date.toISOString().replace(/-|:|\.\d+/g, '');

        const icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'BEGIN:VEVENT',
            `DTSTART:${formatDate(startTime)}`,
            `DTEND:${formatDate(endTime)}`,
            `SUMMARY:${booking.services?.name || 'Echo Appointment'} at Goud Echo`,
            `DESCRIPTION:Appointment with ${booking.staff?.first_name || 'Goud Echo Team'}`,
            `LOCATION:${booking.locations?.address || 'Goud Echo'}`,
            'END:VEVENT',
            'END:VCALENDAR'
        ].join('\r\n');

        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `appointment-${format(startTime, 'yyyy-MM-dd')}.ics`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleCancelConfirm = async () => {
        try {
            setIsCancelling(true);
            await onCancel(booking);
            setIsCancelOpen(false);
        } catch (error) {
            // Error handled in parent
        } finally {
            setIsCancelling(false);
        }
    };

    if (isPast) {
        if (booking.status === 'completed' && onViewResults) {
            return (
                <div className="flex items-center justify-end w-full">
                    <Button onClick={() => onViewResults(booking)} className="bg-primary text-primary-foreground hover:bg-primary/90">
                        <HugeiconsIcon icon={Image01Icon} size={16} className="mr-2" />
                        {t('viewResults')}
                    </Button>
                </div>
            );
        }
        return null;
    }

    // If appointment is cancelled, maybe show nothing or just "Add to calendar" if they still want it? 
    // Usually cancelled appointments don't need actions.
    if (booking.status === 'cancelled') {
        return null;
    }

    return (
        <>
            <div className="flex items-center justify-between w-full gap-2">
                <Button onClick={() => onReschedule(booking)} size="sm">
                    <HugeiconsIcon icon={Calendar01Icon} size={16} className="mr-2" />
                    {t('reschedule')}
                </Button>
                {/* <Button onClick={handleAddToCalendar} className="sm:hidden">
                        <HugeiconsIcon icon={CalendarAdd01Icon} size={16} className="mr-2" />
                        Add to Calendar
                    </Button> */}
                <Button
                    onClick={() => setIsCancelOpen(true)}
                    size="sm"
                    className="text-secondary-foreground shadow-md focus:text-primary-foreground bg-secondary hover:text-primary-foreground focus:bg-red-50 hover:bg-destructive"
                >
                    <HugeiconsIcon icon={Cancel01Icon} size={16} className="mr-2" />
                    {t('cancel')}
                </Button>
            </div>

            <Dialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('cancelDialog.title')}</DialogTitle>
                        <DialogDescription>
                            {t('cancelDialog.description', {
                                service: booking.services?.name || 'Appointment',
                                date: format(new Date(booking.start_time), 'MMMM d, yyyy')
                            })}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCancelOpen(false)} disabled={isCancelling}>
                            {t('cancelDialog.keep')}
                        </Button>
                        <Button variant="destructive" onClick={handleCancelConfirm} disabled={isCancelling}>
                            {isCancelling ? t('cancelDialog.processing') : t('cancelDialog.confirm')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
