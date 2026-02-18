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
  CalendarIcon
} from '@hugeicons/core-free-icons';
import { Staff, getStaffDisplayName, getStaffRoleDisplay, StaffRole } from '@/lib/types/staff';

interface StaffActionsProps {
  onEdit: (staff: Staff) => void;
  onDelete?: (staff: Staff) => void;
  onToggleActive?: (id: string, currentStatus: boolean) => void;
  onView: (staff: Staff) => void;
}

export function createStaffColumns(
  t: (key: string) => string,
  {
    onEdit,
    onDelete,
    onToggleActive,
    onView
  }: StaffActionsProps
): ColumnDef<Staff>[] {
  return [
    {
      accessorKey: 'first_name',
      header: t('table.name'),
      cell: ({ row }) => {
        const staff = row.original;
        return (
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <HugeiconsIcon icon={UserIcon} className="h-4 w-4 text-primary" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-sm">
                {getStaffDisplayName(staff)}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'email',
      header: t('table.contact'),
      cell: ({ row }) => {
        const staff = row.original;
        return (
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-sm">
              <HugeiconsIcon icon={MailIcon} className="h-3 w-3 text-muted-foreground" />
              <span className="truncate">{staff.email}</span>
            </div>
            {staff.phone && (
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <HugeiconsIcon icon={CallIcon} className="h-3 w-3" />
                <span>{staff.phone}</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'role',
      header: t('table.role'),
      cell: ({ row }) => {
        const role = row.getValue('role') as string;
        return (
          <Badge variant="secondary" className="text-xs">
            {getStaffRoleDisplay(role as StaffRole)}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'hire_date',
      header: t('table.hireDate'),
      cell: ({ row }) => {
        const hireDate = row.getValue('hire_date') as string;
        if (!hireDate) {
          return <span className="text-xs text-muted-foreground">{t('table.notSet')}</span>;
        }
        return (
          <div className="flex items-center space-x-2 text-xs">
            <HugeiconsIcon icon={CalendarIcon} className="h-3 w-3 text-muted-foreground" />
            <span>{new Date(hireDate).toLocaleDateString()}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'is_active',
      header: t('table.status'),
      cell: ({ row }) => {
        const staff = row.original;
        const isActive = staff.is_active;
        return (
          <div className="flex items-center gap-2">
            <Switch
              checked={isActive}
              onCheckedChange={() => onToggleActive?.(staff.id, isActive)}
              disabled={!onToggleActive}
              aria-label={`Toggle ${staff.first_name} ${staff.last_name} status`}
            />
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: t('table.actions'),
      cell: ({ row }) => {
        const staff = row.original;

        return (
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onView(staff)}
              className="h-8 w-8 p-0"
            >
              <HugeiconsIcon icon={EyeIcon} className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(staff)}
              className="h-8 w-8 p-0"
            >
              <HugeiconsIcon icon={EditIcon} className="h-4 w-4" />
            </Button>
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(staff)}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              >
                <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];
}
