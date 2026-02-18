import { cva } from "class-variance-authority";
import { endOfDay, format, isSameDay, parseISO, startOfDay } from "date-fns";

import { useCalendar } from "@/calendar/contexts/calendar-context";

import { DraggableEvent } from "@/calendar/components/dnd/draggable-event";
import { ShiftDetailsDialog } from "@/calendar/components/dialogs/shift-details-dialog";
import { BookingDetailsDialog } from "@/calendar/components/dialogs/booking-details-dialog";

import { cn } from "@/lib/utils";

import type { IEvent } from "@/calendar/interfaces";
import type { VariantProps } from "class-variance-authority";

const eventBadgeVariants = cva(
    "mx-1 flex size-auto h-6.5 select-none items-center justify-between gap-1.5 truncate whitespace-nowrap rounded-md border px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
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
                gray: "border-neutral-300 bg-neutral-200 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 [&_.event-dot]:fill-neutral-600",

                // Dot variants
                "blue-dot": "bg-neutral-50 dark:bg-neutral-900 [&_.event-dot]:fill-blue-600",
                "green-dot": "bg-neutral-50 dark:bg-neutral-900 [&_.event-dot]:fill-green-600",
                "red-dot": "bg-neutral-50 dark:bg-neutral-900 [&_.event-dot]:fill-red-600",
                "yellow-dot": "bg-neutral-50 dark:bg-neutral-900 [&_.event-dot]:fill-yellow-600",
                "purple-dot": "bg-neutral-50 dark:bg-neutral-900 [&_.event-dot]:fill-purple-600",
                "orange-dot": "bg-neutral-50 dark:bg-neutral-900 [&_.event-dot]:fill-orange-600",
                "gray-dot": "bg-neutral-50 dark:bg-neutral-900 [&_.event-dot]:fill-neutral-600",
            },
            multiDayPosition: {
                first: "relative z-10 mr-0 w-[calc(100%_-_3px)] rounded-r-none border-r-0 [&>span]:mr-2.5",
                middle: "relative z-10 mx-0 w-[calc(100%_+_1px)] rounded-none border-x-0",
                last: "ml-0 rounded-l-none border-l-0",
                none: "",
            },
        },
        defaultVariants: {
            color: "blue-dot",
        },
    }
);

interface IProps extends Omit<VariantProps<typeof eventBadgeVariants>, "color" | "multiDayPosition"> {
    event: IEvent;
    cellDate: Date;
    eventCurrentDay?: number;
    eventTotalDays?: number;
    className?: string;
    position?: "first" | "middle" | "last" | "none";
    onShiftDeleted?: () => void;
    onShiftUpdated?: () => void;
    onEventClick?: (event: IEvent) => void;
    isReadOnly?: boolean;
}

export function MonthEventBadge({ event, cellDate, eventCurrentDay, eventTotalDays, className, position: propPosition, onShiftDeleted, onShiftUpdated, onEventClick, isReadOnly }: IProps) {
    const { badgeVariant, entityType } = useCalendar();

    const itemStart = startOfDay(parseISO(event.startDate));
    const itemEnd = endOfDay(parseISO(event.endDate));

    if (cellDate < itemStart || cellDate > itemEnd) return null;

    let position: "first" | "middle" | "last" | "none" | undefined;

    if (propPosition) {
        position = propPosition;
    } else if (eventCurrentDay && eventTotalDays) {
        position = "none";
    } else if (isSameDay(itemStart, itemEnd)) {
        position = "none";
    } else if (isSameDay(cellDate, itemStart)) {
        position = "first";
    } else if (isSameDay(cellDate, itemEnd)) {
        position = "last";
    } else {
        position = "middle";
    }

    const renderBadgeText = ["first", "none"].includes(position);

    const color = (badgeVariant === "dot" ? `${event.color}-dot` : event.color) as VariantProps<typeof eventBadgeVariants>["color"];

    const eventBadgeClasses = cn(eventBadgeVariants({ color, multiDayPosition: position, className }));

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (e.currentTarget instanceof HTMLElement) e.currentTarget.click();
        }
    };

    const handleClick = (e: React.MouseEvent) => {
        if (onEventClick) {
            e.stopPropagation();
            onEventClick(event);
        }
    };

    const BadgeContent = (
        <div role="button" tabIndex={0} className={eventBadgeClasses} onKeyDown={handleKeyDown} onClick={onEventClick ? handleClick : undefined}>
            <div className="flex items-center gap-1.5 truncate">
                {!["middle", "last"].includes(position) && ["mixed", "dot"].includes(badgeVariant) && (
                    <svg width="8" height="8" viewBox="0 0 8 8" className="event-dot shrink-0">
                        <circle cx="4" cy="4" r="4" />
                    </svg>
                )}

                {renderBadgeText && (
                    <p className="flex-1 truncate font-semibold">
                        {eventCurrentDay && (
                            <span className="text-xs">
                                Day {eventCurrentDay} of {eventTotalDays} •{" "}
                            </span>
                        )}
                        {event.title}
                    </p>
                )}
            </div>

            {renderBadgeText && <span>{format(new Date(event.startDate), "h:mm a")}</span>}
        </div>
    );

    return (
        <DraggableEvent event={event}>
            {entityType === 'booking' ? (
                onEventClick ? (
                    BadgeContent
                ) : (
                    <BookingDetailsDialog event={event} onBookingDeleted={onShiftDeleted} onBookingUpdated={onShiftUpdated}>
                        {BadgeContent}
                    </BookingDetailsDialog>
                )
            ) : (
                <ShiftDetailsDialog event={event} onShiftDeleted={onShiftDeleted} onShiftUpdated={onShiftUpdated} isReadOnly={isReadOnly}>
                    {BadgeContent}
                </ShiftDetailsDialog>
            )}
        </DraggableEvent>
    );
}
