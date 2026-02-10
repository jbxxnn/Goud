'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { HugeiconsIcon } from '@hugeicons/react';
import {
    // EditIcon, 
    Delete02Icon,
    EyeIcon
} from '@hugeicons/core-free-icons';
import { Booking, BookingStatus } from '@/lib/types/booking';
import { differenceInMinutes } from 'date-fns';

const getStatusBadge = (status: BookingStatus, t: any) => {
    const variants: Record<BookingStatus, { variant: 'confirmed' | 'pending' | 'destructive' | 'ongoing' | 'completed' | 'default' | 'secondary' | 'outline', label: string }> = {
        pending: { variant: 'pending', label: t('pending') },
        confirmed: { variant: 'confirmed', label: t('confirmed') },
        cancelled: { variant: 'destructive', label: t('cancelled') },
        ongoing: { variant: 'ongoing', label: t('ongoing') },
        completed: { variant: 'completed', label: t('completed') },
    };
    const config = variants[status] || { variant: 'secondary', label: status || 'Unknown' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
};

const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('nl-NL', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
};

const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('nl-NL', {
        hour: '2-digit',
        minute: '2-digit'
    });
};

const formatDuration = (minutes: number) => {
    if (minutes < 60) {
        return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
};

export const createBookingColumns = (
    t: any, // Translation function
    onView: (booking: Booking) => void,
    onCancel: (booking: Booking) => void,
    onDelete: (booking: Booking) => void,
    canDelete: boolean = true, // Default to true for admin users
    // onReschedule?: (booking: Booking) => void
): ColumnDef<Booking>[] => [
        {
            id: 'select',
            header: ({ table }) => (
                <Checkbox
                    checked={
                        table.getIsAllPageRowsSelected() ||
                        (table.getIsSomePageRowsSelected() && "indeterminate")
                    }
                    onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                    aria-label="Select all"
                />
            ),
            cell: ({ row }) => (
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(value) => row.toggleSelected(!!value)}
                    aria-label="Select row"
                />
            ),
            enableSorting: false,
            enableHiding: false,
        },
        {
            accessorKey: 'users',
            header: t('columns.client'),
            cell: ({ row }) => {
                const booking = row.original;
                const user = booking.users;
                if (!user) return <span className="text-muted-foreground">{t('cells.na')}</span>;
                const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || t('cells.unknown');
                return (
                    <div>
                        <div className="font-medium">{fullName}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'start_time',
            header: t('columns.dateTime'),
            cell: ({ row }) => {
                const booking = row.original;
                const startTime = booking.start_time;
                const timeRange = `${formatTime(booking.start_time)} - ${formatTime(booking.end_time)}`;
                return (
                    <div>
                        <div className="font-medium">{formatDate(startTime)}</div>
                        <div className="text-sm text-muted-foreground">{timeRange}</div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'services',
            header: t('columns.service'),
            cell: ({ row }) => {
                const booking = row.original;
                const service = booking.services;
                const timeRange = `${formatTime(booking.start_time)} - ${formatTime(booking.end_time)}`;
                return service ? (
                    <div>
                        <div className="font-medium flex items-center gap-2">
                            {service.name}
                            {booking.parent_booking_id && (
                                <Badge variant="secondary" className="bg-primary text-primary-foreground border-primary hover:bg-primary/20 h-4 text-xs px-1 uppercase font-bold tracking-wider">
                                    {differenceInMinutes(new Date(booking.end_time), new Date(booking.start_time))}
                                </Badge>
                            )}
                        </div>
                        {/* <div className="text-xs text-muted-foreground mt-1">{timeRange}</div> */}
                    </div>
                ) : (
                    <span className="text-muted-foreground">{t('cells.na')}</span>
                );
            },
        },
        {
            accessorKey: 'locations',
            header: t('columns.location'),
            cell: ({ row }) => {
                const booking = row.original;
                const location = booking.locations;
                return location ? (
                    <div className="font-medium">{location.name}</div>
                ) : (
                    <span className="text-muted-foreground">{t('cells.na')}</span>
                );
            },
        },
        {
            accessorKey: 'staff',
            header: t('columns.staff'),
            cell: ({ row }) => {
                const booking = row.original;
                const staff = booking.staff;
                if (!staff) return <span className="text-muted-foreground">{t('cells.unassigned')}</span>;
                const fullName = [staff.first_name, staff.last_name].filter(Boolean).join(' ') || t('cells.unknown');
                return <div className="font-medium">{fullName}</div>;
            },
        },
        {
            accessorKey: 'status',
            header: t('columns.status'),
            cell: ({ row }) => {
                const status = row.getValue('status') as BookingStatus;
                return getStatusBadge(status, t);
            },
        },
        {
            id: 'actions',
            header: t('columns.actions'),
            cell: ({ row }) => {
                const booking = row.original;
                return (
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onView(booking)}
                            className="h-8 w-8"
                        >
                            <HugeiconsIcon icon={EyeIcon} className="h-4 w-4" />
                        </Button>
                        {/* {onReschedule && booking.status !== 'cancelled' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onReschedule(booking)}
              className="h-8 w-8"
              title="Reschedule"
            >
              <HugeiconsIcon icon={EditIcon} className="h-4 w-4" />
            </Button>
          )} */}
                        {booking.status !== 'cancelled' ? (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onCancel(booking)}
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                title={t('cells.cancel')}
                            >
                                <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4" />
                            </Button>
                        ) : (
                            canDelete && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => onDelete(booking)}
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    title={t('cells.delete')}
                                >
                                    <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4" />
                                </Button>
                            )
                        )}
                    </div>
                );
            },
        },
    ];

