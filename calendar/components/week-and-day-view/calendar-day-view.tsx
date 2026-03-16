import { useMemo } from "react";
import { Calendar, Clock, User } from "lucide-react";
import { parseISO, areIntervalsOverlapping, format, addMinutes } from "date-fns";

import { useCalendar } from "@/calendar/contexts/calendar-context";

import { ScrollArea } from "@/components/ui/scroll-area";
import { SingleCalendar } from "@/components/ui/single-calendar";

import { AddShiftDialog } from "@/calendar/components/dialogs/add-shift-dialog";
import { AddBookingDialog } from "@/calendar/components/dialogs/add-booking-dialog";
import { EventBlock } from "@/calendar/components/week-and-day-view/event-block";
import { DroppableTimeBlock } from "@/calendar/components/dnd/droppable-time-block";
import { CalendarTimeline } from "@/calendar/components/week-and-day-view/calendar-time-line";
import { DayViewMultiDayEventsRow } from "@/calendar/components/week-and-day-view/day-view-multi-day-events-row";

import { cn } from "@/lib/utils";
import { calculateEventLayout, isWorkingHour, getCurrentEvents, getVisibleHours, isDayClosed } from "@/calendar/helpers";

import type { IEvent } from "@/calendar/interfaces";

interface IProps {
  singleDayEvents: IEvent[];
  multiDayEvents: IEvent[];
  onShiftCreated?: () => void;
  onShiftDeleted?: () => void;
  onShiftUpdated?: () => void;
  onEventClick?: (event: IEvent) => void;
  hideAddButton?: boolean;
}

