'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { HugeiconsIcon } from '@hugeicons/react';
import { 
  EyeIcon, 
  UserIcon,
  CallIcon,
  MailIcon,
} from '@hugeicons/core-free-icons';
import { User, getUserDisplayName } from '@/lib/types/user';

interface ClientActionsProps {
  onView: (client: User) => void;
}

export function createClientColumns({
  onView,
}: ClientActionsProps): ColumnDef<User>[] {
  return [
    {
      accessorKey: 'first_name',
      header: 'Client',
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
      header: 'Contact',
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
      accessorKey: 'created_at',
      header: 'Member Since',
      cell: ({ row }) => {
        const date = new Date(row.getValue('created_at'));
        return (
          <div className="text-sm">
            {date.toLocaleDateString('nl-NL', { 
              year: 'numeric', 
              month: 'short', 
              day: 'numeric' 
            })}
          </div>
        );
      },
    },
    {
      accessorKey: 'last_login',
      header: 'Last Login',
      cell: ({ row }) => {
        const lastLogin = row.getValue('last_login') as string | null;
        if (!lastLogin) {
          return <span className="text-sm text-muted-foreground">Never</span>;
        }
        const date = new Date(lastLogin);
        return (
          <div className="text-sm">
            {date.toLocaleDateString('nl-NL', { 
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
      header: 'Actions',
      cell: ({ row }) => {
        const client = row.original;
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onView(client)}
              className="h-8 w-8"
              title="View Details"
            >
              <HugeiconsIcon icon={EyeIcon} className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];
}

