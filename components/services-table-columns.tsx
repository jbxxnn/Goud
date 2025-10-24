'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
// import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { HugeiconsIcon } from '@hugeicons/react';
import { 
  EditIcon, 
  Delete02Icon,
  Time04Icon,
  ClockIcon
} from '@hugeicons/core-free-icons';
import { Service } from '@/lib/types/service';

// Format duration in minutes to readable format
const formatDuration = (minutes: number) => {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
};

export const createServiceColumns = (
  onEdit: (service: Service) => void,
  onDelete: (service: Service) => void,
  onToggleActive: (id: string, currentStatus: boolean) => void,
  onView?: (service: Service) => void
): ColumnDef<Service>[] => [
  {
    accessorKey: 'name',
    header: 'Service Name',
    cell: ({ row }) => {
      const service = row.original;
      return onView ? (
        <Button
          variant="link"
          className="h-auto p-0 font-medium text-left justify-start"
          onClick={() => onView(service)}
        >
          {row.getValue('name')}
        </Button>
      ) : (
        <div className="font-medium">{row.getValue('name')}</div>
      );
    },
  },
  {
    accessorKey: 'duration',
    header: 'Duration',
    cell: ({ row }) => {
      const duration = row.getValue('duration') as number;
      return (
        <div className="flex items-center gap-1">
          <HugeiconsIcon icon={Time04Icon} className="h-4 w-4" />
          {formatDuration(duration)}
        </div>
      );
    },
  },
  {
    accessorKey: 'buffer_time',
    header: 'Buffer Time',
    cell: ({ row }) => {
      const bufferTime = row.getValue('buffer_time') as number;
      return bufferTime > 0 ? (
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <HugeiconsIcon icon={ClockIcon} className="h-4 w-4" />
          +{formatDuration(bufferTime)}
        </div>
      ) : (
        <span className="text-sm text-muted-foreground">None</span>
      );
    },
  },
  {
    accessorKey: 'lead_time',
    header: 'Lead Time',
    cell: ({ row }) => {
      const leadTime = row.getValue('lead_time') as number;
      return leadTime > 0 ? (
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <HugeiconsIcon icon={ClockIcon} className="h-4 w-4" />
          {leadTime}h
        </div>
      ) : (
        <span className="text-sm text-muted-foreground">None</span>
      );
    },
  },
  {
    accessorKey: 'price',
    header: 'Price',
    cell: ({ row }) => {
      const service = row.original;
      const price = service.price;
      const salePrice = service.sale_price;
      
      return (
        <div className="space-y-1">
          <div className="font-medium">
            €{price.toFixed(2)}
          </div>
          {salePrice && (
            <div className="text-sm text-green-600 font-medium">
              Sale: €{salePrice.toFixed(2)}
            </div>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'is_active',
    header: 'Status',
    cell: ({ row }) => {
      const service = row.original;
      const isActive = service.is_active;
      
      return (
        <div className="flex items-center gap-3">
          <Switch
            checked={isActive}
            onCheckedChange={() => onToggleActive(service.id, isActive)}
            aria-label={`Toggle ${service.name} status`}
          />
          {/* <Badge variant={isActive ? "default" : "secondary"} className="text-xs">
            {isActive ? "Active" : "Inactive"}
          </Badge> */}
        </div>
      );
    },
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => {
      const service = row.original;

      return (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(service)}
            title="Edit service"
            className="hover:bg-secondary"
          >
            <HugeiconsIcon icon={EditIcon} className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(service)}
            title="Delete service"
            className="text-destructive hover:text-destructive hover:bg-secondary"
          >
            <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4" />
          </Button>
        </div>
      );
    },
  },
];

