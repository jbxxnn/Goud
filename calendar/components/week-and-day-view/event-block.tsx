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

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
    onEventClick?: (event: IEvent) => void;
    isReadOnly?: boolean;
    containerWidth?: string; // Optional: width from layout calculation (e.g. "50%")
}



export function EventBlock({ event, className, onShiftDeleted, onShiftUpdated, onEventClick, isReadOnly, containerWidth }: IProps) {
    const { badgeVariant, entityType } = useCalendar();

    // Determine max dots based on width percentage
    const maxDots = (() => {
        if (!containerWidth) return 12;
        const widthVal = parseFloat(containerWidth);
        if (widthVal <= 25.1) return 2;
        if (widthVal <= 33.4) return 3;
        if (widthVal <= 50.1) return 5;
        return 12;
    })();

    const start = parseISO(event.startDate);
    const end = parseISO(event.endDate);
    const durationInMinutes = differenceInMinutes(end, start);
    const heightInPixels = (durationInMinutes / 60) * 96 - 8;

    const isHexColor = event.color.startsWith('#');
    const color = (isHexColor ? 'gray' : (badgeVariant === "dot" ? `${event.color}-dot` : event.color)) as VariantProps<typeof calendarWeekEventCardVariants>["color"];

    const isShift = event.metadata?.isShift;
    const isBreak = event.metadata?.isBreak;
    
    const calendarWeekEventCardClasses = cn(
        calendarWeekEventCardVariants({ color, className }), 
        durationInMinutes < 35 && "py-0 justify-center",
        isShift && "!bg-transparent !border-none !shadow-none opacity-50 pointer-events-none" // Background shifts use more visible pattern
    );

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (isShift) return;
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (e.currentTarget instanceof HTMLElement) e.currentTarget.click();
        }
    };

    const handleClick = (e: React.MouseEvent) => {
        if (isShift) return;
        if (onEventClick) {
            e.stopPropagation();
            onEventClick(event);
        }
    };

    const customStyle: React.CSSProperties = {
        height: `${heightInPixels}px`,
        zIndex: isShift ? 0 : 1, // Shifts behind bookings
    };

    if (isShift) {
        // Use a more pronounced diagonal pattern as requested
        const stripeColor = isHexColor ? event.color : '#94a3b8'; // SLATE-400 for better visibility
        customStyle.backgroundImage = `repeating-linear-gradient(-45deg, ${stripeColor}88 0 1.5px, transparent 1.5px 5px)`;
        customStyle.backgroundColor = 'transparent';
        customStyle.border = 'none';
        customStyle.boxShadow = 'none';
    } else if (isBreak) {
        if (isHexColor) {
            customStyle.backgroundColor = event.color;
            customStyle.borderColor = event.color;
            customStyle.color = '#ffffff'; // Solid colors need contrasting text
        } else {
            customStyle.backgroundColor = '#64748b'; // Solid slate-500
            customStyle.borderColor = '#475569';
            customStyle.color = '#ffffff';
        }
    } else if (isHexColor) {
        customStyle.backgroundColor = `${event.color}33`;
        customStyle.borderColor = event.color;
        customStyle.color = event.color;
    }

    const startTime = format(start, "HH:mm");
    const endTime = format(end, "HH:mm");

    // Process dots with truncation
    const combinedDots = [
        ...(event.metadata?.hasNotes ? [{ id: 'notes', color: 'black', title: 'Notes' }] : []),
        ...(event.metadata?.payment_status === 'unpaid' ? [{ id: 'unpaid', color: 'orange', title: 'Unpaid' }] : []),
        ...(event.metadata?.tags?.map((tag: any) => ({ id: tag.id, color: tag.color, title: tag.title })) || [])
    ].slice(0, maxDots);

    const BlockContent = (
        <TooltipProvider delayDuration={0} disableHoverableContent>
            <Tooltip delayDuration={0} disableHoverableContent>
                <TooltipTrigger asChild>
                    <div
                        role={isShift ? "presentation" : "button"}
                        tabIndex={isShift ? -1 : 0}
                        className={calendarWeekEventCardClasses}
                        style={customStyle}
                        onKeyDown={handleKeyDown}
                        onClick={onEventClick ? handleClick : undefined}
                        title=""
                    >
                        {!isShift && (
                            <div className="static">
                                {combinedDots.length > 0 && (
                                    <div className="absolute top-0 left-0.5 flex gap-0.5">
                                        {combinedDots.map((dot) => (
                                            <span 
                                                key={dot.id}
                                                className={cn(
                                                    "h-2 w-2 rounded-full shadow-sm",
                                                    dot.color === 'black' ? "bg-black" : ""
                                                )}
                                                style={dot.color !== 'black' ? { backgroundColor: dot.color } : {}}
                                                title={dot.title}
                                            />
                                        ))}
                                    </div>
                                )}
                                
                                {event.metadata?.booking_id && (event.metadata?.protocol_items_count > 0 || event.metadata?.has_master_checklist) && !event.metadata?.allProtocolTasksCompleted && (
                                    <span 
                                        className="absolute top-0 right-1 h-2 w-2 inline-block" 
                                        style={{ 
                                            clipPath: 'polygon(0 0, 100% 0, 100% 100%)',
                                            transform: 'rotate(-44.5deg)',
                                            backgroundColor: 'red'
                                        }} 
                                    />
                                )}
                                
                                <div className="flex items-center gap-1.5 truncate">
                                {["mixed", "dot"].includes(badgeVariant) && (
                                    <svg width="8" height="8" viewBox="0 0 8 8" className="event-dot shrink-0" style={isHexColor ? { fill: event.color } : undefined}>
                                        <circle cx="4" cy="4" r="4" />
                                    </svg>
                                )}
                                
                                <p className="truncate font-semibold" title="">
                                    {/* {event.metadata?.booking_number && <span className="mr-1 text-[10px] opacity-70">G-{event.metadata.booking_number}</span>} */}
                                    {event.title}
                                </p>
                            </div>
                            </div>
                        )}

                        {!isShift && durationInMinutes > 25 && (
                            <p>
                                {startTime} - {endTime}
                            </p>
                        )}
                    </div>
                </TooltipTrigger>
                <TooltipContent className="pointer-events-none">
                    <p>{isShift ? `Working Hours: ${startTime} - ${endTime}` : `${event.title} (${startTime} - ${endTime}) ${event.metadata?.booking_number ? `- G-${event.metadata.booking_number}` : ''}`}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );

    if (isShift) return BlockContent; // Return plain div for shifts, no dialogs

    return (
        <DraggableEvent event={event}>
            {/* Conditional wrapper based on entityType */}
            {entityType === 'booking' ? (
                onEventClick ? (
                    BlockContent
                ) : (
                    <BookingDetailsDialog event={event} onBookingDeleted={onShiftDeleted} onBookingUpdated={onShiftUpdated}>
                        {BlockContent}
                    </BookingDetailsDialog>
                )
            ) : (
                <ShiftDetailsDialog event={event} onShiftDeleted={onShiftDeleted} onShiftUpdated={onShiftUpdated} isReadOnly={isReadOnly}>
                    {BlockContent}
                </ShiftDetailsDialog>
            )}
        </DraggableEvent>
    );
}
