"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Location } from "@/lib/types/location_simple"
import { getFullAddress, getLocationDisplayName } from "@/lib/types/location_simple"

export const createLocationColumns = (
  onEdit: (location: Location) => void,
  onDelete: (location: Location) => void,
  onToggleActive: (id: string, currentStatus: boolean) => void
): ColumnDef<Location>[] => [
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="rounded-sm text-sidebar-foreground border-input bg-sidebar ring-0 focus:ring-0 focus:ring-offset-0 focus:border-input focus-visible:border-input focus-visible:ring-0 focus-visible:ring-offset-0"
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const location = row.original
      return (
        <div className="font-medium ml-2">
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
        <div className="text-sm text-muted-foreground max-w-[300px]">
          {getFullAddress(location)}
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
        <div className="text-sm">
          {location.phone ? `${location.phone}` : '-'}
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
        <div className="text-sm">
          {location.email ? `${location.email}` : '-'}
        </div>
      )
    },
  },
  {
    accessorKey: "is_active",
    header: "Status",
    cell: ({ row }) => {
      const isActive = row.getValue("is_active") as boolean
      return (
        <Badge 
          variant={isActive ? "default" : "secondary"} 
          className={`rounded-full border-input bg-sidebar ring-0 focus:ring-0 focus:ring-offset-0 focus:border-input focus-visible:border-input focus-visible:ring-0 focus-visible:ring-offset-0 ${
            isActive 
              ? "text-primary-foreground bg-primary" 
              : "text-sidebar-foreground bg-sidebar"
          }`}
        >
          {isActive ? "Active" : "Inactive"}
        </Badge>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id as keyof Location) as string)
    },
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const location = row.original

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="h-8 w-8 p-0 bg-[#ffffff]">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4 text-sidebar-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(location.id)}
            >
              Copy location ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onEdit(location)}>
              Edit location
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onToggleActive(location.id, location.is_active)}
            >
              {location.is_active ? "Deactivate" : "Activate"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(location)}
              className="text-destructive"
            >
              Delete location
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
