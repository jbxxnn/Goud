import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { RecentBookingSummary } from '@/lib/types/booking';

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return format(date, 'dd MMM yyyy · HH:mm');
};

export const getRecentBookingsColumns = (t: (key: string) => string, tRoot: (key: string) => string): ColumnDef<RecentBookingSummary>[] => [
  {
    accessorKey: 'clientName',
    header: t('recentBookings.table.client'),
    cell: ({ row }) => {
      const booking = row.original;
      return (
        <div className="flex flex-col">
          <span className="font-medium text-foreground">{booking.clientName}</span>
          {booking.clientEmail ? (
            <span className="text-xs text-muted-foreground">{booking.clientEmail}</span>
          ) : null}
        </div>
      );
    },
  },
  {
    accessorKey: 'serviceName',
    header: t('recentBookings.table.service'),
    cell: ({ row }) => {
      const booking = row.original;
      return (
        <div className="flex flex-col">
          <span className="font-medium text-foreground">{booking.serviceName}</span>
          {booking.serviceCode ? (
            <span className="text-xs text-muted-foreground uppercase tracking-wide">
              {booking.serviceCode}
            </span>
          ) : null}
        </div>
      );
    },
  },
  {
    accessorKey: 'staffName',
    header: t('recentBookings.table.staff'),
    cell: ({ row }) => {
      const staff = row.original.staffName;
      return <span className="text-sm text-muted-foreground">{staff ?? '—'}</span>;
    },
  },
  {
    accessorKey: 'locationName',
    header: t('recentBookings.table.location'),
    cell: ({ row }) => {
      const location = row.original.locationName;
      return <span className="text-sm text-muted-foreground">{location ?? '—'}</span>;
    },
  },
  {
    accessorKey: 'startTime',
    header: t('recentBookings.table.scheduled'),
    cell: ({ row }) => {
      return <span className="text-sm text-muted-foreground">{formatDateTime(row.original.startTime)}</span>;
    },
  },
  {
    accessorKey: 'status',
    header: t('recentBookings.table.status'),
    cell: ({ row }) => {
      const status = row.original.status;
      const variant =
        status === 'confirmed'
          ? 'default'
          : status === 'pending'
            ? 'outline'
            : status === 'cancelled'
              ? 'destructive'
              : 'secondary';
      return (
        <Badge variant={variant} className="capitalize">
          {tRoot(`BookingStatus.${status}`)}
        </Badge>
      );
    },
  },
];

