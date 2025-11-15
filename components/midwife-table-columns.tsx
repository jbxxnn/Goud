'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { HugeiconsIcon } from '@hugeicons/react';
import { 
  EditIcon, 
  Delete02Icon, 
  EyeIcon, 
  UserIcon,
  CallIcon,
  MailIcon,
  BuildingIcon
} from '@hugeicons/core-free-icons';
import { Midwife, getMidwifeDisplayName, getMidwifeFullDisplay } from '@/lib/types/midwife';

interface MidwifeActionsProps {
  onEdit: (midwife: Midwife) => void;
  onDelete: (midwife: Midwife) => void;
  onToggleActive: (id: string, currentStatus: boolean) => void;
  onView: (midwife: Midwife) => void;
}

export function createMidwifeColumns({
  onEdit,
  onDelete,
  onToggleActive,
  onView
}: MidwifeActionsProps): ColumnDef<Midwife>[] {
  return [
    {
      accessorKey: 'first_name',
      header: 'Name',
      cell: ({ row }) => {
        const midwife = row.original;
        return (
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <HugeiconsIcon icon={UserIcon} className="h-4 w-4 text-primary" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-sm">
                {getMidwifeDisplayName(midwife)}
              </div>
              {midwife.practice_name && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                  <HugeiconsIcon icon={BuildingIcon} className="h-3 w-3" />
                  <span className="truncate">{midwife.practice_name}</span>
                </div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'contact',
      header: 'Contact',
      cell: ({ row }) => {
        const midwife = row.original;
        return (
          <div className="space-y-1">
            {midwife.email && (
              <div className="flex items-center space-x-2 text-sm">
                <HugeiconsIcon icon={MailIcon} className="h-3 w-3 text-muted-foreground" />
                <span className="truncate">{midwife.email}</span>
              </div>
            )}
            {midwife.phone && (
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <HugeiconsIcon icon={CallIcon} className="h-3 w-3" />
                <span>{midwife.phone}</span>
              </div>
            )}
            {!midwife.email && !midwife.phone && (
              <span className="text-xs text-muted-foreground">No contact info</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => {
        const midwife = row.original;
        const isActive = midwife.is_active;
        return (
          <div className="flex items-center gap-2">
            <Switch
              checked={isActive}
              onCheckedChange={() => onToggleActive(midwife.id, isActive)}
              aria-label={`Toggle ${midwife.first_name} ${midwife.last_name} status`}
            />
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const midwife = row.original;

        return (
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onView(midwife)}
              className="h-8 w-8 p-0"
            >
              <HugeiconsIcon icon={EyeIcon} className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(midwife)}
              className="h-8 w-8 p-0"
            >
              <HugeiconsIcon icon={EditIcon} className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(midwife)}
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            >
              <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];
}




