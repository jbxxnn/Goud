"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { HugeiconsIcon } from '@hugeicons/react';
import { EditIcon, Delete02Icon, Location03Icon, CallIcon, MailIcon } from '@hugeicons/core-free-icons';
import { Location } from "@/lib/types/location_simple"
import { getFullAddress, getLocationDisplayName } from "@/lib/types/location_simple"

export const createLocationColumns = (
  onEdit: (location: Location) => void,
  onDelete: (location: Location) => void,
  onToggleActive: (id: string, currentStatus: boolean) => void
): ColumnDef<Location>[] => [
  {
    accessorKey: "locationCode",
    header: ({ column }) => {
      return (
        <Button
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="rounded-sm text-sidebar-foreground border-input bg-transparent ring-0 focus:ring-0 focus:ring-offset-0 focus:border-input focus-visible:border-input focus-visible:ring-0 focus-visible:ring-offset-0"
        >
          Code
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const code = row.getValue<string>("locationCode")
      return (
        <span className="ml-2 font-mono text-sm uppercase tracking-wide">
          {code || "-"}
        </span>
      )
    },
  },
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="rounded-sm text-sidebar-foreground border-input bg-transparent ring-0 focus:ring-0 focus:ring-offset-0 focus:border-input focus-visible:border-input focus-visible:ring-0 focus-visible:ring-offset-0"
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const location = row.original
      return (
        <div className="font-medium ml-2 flex items-center gap-2">
          {location.color && (
            <div
              className="w-2 h-2 rounded-full border border-input flex-shrink-0"
              style={{ backgroundColor: location.color }}
              title={`Location color: ${location.color}`}
            />
          )}
          {getLocationDisplayName(location)}
        </div>
      )
    },
  },
  {
    accessorKey: "address",
    header: "Address",
    cell: ({ row }) => {
      const location = row.original
      return (
        <div className="text-sm text-muted-foreground max-w-[300px] flex items-center gap-2">
          <HugeiconsIcon icon={Location03Icon} className="h-4 w-4 flex-shrink-0" />
          <span>{getFullAddress(location)}</span>
        </div>
      )
    },
  },
  {
    accessorKey: "phone",
    header: "Phone",
    cell: ({ row }) => {
      const location = row.original
      return (
        <div className="text-sm flex items-center gap-2">
          {location.phone ? (
            <>
              <HugeiconsIcon icon={CallIcon} className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span>{location.phone}</span>
            </>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => {
      const location = row.original
      return (
        <div className="text-sm flex items-center gap-2">
          {location.email ? (
            <>
              <HugeiconsIcon icon={MailIcon} className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span>{location.email}</span>
            </>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "is_active",
    header: "Status",
    cell: ({ row }) => {
      const location = row.original
      const isActive = row.getValue("is_active") as boolean
      return (
        <Switch
          checked={isActive}
          onCheckedChange={() => onToggleActive(location.id, isActive)}
          aria-label={`${isActive ? 'Deactivate' : 'Activate'} ${location.name}`}
        />
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id as keyof Location) as string)
    },
  },
  {
    id: "actions",
    header: "Actions",
    enableHiding: false,
    cell: ({ row }) => {
      const location = row.original

      return (
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(location)}
            className="h-8 w-8 p-0"
          >
            <HugeiconsIcon icon={EditIcon} className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(location)}
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
          >
            <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4" />
          </Button>
        </div>
      )
    },
  },
]
