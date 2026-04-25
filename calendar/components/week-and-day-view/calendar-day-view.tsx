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
import { DayNoteDialog } from "@/calendar/components/dialogs/day-note-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { cn } from "@/lib/utils";
import { calculateEventLayout, isWorkingHour, getCurrentEvents, getVisibleHours, isDayClosed } from "@/calendar/helpers";

import type { IEvent } from "@/calendar/interfaces";

import { useTranslations } from "next-intl";
import type { Service } from "@/lib/types/booking";
import type { Location } from "@/lib/types/location_simple";
import type { Staff } from "@/lib/types/staff";
import type { Service as ShiftService } from "@/lib/types/service";

interface IProps {
  singleDayEvents: IEvent[];
  multiDayEvents: IEvent[];
  summaryShiftEvents?: IEvent[];
  showNotesRow?: boolean;
  onShiftCreated?: () => void;
  onShiftDeleted?: () => void;
  onShiftUpdated?: () => void;
  onEventClick?: (event: IEvent) => void;
  hideAddButton?: boolean;
  services?: Service[];
  bookingLocations?: Location[];
  bookingStaffMembers?: Staff[];
  shiftStaff?: Staff[];
  shiftLocations?: Location[];
  shiftServices?: ShiftService[];
}

interface AddBookingStripProps {
  topClassName: string;
  side: "left" | "right";
  date: Date;
  hour: number;
  minute: number;
  shifts: IEvent[];
  services: Service[];
  bookingLocations: Location[];
  bookingStaffMembers: Staff[];
  onBookingCreated?: () => void;
}

function AddBookingStrip({
  topClassName,
  side,
  date,
  hour,
  minute,
  shifts,
  services,
  bookingLocations,
  bookingStaffMembers,
  onBookingCreated,
}: AddBookingStripProps) {
  const firstShift = shifts[0];

  return (
    <AddBookingDialog
      services={services}
      locations={bookingLocations}
      staffMembers={bookingStaffMembers}
      startDate={date}
      startHour={hour}
      startMinute={minute}
      initialShiftId={firstShift?.id?.toString()}
      initialStaffId={firstShift?.user?.id}
      initialLocationId={firstShift?.location?.id}
      availableShifts={shifts}
      onBookingCreated={onBookingCreated}
    >
      <div
        className={cn(
          "absolute z-[3] h-[24px] w-3 cursor-pointer bg-background/70 opacity-0 transition-all hover:w-4 hover:bg-primary/10 hover:opacity-100 group-hover:opacity-100",
          side === "left"
            ? "left-0 border-r border-primary/20"
            : "right-0 border-l border-primary/20",
          topClassName
        )}
        title="Add booking"
      >
        <div className="flex h-full items-center justify-center text-[10px] font-semibold text-primary/70">
          +
        </div>
      </div>
    </AddBookingDialog>
  );
}

