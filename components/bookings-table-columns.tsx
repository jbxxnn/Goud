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

const getStatusBadge = (status: BookingStatus) => {
  const variants: Record<BookingStatus, { variant: 'default' | 'secondary' | 'destructive', label: string }> = {
    pending: { variant: 'secondary', label: 'Pending' },
    confirmed: { variant: 'default', label: 'Confirmed' },
    cancelled: { variant: 'destructive', label: 'Cancelled' },
  };
  const config = variants[status];
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
    header: 'Client',
    cell: ({ row }) => {
      const booking = row.original;
      const user = booking.users;
      if (!user) return <span className="text-muted-foreground">N/A</span>;
      const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Unknown';
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
    header: 'Date & Time',
    cell: ({ row }) => {
      const booking = row.original;
      const startTime = booking.start_time;
      return (
        <div>
          <div className="font-medium">{formatDate(startTime)}</div>
          <div className="text-sm text-muted-foreground">{formatTime(startTime)}</div>
        </div>
      );
    },
  },
  {
    accessorKey: 'services',
    header: 'Service',
    cell: ({ row }) => {
      const booking = row.original;
      const service = booking.services;
      const duration = service?.duration ? formatDuration(service.duration) : null;
      return service ? (
        <div>
        <div className="font-medium">{service.name}</div>
        {duration && (
            <div className="text-xs text-muted-foreground mt-1">{duration}</div>
          )}
        </div>
      ) : (
        <span className="text-muted-foreground">N/A</span>
      );
    },
  },
  {
    accessorKey: 'locations',
    header: 'Location',
    cell: ({ row }) => {
      const booking = row.original;
      const location = booking.locations;
      return location ? (
        <div className="font-medium">{location.name}</div>
      ) : (
        <span className="text-muted-foreground">N/A</span>
      );
    },
  },
  {
    accessorKey: 'staff',
    header: 'Staff',
    cell: ({ row }) => {
      const booking = row.original;
      const staff = booking.staff;
      if (!staff) return <span className="text-muted-foreground">Unassigned</span>;
      const fullName = [staff.first_name, staff.last_name].filter(Boolean).join(' ') || 'Unknown';
      return <div className="font-medium">{fullName}</div>;
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as BookingStatus;
      return getStatusBadge(status);
    },
  },
  {
    id: 'actions',
    header: 'Actions',
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
              title="Cancel"
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
                title="Delete"
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