export function CalendarDayView({ singleDayEvents, multiDayEvents, onShiftCreated, onShiftDeleted, onShiftUpdated, onEventClick, hideAddButton }: IProps) {
  const { selectedDate, setSelectedDate, users, visibleHours, workingHours, entityType, showShiftGuidance } = useCalendar();

  const { hours, earliestEventHour, latestEventHour } = getVisibleHours(visibleHours, singleDayEvents);

  const dayEvents = singleDayEvents.filter(event => {
    const eventDate = parseISO(event.startDate);
    return (
      eventDate.getDate() === selectedDate.getDate() &&
      eventDate.getMonth() === selectedDate.getMonth() &&
      eventDate.getFullYear() === selectedDate.getFullYear()
    );
  });

  // Get events that are currently happening right now
  const interactiveEvents = dayEvents.filter(e => !e.metadata?.isShift);
  const currentEvents = getCurrentEvents(interactiveEvents);

  // If no events are happening right now, show all events for the selected day
  const displayEvents = currentEvents.length > 0 ? currentEvents : interactiveEvents;

  // Pre-calculate all overlapping shifts for the day to provide stable references
  const allShiftsMap = useMemo(() => {
    const map: Record<string, IEvent[]> = {};
    const shifts = dayEvents.filter(e => e.metadata?.isShift);

    hours.forEach(hour => {
      [0, 15, 30, 45].forEach(minute => {
        const slotStart = new Date(selectedDate);
        slotStart.setHours(hour, minute, 0, 0);
        const slotEnd = addMinutes(slotStart, 15);

        const overlapping = shifts.filter(shift => {
          const shiftStart = parseISO(shift.startDate);
          const shiftEnd = parseISO(shift.endDate);
          return areIntervalsOverlapping(
            { start: slotStart, end: slotEnd },
            { start: shiftStart, end: shiftEnd }
          );
        });
        
        map[`${hour}-${minute}`] = overlapping;
      });
    });
    return map;
  }, [selectedDate, dayEvents, hours]);

  return (
    <div className="flex">
      <div className="flex flex-1 flex-col">
        <div>
          <DayViewMultiDayEventsRow selectedDate={selectedDate} multiDayEvents={multiDayEvents} onShiftDeleted={onShiftDeleted} onShiftUpdated={onShiftUpdated} onEventClick={onEventClick} />

          {/* Day header */}
          <div className="relative z-20 flex border-b">
            <div className="w-18"></div>
            <span
              className={cn(
                "flex-1 border-l py-2 text-center text-xs font-medium text-muted-foreground",
                !isDayClosed(selectedDate, workingHours) && "bg-secondary"
              )}
              style={isDayClosed(selectedDate, workingHours) ? {
                backgroundImage: 'repeating-linear-gradient(-60deg, #E8E8E8 0 0.5px, transparent 0.5px 8px)',
                backgroundColor: '#f3f4f6'
              } : undefined}
            >
              {format(selectedDate, "EE")} <span className="font-semibold text-foreground">{format(selectedDate, "d")}</span>
            </span>
          </div>
        </div>

        <ScrollArea className="h-[800px]" type="always">
          <div className="flex">
            {/* Hours column */}
            <div className="relative w-18">
              {hours.map((hour, index) => (
                <div key={hour} className="relative" style={{ height: "96px" }}>
                  <div className="absolute -top-3 right-2 flex h-6 items-center">
                    {index !== 0 && <span className="text-xs text-muted-foreground">{format(new Date().setHours(hour, 0, 0, 0), "hh a")}</span>}
                  </div>
                </div>
              ))}
            </div>

            {/* Day grid */}
            <div
              className="relative flex-1 border-l"
              style={isDayClosed(selectedDate, workingHours) ? {
                backgroundImage: 'repeating-linear-gradient(-60deg, #E8E8E8 0 0.5px, transparent 0.5px 8px)',
                backgroundColor: '#f3f4f6'
              } : undefined}
            >
              <div className="relative">
                {hours.map((hour, index) => {
                  const isDisabled = !isWorkingHour(selectedDate, hour, workingHours);
                  const isPastDate = selectedDate < new Date(new Date().setHours(0, 0, 0, 0));

                  return (
                    <div
                      key={hour}
                      className="relative"
                      style={{
                        height: "96px",
                        ...(isDisabled ? {
                          backgroundImage: 'repeating-linear-gradient(-60deg, #E8E8E8 0 0.5px, transparent 0.5px 8px)',
                          backgroundColor: '#f3f4f6'
                        } : undefined)
                      }}
                    >
                      {index !== 0 && <div className="pointer-events-none absolute inset-x-0 top-0 border-b"></div>}

                      {(() => {
                        const shifts = allShiftsMap[`${hour}-0`] || [];
                        const firstShift = shifts[0];
                        return (
                          hideAddButton || isPastDate ? (
                            <div className="absolute inset-x-0 top-0 h-[24px]" />
                          ) : (
                            <DroppableTimeBlock date={selectedDate} hour={hour} minute={0}>
                              {entityType === 'booking' ? (
                                <AddBookingDialog 
                                  startDate={selectedDate} 
                                  startHour={hour} 
                                  startMinute={0} 
                                  initialShiftId={firstShift?.id?.toString()}
                                  initialStaffId={firstShift?.user?.id}
                                  initialLocationId={firstShift?.location?.id}
                                  availableShifts={shifts}
                                  onBookingCreated={onShiftCreated}
                                >
                                  <div className="absolute inset-x-0 top-0 h-[24px] cursor-pointer transition-colors hover:bg-accent" />
                                </AddBookingDialog>
                              ) : (
                                <AddShiftDialog startDate={selectedDate} startTime={{ hour, minute: 0 }} onShiftCreated={onShiftCreated}>
                                  <div className="absolute inset-x-0 top-0 h-[24px] cursor-pointer transition-colors hover:bg-accent" />
                                </AddShiftDialog>
                              )}
                            </DroppableTimeBlock>
                          )
                        );
                      })()}

                      {(() => {
                        const shifts = allShiftsMap[`${hour}-15`] || [];
                        const firstShift = shifts[0];
                        return (
                          hideAddButton || isPastDate ? (
                            <div className="absolute inset-x-0 top-[24px] h-[24px]" />
                          ) : (
                            <DroppableTimeBlock date={selectedDate} hour={hour} minute={15}>
                              {entityType === 'booking' ? (
                                <AddBookingDialog 
                                  startDate={selectedDate} 
                                  startHour={hour} 
                                  startMinute={15} 
                                  initialShiftId={firstShift?.id?.toString()}
                                  initialStaffId={firstShift?.user?.id}
                                  initialLocationId={firstShift?.location?.id}
                                  availableShifts={shifts}
                                  onBookingCreated={onShiftCreated}
                                >
                                  <div className="absolute inset-x-0 top-[24px] h-[24px] cursor-pointer transition-colors hover:bg-accent" />
                                </AddBookingDialog>
                              ) : (
                                <AddShiftDialog startDate={selectedDate} startTime={{ hour, minute: 15 }} onShiftCreated={onShiftCreated}>
                                  <div className="absolute inset-x-0 top-[24px] h-[24px] cursor-pointer transition-colors hover:bg-accent" />
                                </AddShiftDialog>
                              )}
                            </DroppableTimeBlock>
                          )
                        );
                      })()}

                      <div className="pointer-events-none absolute inset-x-0 top-1/2 border-b border-dashed"></div>

                      {(() => {
                        const shifts = allShiftsMap[`${hour}-30`] || [];
                        const firstShift = shifts[0];
                        return (
                          hideAddButton || isPastDate ? (
                            <div className="absolute inset-x-0 top-[48px] h-[24px]" />
                          ) : (
                            <DroppableTimeBlock date={selectedDate} hour={hour} minute={30}>
                              {entityType === 'booking' ? (
                                <AddBookingDialog 
                                  startDate={selectedDate} 
                                  startHour={hour} 
                                  startMinute={30} 
                                  initialShiftId={firstShift?.id?.toString()}
                                  initialStaffId={firstShift?.user?.id}
                                  initialLocationId={firstShift?.location?.id}
                                  availableShifts={shifts}
                                  onBookingCreated={onShiftCreated}
                                >
                                  <div className="absolute inset-x-0 top-[48px] h-[24px] cursor-pointer transition-colors hover:bg-accent" />
                                </AddBookingDialog>
                              ) : (
                                <AddShiftDialog startDate={selectedDate} startTime={{ hour, minute: 30 }} onShiftCreated={onShiftCreated}>
                                  <div className="absolute inset-x-0 top-[48px] h-[24px] cursor-pointer transition-colors hover:bg-accent" />
                                </AddShiftDialog>
                              )}
                            </DroppableTimeBlock>
                          )
                        );
                      })()}

                      {(() => {
                        const shifts = allShiftsMap[`${hour}-45`] || [];
                        const firstShift = shifts[0];
                        return (
                          hideAddButton || isPastDate ? (
                            <div className="absolute inset-x-0 top-[72px] h-[24px]" />
                          ) : (
                            <DroppableTimeBlock date={selectedDate} hour={hour} minute={45}>
                              {entityType === 'booking' ? (
                                <AddBookingDialog 
                                  startDate={selectedDate} 
                                  startHour={hour} 
                                  startMinute={45} 
                                  initialShiftId={firstShift?.id?.toString()}
                                  initialStaffId={firstShift?.user?.id}
                                  initialLocationId={firstShift?.location?.id}
                                  availableShifts={shifts}
                                  onBookingCreated={onShiftCreated}
                                >
                                  <div className="absolute inset-x-0 top-[72px] h-[24px] cursor-pointer transition-colors hover:bg-accent" />
                                </AddBookingDialog>
                              ) : (
                                <AddShiftDialog startDate={selectedDate} startTime={{ hour, minute: 45 }} onShiftCreated={onShiftCreated}>
                                  <div className="absolute inset-x-0 top-[72px] h-[24px] cursor-pointer transition-colors hover:bg-accent" />
                                </AddShiftDialog>
                              )}
                            </DroppableTimeBlock>
                          )
                        );
                      })()}
                    </div>
                  );
                })}

              {/* Render background shifts first (Z-index handled by order) */}
              {showShiftGuidance && (() => {
                const shiftEvents = singleDayEvents.filter(e => e.metadata?.isShift);
                const layoutMap = calculateEventLayout(shiftEvents, { from: earliestEventHour, to: latestEventHour });
                
                return shiftEvents.map(event => {
                  const style = layoutMap.get(event.id.toString()) || { top: '0%', width: '100%', left: '0%' };
                  return (
                    <div key={event.id} className="pointer-events-none absolute p-0" style={{ ...style, zIndex: 0 }}>
                      <EventBlock event={event} onShiftDeleted={onShiftDeleted} onShiftUpdated={onShiftUpdated} onEventClick={onEventClick} isReadOnly={hideAddButton} containerWidth={style.width} />
                    </div>
                  );
                });
              })()}

                {/* Group and render interactive events (bookings, breaks) */}
                {(() => {
                  const interactiveEvents = dayEvents.filter(e => !e.metadata?.isShift);
                  const layoutMap = calculateEventLayout(interactiveEvents, { from: earliestEventHour, to: latestEventHour });
                  
                  return interactiveEvents.map(event => {
                    const style = layoutMap.get(event.id.toString()) || { top: '0%', width: '100%', left: '0%' };
                    return (
                      <div key={event.id} className="absolute p-1" style={{ ...style, zIndex: 1 }}>
                        <EventBlock event={event} onShiftDeleted={onShiftDeleted} onShiftUpdated={onShiftUpdated} onEventClick={onEventClick} isReadOnly={hideAddButton} containerWidth={style.width} />
                      </div>
                    );
                  });
                })()}
              </div>

              <CalendarTimeline firstVisibleHour={earliestEventHour} lastVisibleHour={latestEventHour} />
            </div>
          </div>
        </ScrollArea>
      </div>

      <div className="hidden w-64 divide-y border-l md:block">
        <SingleCalendar
          className="mx-auto w-full"
          selected={selectedDate}
          onSelect={setSelectedDate}
          events={singleDayEvents}
        />

        <div className="flex-1 space-y-3">
          {displayEvents.length > 0 ? (
            <div className="flex items-start gap-2 px-4 pt-4">
              <span className="relative mt-[5px] flex size-2.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex size-2.5 rounded-full bg-green-600"></span>
              </span>

              <p className="text-sm font-semibold text-foreground">
                {currentEvents.length > 0 ? 'Happening now' : 'Today\'s events'}
              </p>
            </div>
          ) : (
            <p className="p-4 text-center text-sm italic text-muted-foreground">No appointments or consultations at the moment</p>
          )}

          {displayEvents.length > 0 && (
            <ScrollArea className="h-[422px] px-4" type="always">
              <div className="space-y-6 pb-4">
                {displayEvents.map(event => {
                  const user = users.find(user => user.id === event.user.id);

                  return (
                    <div
                      key={event.id}
                      className={cn("space-y-1.5", onEventClick && "cursor-pointer hover:opacity-75")}
                      onClick={() => onEventClick && onEventClick(event)}
                    >
                      <p className="line-clamp-2 text-sm font-semibold">{event.title}</p>

                      {user && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <User className="size-3.5" />
                          <span className="text-sm">{user.name}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Calendar className="size-3.5" />
                        <span className="text-sm">{format(new Date(), "MMM d, yyyy")}</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Clock className="size-3.5" />
                        <span className="text-sm">
                          {format(parseISO(event.startDate), "HH:mm")} - {format(parseISO(event.endDate), "HH:mm")}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>
    </div>
  );
}
