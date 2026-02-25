'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  EyeIcon,
  UserIcon,
  CallIcon,
  MailIcon,
  Loading03Icon,
} from '@hugeicons/core-free-icons';
import { User, getUserDisplayName } from '@/lib/types/user';

interface ClientActionsProps {
  onView: (client: User) => void;
  loadingClientId?: string | null;
  t: any;
}

export function createClientColumns({
  onView,
  loadingClientId,
  t
}: ClientActionsProps): ColumnDef<User>[] {
  return [
    {
      accessorKey: 'first_name',
      header: t('columns.client'),
      cell: ({ row }) => {
        const client = row.original;
        return (
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <HugeiconsIcon icon={UserIcon} className="h-4 w-4 text-primary" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-sm">
                {getUserDisplayName(client)}
              </div>
              <div className="text-xs text-muted-foreground">
                ID: {client.id.slice(0, 8)}...
              </div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'email',
      header: t('columns.contact'),
      cell: ({ row }) => {
        const client = row.original;
        return (
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-sm">
              <HugeiconsIcon icon={MailIcon} className="h-3 w-3 text-muted-foreground" />
              <span className="truncate">{client.email}</span>
            </div>
            {client.phone && (
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <HugeiconsIcon icon={CallIcon} className="h-3 w-3" />
                <span>{client.phone}</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'city',
      header: t('columns.city'),
      cell: ({ row }) => {
        return <div className="text-sm">{row.getValue('city') || '-'}</div>;
      },
    },
    {
      header: t('columns.address'),
      cell: ({ row }) => {
        const client = row.original;
        const address = [client.street_name, client.house_number].filter(Boolean).join(' ');
        return <div className="text-sm truncate max-w-[150px]" title={address}>{address || '-'}</div>;
      },
    },
    {
      accessorKey: 'birth_date',
      header: t('columns.birthDate'),
      cell: ({ row }) => {
        const dob = row.getValue('birth_date') as string | null;
        if (!dob) return <div className="text-sm">-</div>;
        return (
          <div className="text-sm">
            {new Date(dob).toLocaleDateString('nl-NL', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: t('columns.actions'),
      cell: ({ row }) => {
        const client = row.original;
        const isLoading = loadingClientId === client.id;
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onView(client)}
              className="h-8 w-8"
              title={t('cells.viewDetails')}
              disabled={isLoading}
            >
              {isLoading ? (
                <HugeiconsIcon icon={Loading03Icon} className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <HugeiconsIcon icon={EyeIcon} className="h-4 w-4" />
              )}
            </Button>
          </div>
        );
      },
    },
  ];
}

