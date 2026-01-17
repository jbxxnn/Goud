import { cva } from "class-variance-authority";
import { format, differenceInMinutes, parseISO } from "date-fns";

import { useCalendar } from "@/calendar/contexts/calendar-context";

import { DraggableEvent } from "@/calendar/components/dnd/draggable-event";
import { ShiftDetailsDialog } from "@/calendar/components/dialogs/shift-details-dialog";
import { BookingDetailsDialog } from "@/calendar/components/dialogs/booking-details-dialog";

import { cn } from "@/lib/utils";

import type { HTMLAttributes } from "react";
import type { IEvent } from "@/calendar/interfaces";
import type { VariantProps } from "class-variance-authority";

const calendarWeekEventCardVariants = cva(
    "flex select-none flex-col gap-0.5 truncate whitespace-nowrap rounded-md border px-2 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
    {
        variants: {
            color: {
                // Colored and mixed variants
                blue: "border-blue-300 bg-blue-200 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300 [&_.event-dot]:fill-blue-600",
                green: "border-green-300 bg-green-200 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300 [&_.event-dot]:fill-green-600",
                red: "border-red-300 bg-red-200 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300 [&_.event-dot]:fill-red-600",
                yellow: "border-yellow-300 bg-yellow-200 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-300 [&_.event-dot]:fill-yellow-600",
                purple: "border-purple-300 bg-purple-200 text-purple-700 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300 [&_.event-dot]:fill-purple-600",
                orange: "border-orange-300 bg-orange-200 text-orange-700 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-300 [&_.event-dot]:fill-orange-600",
                gray: "border-neutral-300 bg-neutral-200 text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 [&_.event-dot]:fill-neutral-600",

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

interface IProps extends HTMLAttributes<HTMLDivElement>, Omit<VariantProps<typeof calendarWeekEventCardVariants>, "color"> {
    event: IEvent;
    onShiftDeleted?: () => void;
    onShiftUpdated?: () => void;
}

export function EventBlock({ event, className, onShiftDeleted, onShiftUpdated }: IProps) {
    const { badgeVariant } = useCalendar();

    const start = parseISO(event.startDate);
    const end = parseISO(event.endDate);
    const durationInMinutes = differenceInMinutes(end, start);
    const heightInPixels = (durationInMinutes / 60) * 96 - 8;

    const color = (badgeVariant === "dot" ? `${event.color}-dot` : event.color) as VariantProps<typeof calendarWeekEventCardVariants>["color"];

    const calendarWeekEventCardClasses = cn(calendarWeekEventCardVariants({ color, className }), durationInMinutes < 35 && "py-0 justify-center");

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (e.currentTarget instanceof HTMLElement) e.currentTarget.click();
        }
    };

    return (
        <DraggableEvent event={event}>
            {/* Conditional wrapper based on entityType */}
            {useCalendar().entityType === 'booking' ? (
                <BookingDetailsDialog event={event} onBookingDeleted={onShiftDeleted} onBookingUpdated={onShiftUpdated}>
                    <div role="button" tabIndex={0} className={calendarWeekEventCardClasses} style={{ height: `${heightInPixels}px` }} onKeyDown={handleKeyDown}>
                        <div className="flex items-center gap-1.5 truncate">
                            {["mixed", "dot"].includes(badgeVariant) && (
                                <svg width="8" height="8" viewBox="0 0 8 8" className="event-dot shrink-0">
                                    <circle cx="4" cy="4" r="4" />
                                </svg>
                            )}

                            <p className="truncate font-semibold">{event.title}</p>
                        </div>

                        {durationInMinutes > 25 && (
                            <p>
                                {format(start, "h:mm a")} - {format(end, "h:mm a")}
                            </p>
                        )}
                    </div>
                </BookingDetailsDialog>
            ) : (
                <ShiftDetailsDialog event={event} onShiftDeleted={onShiftDeleted} onShiftUpdated={onShiftUpdated}>
                    <div role="button" tabIndex={0} className={calendarWeekEventCardClasses} style={{ height: `${heightInPixels}px` }} onKeyDown={handleKeyDown}>
                        <div className="flex items-center gap-1.5 truncate">
                            {["mixed", "dot"].includes(badgeVariant) && (
                                <svg width="8" height="8" viewBox="0 0 8 8" className="event-dot shrink-0">
                                    <circle cx="4" cy="4" r="4" />
                                </svg>
                            )}

                            <p className="truncate font-semibold">{event.title}</p>
                        </div>

                        {durationInMinutes > 25 && (
                            <p>
                                {format(start, "h:mm a")} - {format(end, "h:mm a")}
                            </p>
                        )}
                    </div>
                </ShiftDetailsDialog>
            )}
        </DraggableEvent>
    );
}
