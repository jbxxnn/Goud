import { useMemo } from "react";
import { startOfWeek, addDays, format, parseISO, isSameDay, areIntervalsOverlapping, addMinutes } from "date-fns";

import { useCalendar } from "@/calendar/contexts/calendar-context";

import { ScrollArea } from "@/components/ui/scroll-area";

import { AddShiftDialog } from "@/calendar/components/dialogs/add-shift-dialog";
import { AddBookingDialog } from "@/calendar/components/dialogs/add-booking-dialog";
import { EventBlock } from "@/calendar/components/week-and-day-view/event-block";
import { DroppableTimeBlock } from "@/calendar/components/dnd/droppable-time-block";
import { CalendarTimeline } from "@/calendar/components/week-and-day-view/calendar-time-line";
import { WeekViewMultiDayEventsRow } from "@/calendar/components/week-and-day-view/week-view-multi-day-events-row";

import { cn } from "@/lib/utils";
import { calculateEventLayout, isWorkingHour, getVisibleHours, isDayClosed } from "@/calendar/helpers";

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

export function CalendarWeekView({ singleDayEvents, multiDayEvents, onShiftCreated, onShiftDeleted, onShiftUpdated, onEventClick, hideAddButton }: IProps) {
  const { selectedDate, workingHours, visibleHours, entityType, showShiftGuidance } = useCalendar();

  const { hours, earliestEventHour, latestEventHour } = getVisibleHours(visibleHours, singleDayEvents);

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = useMemo(() => 
    Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
  [weekStart]);

  const visibleDays = useMemo(() => 
    weekDays.map((day, index) => ({ day, index })).filter(({ day }) => !isDayClosed(day, workingHours)),
  [weekDays, workingHours]);

  const gridStyle = {
    gridTemplateColumns: `repeat(${visibleDays.length}, minmax(0, 1fr))`
  };

  // Pre-calculate all overlapping shifts for the entire week to provide stable references
  const allShiftsMap = useMemo(() => {
    const map: Record<string, IEvent[]> = {};
    weekDays.forEach((day, dayIndex) => {
      const dayEvents = singleDayEvents.filter(event => 
        isSameDay(parseISO(event.startDate), day) || 
        isSameDay(parseISO(event.endDate), day)
      );
      const shifts = dayEvents.filter(e => e.metadata?.isShift);

      hours.forEach(hour => {
        [0, 15, 30, 45].forEach(minute => {
          const slotStart = new Date(day);
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
          
          map[`${dayIndex}-${hour}-${minute}`] = overlapping;
        });
      });
    });
    return map;
  }, [weekDays, singleDayEvents, hours]);

  return (
    <>
      <div className="flex flex-col">
        <div>
          <WeekViewMultiDayEventsRow selectedDate={selectedDate} multiDayEvents={multiDayEvents} onShiftDeleted={onShiftDeleted} onShiftUpdated={onShiftUpdated} onEventClick={onEventClick} />

          {/* Week header */}
          <div className="relative z-20 flex border-b">
            <div className="w-18"></div>
            <div className="grid flex-1 divide-x border-l" style={gridStyle}>
              {visibleDays.map(({ day, index }) => {
                const isClosed = isDayClosed(day, workingHours);

                return (
                  <span
                    key={index}
                    className={cn(
                      "py-2 text-center text-xs font-medium text-muted-foreground",
                      !isClosed && "bg-secondary"
                    )}
                    style={isClosed ? {
                      backgroundImage: 'repeating-linear-gradient(-60deg, #E8E8E8 0 0.5px, transparent 0.5px 8px)',
                      backgroundColor: '#f3f4f6'
                    } : undefined}
                  >
                    {format(day, "EE")} <span className="ml-1 font-semibold text-foreground">{format(day, "d")}</span>
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        <ScrollArea className="h-[736px]" type="always">
          <div className="flex overflow-hidden">
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

            {/* Week grid */}
            <div className="relative flex-1 border-l">
              <div className="grid divide-x" style={gridStyle}>
                {visibleDays.map(({ day, index: dayIndex }) => {
                  const isClosed = isDayClosed(day, workingHours);

                  const dayEvents = singleDayEvents.filter(event => isSameDay(parseISO(event.startDate), day) || isSameDay(parseISO(event.endDate), day));
                  const isPastDate = day < new Date(new Date().setHours(0, 0, 0, 0));

                  return (
                    <div
                      key={dayIndex}
                      className="relative"
                      style={isClosed ? {
                        backgroundImage: 'repeating-linear-gradient(-60deg, #E8E8E8 0 0.5px, transparent 0.5px 8px)',
                        // backgroundColor: 'hsl(var(--muted) / 0.1)'
                        backgroundColor: '#f3f4f6'
                      } : undefined}
                    >
                      {hours.map((hour, index) => {
                        const isDisabled = !isWorkingHour(day, hour, workingHours);

                        return (
                          <div
                            key={hour}
                            className="relative"
                            style={{
                              height: "96px",
                              ...(isDisabled ? {
                                backgroundImage: 'repeating-linear-gradient(-60deg, #aaaaaa 0 0.5px, transparent 0.5px 3px)',
                                // backgroundColor: 'hsl(var(--muted) / 0.1)'
                                backgroundColor: '#f3f4f6'
                              } : undefined)
                            }}
                          >
                            {index !== 0 && <div className="pointer-events-none absolute inset-x-0 top-0 border-b border-[#E8E8E8]"></div>}

                          {(() => {
                            const shifts = allShiftsMap[`${dayIndex}-${hour}-0`] || [];
                            const firstShift = shifts[0];
                            return (
                              hideAddButton || isPastDate ? (
                                <div className="absolute inset-x-0 top-0 h-[24px]" />
                              ) : (
                                <DroppableTimeBlock date={day} hour={hour} minute={0}>
                                  {entityType === 'booking' ? (
                                    <AddBookingDialog 
                                      startDate={day} 
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
                                    <AddShiftDialog startDate={day} startTime={{ hour, minute: 0 }} onShiftCreated={onShiftCreated}>
                                      <div className="absolute inset-x-0 top-0 h-[24px] cursor-pointer transition-colors hover:bg-accent" />
                                    </AddShiftDialog>
                                  )}
                                </DroppableTimeBlock>
                              )
                            );
                          })()}

                          {(() => {
                            const shifts = allShiftsMap[`${dayIndex}-${hour}-15`] || [];
                            const firstShift = shifts[0];
                            return (
                              hideAddButton || isPastDate ? (
                                <div className="absolute inset-x-0 top-[24px] h-[24px]" />
                              ) : (
                                <DroppableTimeBlock date={day} hour={hour} minute={15}>
                                  {entityType === 'booking' ? (
                                    <AddBookingDialog 
                                      startDate={day} 
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
                                    <AddShiftDialog startDate={day} startTime={{ hour, minute: 15 }} onShiftCreated={onShiftCreated}>
                                      <div className="absolute inset-x-0 top-[24px] h-[24px] cursor-pointer transition-colors hover:bg-accent" />
                                    </AddShiftDialog>
                                  )}
                                </DroppableTimeBlock>
                              )
                            );
                          })()}

                          <div className="pointer-events-none absolute inset-x-0 top-1/2 border-b border-dashed"></div>

                          {(() => {
                            const shifts = allShiftsMap[`${dayIndex}-${hour}-30`] || [];
                            const firstShift = shifts[0];
                            return (
                              hideAddButton || isPastDate ? (
                                <div className="absolute inset-x-0 top-[48px] h-[24px]" />
                              ) : (
                                <DroppableTimeBlock date={day} hour={hour} minute={30}>
                                  {entityType === 'booking' ? (
                                    <AddBookingDialog 
                                      startDate={day} 
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
                                    <AddShiftDialog startDate={day} startTime={{ hour, minute: 30 }} onShiftCreated={onShiftCreated}>
                                      <div className="absolute inset-x-0 top-[48px] h-[24px] cursor-pointer transition-colors hover:bg-accent" />
                                    </AddShiftDialog>
                                  )}
                                </DroppableTimeBlock>
                              )
                            );
                          })()}

                          {(() => {
                            const shifts = allShiftsMap[`${dayIndex}-${hour}-45`] || [];
                            const firstShift = shifts[0];
                            return (
                              hideAddButton || isPastDate ? (
                                <div className="absolute inset-x-0 top-[72px] h-[24px]" />
                              ) : (
                                <DroppableTimeBlock date={day} hour={hour} minute={45}>
                                  {entityType === 'booking' ? (
                                    <AddBookingDialog 
                                      startDate={day} 
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
                                    <AddShiftDialog startDate={day} startTime={{ hour, minute: 45 }} onShiftCreated={onShiftCreated}>
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
                        const shiftEvents = dayEvents.filter(e => e.metadata?.isShift);
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
                  );
                })}
              </div>

              <CalendarTimeline firstVisibleHour={earliestEventHour} lastVisibleHour={latestEventHour} />
            </div>
          </div>
        </ScrollArea>
      </div>
    </>
  );
}
