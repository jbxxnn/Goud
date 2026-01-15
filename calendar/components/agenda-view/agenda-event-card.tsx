
"use client";

import { format, parseISO } from "date-fns";
import { cva } from "class-variance-authority";
import { Clock, Text, User } from "lucide-react";

import { useCalendar } from "@/calendar/contexts/calendar-context";

import { ShiftDetailsDialog } from "@/calendar/components/dialogs/shift-details-dialog";
import { BookingDetailsDialog } from "@/calendar/components/dialogs/booking-details-dialog";
import { DraggableEvent } from "@/calendar/components/dnd/draggable-event";


import type { IEvent } from "@/calendar/interfaces";
import type { VariantProps } from "class-variance-authority";

const agendaEventCardVariants = cva(
  "flex select-none items-center justify-between gap-3 rounded-md border p-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
  {
    variants: {
      color: {
        // Colored variants
        blue: "border-blue-300 bg-blue-200 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300 [&_.event-dot]:fill-blue-600",
        green: "border-green-300 bg-green-200 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300 [&_.event-dot]:fill-green-600",
        red: "border-red-300 bg-red-200 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300 [&_.event-dot]:fill-red-600",
        yellow: "border-yellow-300 bg-yellow-200 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-300 [&_.event-dot]:fill-yellow-600",
        purple: "border-purple-300 bg-purple-200 text-purple-700 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300 [&_.event-dot]:fill-purple-600",
        orange: "border-orange-300 bg-orange-200 text-orange-700 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-300 [&_.event-dot]:fill-orange-600",
        gray: "border-neutral-300 bg-neutral-200 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 [&_.event-dot]:fill-neutral-600",

        // Dot variants
        "blue-dot": "bg-neutral-50 dark:bg-neutral-900 [&_.event-dot]:fill-blue-600",
        "green-dot": "bg-neutral-50 dark:bg-neutral-900 [&_.event-dot]:fill-green-600",
        "red-dot": "bg-neutral-50 dark:bg-neutral-900 [&_.event-dot]:fill-red-600",
        "orange-dot": "bg-neutral-50 dark:bg-neutral-900 [&_.event-dot]:fill-orange-600",
        "purple-dot": "bg-neutral-50 dark:bg-neutral-900 [&_.event-dot]:fill-purple-600",
        "yellow-dot": "bg-neutral-50 dark:bg-neutral-900 [&_.event-dot]:fill-yellow-600",
        "gray-dot": "bg-neutral-50 dark:bg-neutral-900 [&_.event-dot]:fill-neutral-600",
      },
    },
    defaultVariants: {
      color: "blue-dot",
    },
  }
);

interface IProps {
  event: IEvent;
  eventCurrentDay?: number;
  eventTotalDays?: number;
  onShiftDeleted?: () => void;
  onShiftUpdated?: () => void;
}

export function AgendaEventCard({ event, eventCurrentDay, eventTotalDays, onShiftDeleted, onShiftUpdated }: IProps) {
  const { badgeVariant, entityType } = useCalendar();

  const startDate = parseISO(event.startDate);
  const endDate = parseISO(event.endDate);

  const color = (badgeVariant === "dot" ? `${event.color}-dot` : event.color) as VariantProps<typeof agendaEventCardVariants>["color"];

  const agendaEventCardClasses = agendaEventCardVariants({ color });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (e.currentTarget instanceof HTMLElement) e.currentTarget.click();
    }
  };

  const CardContent = (
    <div role="button" tabIndex={0} className={agendaEventCardClasses} onKeyDown={handleKeyDown}>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          {["mixed", "dot"].includes(badgeVariant) && (
            <svg width="8" height="8" viewBox="0 0 8 8" className="event-dot shrink-0">
              <circle cx="4" cy="4" r="4" />
            </svg>
          )}

          <p className="font-medium">
            {eventCurrentDay && eventTotalDays && (
              <span className="mr-1 text-xs">
                Day {eventCurrentDay} of {eventTotalDays} •{" "}
              </span>
            )}
            {event.title}
          </p>
        </div>

        <div className="mt-1 flex items-center gap-1">
          <User className="size-3 shrink-0" />
          <p className="text-xs text-foreground">{event.user.name}</p>
        </div>

        <div className="flex items-center gap-1">
          <Clock className="size-3 shrink-0" />
          <p className="text-xs text-foreground">
            {format(startDate, "h:mm a")} - {format(endDate, "h:mm a")}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <Text className="size-3 shrink-0" />
          <p className="text-xs text-foreground">{event.description}</p>
        </div>
      </div>
    </div>
  );

  return (
    <DraggableEvent event={event}>
      {entityType === 'booking' ? (
        <BookingDetailsDialog event={event} onBookingDeleted={onShiftDeleted} onBookingUpdated={onShiftUpdated}>
          {CardContent}
        </BookingDetailsDialog>
      ) : (
        <ShiftDetailsDialog event={event} onShiftDeleted={onShiftDeleted} onShiftUpdated={onShiftUpdated}>
          {CardContent}
        </ShiftDetailsDialog>
      )}
    </DraggableEvent>
  );
}