export function CalendarDayView({ singleDayEvents, multiDayEvents, summaryShiftEvents, showNotesRow = true, onShiftCreated, onShiftDeleted, onShiftUpdated, onEventClick, hideAddButton, services = [], bookingLocations = [], bookingStaffMembers = [], shiftStaff = [], shiftLocations = [], shiftServices = [] }: IProps) {
  const t = useTranslations('Calendar.view');
  const { 
    selectedDate, 
    setSelectedDate, 
    users, 
    visibleHours, 
    workingHours, 
    entityType, 
    showShiftGuidance, 
    dayNotes,
    locations,
    selectedLocationId
  } = useCalendar();

  const currentDayNote = useMemo(() => {
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    
    if (selectedLocationId === 'all') {
      // Find the note that applies to ALL locations
      return dayNotes.find(n => 
        n.date === dateStr && 
        n.location_ids.length === (locations?.length || 0)
      ) || null;
    }

    return dayNotes.find(n => n.date === dateStr) || null;
  }, [dayNotes, selectedDate, selectedLocationId, locations?.length]);

  const { hours, earliestEventHour, latestEventHour } = getVisibleHours(visibleHours, singleDayEvents);

  const dayEvents = useMemo(() => {
    const allEvents = [...singleDayEvents, ...multiDayEvents];
    return allEvents.filter(event => {
      const start = parseISO(event.startDate);
      const end = parseISO(event.endDate);
      const dayStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 0, 0, 0);
      const dayEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 23, 59, 59);
      
      return start <= dayEnd && end >= dayStart;
    });
  }, [singleDayEvents, multiDayEvents, selectedDate]);

  const staffOnDuty = useMemo(() => {
    const summarySource = summaryShiftEvents && summaryShiftEvents.length > 0
      ? summaryShiftEvents
      : dayEvents;
    const dayStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 0, 0, 0);
    const dayEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 23, 59, 59);
    const shifts = summarySource.filter(e => {
      if (!e.metadata?.isShift) return false;
      const start = parseISO(e.startDate);
      const end = parseISO(e.endDate);
      return start <= dayEnd && end >= dayStart;
    });
    
    // Filter by location if not 'all'
    const filteredShifts = selectedLocationId === 'all' 
      ? shifts 
      : shifts.filter(s => s.location?.id === selectedLocationId);

    // Show every shift as a badge to accurately represent staff across all locations
    // We deduplicate by user+location to avoid showing multiple badges for the same person at the same site
    const entryMap = new Map<string, any>();
    filteredShifts.forEach(s => {
      if (!s.user) return;
      
      const key = `${s.user.id}-${s.location?.id || 'no-loc'}`;
      if (!entryMap.has(key)) {
        entryMap.set(key, {
          id: `${s.id}-${key}`,
          name: s.user.name,
          color: s.color,
          userId: s.user.id,
          locationId: s.location?.id || 'no-loc',
          startTime: s.startDate,
          endTime: s.endDate
        });
      } else {
        const existing = entryMap.get(key);
        if (s.startDate < existing.startTime) existing.startTime = s.startDate;
        if (s.endDate > existing.endTime) existing.endTime = s.endDate;
      }
    });

    return Array.from(entryMap.values()).sort((a, b) => 
      a.locationId.localeCompare(b.locationId)
    );
  }, [dayEvents, summaryShiftEvents, selectedDate, selectedLocationId]);

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

          {showNotesRow && (
            <div className="relative z-10 flex border-b bg-muted/5">
              <div className="flex w-18 items-center justify-end pr-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/40 translate-y-[1px]">
                {t('notes')}
              </div>
              <DayNoteDialog date={selectedDate}>
                <div 
                  className="flex-1 border-l py-2 px-3 cursor-pointer hover:bg-accent/5 transition-colors group flex items-start justify-start min-h-[44px]"
                >
                  <div className="flex flex-col gap-2 w-full">
                    {staffOnDuty.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-1">
                        {staffOnDuty.map(staff => (
                          <div 
                            key={staff.id} 
                            className="flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[10px] font-semibold truncate max-w-[180px]"
                            style={{
                              backgroundColor: staff.color ? `${staff.color}33` : '#f3f4f6',
                              borderColor: staff.color || '#e5e7eb',
                              color: staff.color || '#374151'
                            }}
                          >
                            <div className="w-1.5 h-1.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: staff.color }} />
                            {staff.name}
                            <span className="ml-0.5 opacity-70 font-normal lowercase">
                              ({format(parseISO(staff.startTime), "HH:mm")}-{format(parseISO(staff.endTime), "HH:mm")})
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {currentDayNote ? (
                      <TooltipProvider delayDuration={0} disableHoverableContent>
                        <Tooltip delayDuration={0} disableHoverableContent>
                          <TooltipTrigger asChild>
                            <div className="bg-gray-200 text-black rounded-md px-3 py-2 shadow-sm border border-black w-full">
                              <p className="text-[11px] font-bold leading-relaxed break-all line-clamp-2">
                                {currentDayNote.content.length > 30 ? `${currentDayNote.content.slice(0, 30)}...` : currentDayNote.content}
                              </p>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="pointer-events-none" sideOffset={8}>
                            <p className="max-w-[200px] break-all">{currentDayNote.content}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <span className="text-[11px] text-muted-foreground/30 italic group-hover:text-muted-foreground/50 transition-all font-medium flex items-center justify-center w-full h-[32px]">
                        {t('noNotes')}
                      </span>
                    )}
                  </div>
                </div>
              </DayNoteDialog>
            </div>
          )}
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
                        return (
                          hideAddButton || isPastDate ? (
                            <div className="absolute inset-x-0 top-0 h-[24px]" />
                          ) : (
                            <DroppableTimeBlock date={selectedDate} hour={hour} minute={0}>
                              {entityType === 'booking' ? (
                                <>
                                  <AddBookingDialog 
                                    services={services}
                                    locations={bookingLocations}
                                    staffMembers={bookingStaffMembers}
                                    startDate={selectedDate} 
                                    startHour={hour} 
                                    startMinute={0} 
                                    initialShiftId={shifts[0]?.id?.toString()}
                                    initialStaffId={shifts[0]?.user?.id}
                                    initialLocationId={shifts[0]?.location?.id}
                                    availableShifts={shifts}
                                    onBookingCreated={onShiftCreated}
                                  >
                                    <div className="absolute inset-x-0 top-0 h-[24px] cursor-pointer transition-colors hover:bg-accent" />
                                  </AddBookingDialog>
                                  <AddBookingStrip
                                    topClassName="top-0"
                                    side="left"
                                    date={selectedDate}
                                    hour={hour}
                                    minute={0}
                                    shifts={shifts}
                                    services={services}
                                    bookingLocations={bookingLocations}
                                    bookingStaffMembers={bookingStaffMembers}
                                    onBookingCreated={onShiftCreated}
                                  />
                                  <AddBookingStrip
                                    topClassName="top-0"
                                    side="right"
                                    date={selectedDate}
                                    hour={hour}
                                    minute={0}
                                    shifts={shifts}
                                    services={services}
                                    bookingLocations={bookingLocations}
                                    bookingStaffMembers={bookingStaffMembers}
                                    onBookingCreated={onShiftCreated}
                                  />
                                </>
                              ) : (
                                <AddShiftDialog startDate={selectedDate} startTime={{ hour, minute: 0 }} onShiftCreated={onShiftCreated} staff={shiftStaff} locations={shiftLocations} services={shiftServices}>
                                  <div className="absolute inset-x-0 top-0 h-[24px] cursor-pointer transition-colors hover:bg-accent" />
                                </AddShiftDialog>
                              )}
                            </DroppableTimeBlock>
                          )
                        );
                      })()}

                      {(() => {
                        const shifts = allShiftsMap[`${hour}-15`] || [];
                        return (
                          hideAddButton || isPastDate ? (
                            <div className="absolute inset-x-0 top-[24px] h-[24px]" />
                          ) : (
                            <DroppableTimeBlock date={selectedDate} hour={hour} minute={15}>
                              {entityType === 'booking' ? (
                                <>
                                  <AddBookingDialog 
                                    services={services}
                                    locations={bookingLocations}
                                    staffMembers={bookingStaffMembers}
                                    startDate={selectedDate} 
                                    startHour={hour} 
                                    startMinute={15} 
                                    initialShiftId={shifts[0]?.id?.toString()}
                                    initialStaffId={shifts[0]?.user?.id}
                                    initialLocationId={shifts[0]?.location?.id}
                                    availableShifts={shifts}
                                    onBookingCreated={onShiftCreated}
                                  >
                                    <div className="absolute inset-x-0 top-[24px] h-[24px] cursor-pointer transition-colors hover:bg-accent" />
                                  </AddBookingDialog>
                                  <AddBookingStrip
                                    topClassName="top-[24px]"
                                    side="left"
                                    date={selectedDate}
                                    hour={hour}
                                    minute={15}
                                    shifts={shifts}
                                    services={services}
                                    bookingLocations={bookingLocations}
                                    bookingStaffMembers={bookingStaffMembers}
                                    onBookingCreated={onShiftCreated}
                                  />
                                  <AddBookingStrip
                                    topClassName="top-[24px]"
                                    side="right"
                                    date={selectedDate}
                                    hour={hour}
                                    minute={15}
                                    shifts={shifts}
                                    services={services}
                                    bookingLocations={bookingLocations}
                                    bookingStaffMembers={bookingStaffMembers}
                                    onBookingCreated={onShiftCreated}
                                  />
                                </>
                              ) : (
                                <AddShiftDialog startDate={selectedDate} startTime={{ hour, minute: 15 }} onShiftCreated={onShiftCreated} staff={shiftStaff} locations={shiftLocations} services={shiftServices}>
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
                        return (
                          hideAddButton || isPastDate ? (
                            <div className="absolute inset-x-0 top-[48px] h-[24px]" />
                          ) : (
                            <DroppableTimeBlock date={selectedDate} hour={hour} minute={30}>
                              {entityType === 'booking' ? (
                                <>
                                  <AddBookingDialog 
                                    services={services}
                                    locations={bookingLocations}
                                    staffMembers={bookingStaffMembers}
                                    startDate={selectedDate} 
                                    startHour={hour} 
                                    startMinute={30} 
                                    initialShiftId={shifts[0]?.id?.toString()}
                                    initialStaffId={shifts[0]?.user?.id}
                                    initialLocationId={shifts[0]?.location?.id}
                                    availableShifts={shifts}
                                    onBookingCreated={onShiftCreated}
                                  >
                                    <div className="absolute inset-x-0 top-[48px] h-[24px] cursor-pointer transition-colors hover:bg-accent" />
                                  </AddBookingDialog>
                                  <AddBookingStrip
                                    topClassName="top-[48px]"
                                    side="left"
                                    date={selectedDate}
                                    hour={hour}
                                    minute={30}
                                    shifts={shifts}
                                    services={services}
                                    bookingLocations={bookingLocations}
                                    bookingStaffMembers={bookingStaffMembers}
                                    onBookingCreated={onShiftCreated}
                                  />
                                  <AddBookingStrip
                                    topClassName="top-[48px]"
                                    side="right"
                                    date={selectedDate}
                                    hour={hour}
                                    minute={30}
                                    shifts={shifts}
                                    services={services}
                                    bookingLocations={bookingLocations}
                                    bookingStaffMembers={bookingStaffMembers}
                                    onBookingCreated={onShiftCreated}
                                  />
                                </>
                              ) : (
                                <AddShiftDialog startDate={selectedDate} startTime={{ hour, minute: 30 }} onShiftCreated={onShiftCreated} staff={shiftStaff} locations={shiftLocations} services={shiftServices}>
                                  <div className="absolute inset-x-0 top-[48px] h-[24px] cursor-pointer transition-colors hover:bg-accent" />
                                </AddShiftDialog>
                              )}
                            </DroppableTimeBlock>
                          )
                        );
                      })()}

                      {(() => {
                        const shifts = allShiftsMap[`${hour}-45`] || [];
                        return (
                          hideAddButton || isPastDate ? (
                            <div className="absolute inset-x-0 top-[72px] h-[24px]" />
                          ) : (
                            <DroppableTimeBlock date={selectedDate} hour={hour} minute={45}>
                              {entityType === 'booking' ? (
                                <>
                                  <AddBookingDialog 
                                    services={services}
                                    locations={bookingLocations}
                                    staffMembers={bookingStaffMembers}
                                    startDate={selectedDate} 
                                    startHour={hour} 
                                    startMinute={45} 
                                    initialShiftId={shifts[0]?.id?.toString()}
                                    initialStaffId={shifts[0]?.user?.id}
                                    initialLocationId={shifts[0]?.location?.id}
                                    availableShifts={shifts}
                                    onBookingCreated={onShiftCreated}
                                  >
                                    <div className="absolute inset-x-0 top-[72px] h-[24px] cursor-pointer transition-colors hover:bg-accent" />
                                  </AddBookingDialog>
                                  <AddBookingStrip
                                    topClassName="top-[72px]"
                                    side="left"
                                    date={selectedDate}
                                    hour={hour}
                                    minute={45}
                                    shifts={shifts}
                                    services={services}
                                    bookingLocations={bookingLocations}
                                    bookingStaffMembers={bookingStaffMembers}
                                    onBookingCreated={onShiftCreated}
                                  />
                                  <AddBookingStrip
                                    topClassName="top-[72px]"
                                    side="right"
                                    date={selectedDate}
                                    hour={hour}
                                    minute={45}
                                    shifts={shifts}
                                    services={services}
                                    bookingLocations={bookingLocations}
                                    bookingStaffMembers={bookingStaffMembers}
                                    onBookingCreated={onShiftCreated}
                                  />
                                </>
                              ) : (
                                <AddShiftDialog startDate={selectedDate} startTime={{ hour, minute: 45 }} onShiftCreated={onShiftCreated} staff={shiftStaff} locations={shiftLocations} services={shiftServices}>
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
                      <div key={event.id} className="absolute p-1 pr-4" style={{ ...style, zIndex: 1 }}>
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
