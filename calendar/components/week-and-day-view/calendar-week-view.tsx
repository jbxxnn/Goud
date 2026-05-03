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
import { DayNoteDialog } from "@/calendar/components/dialogs/day-note-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { cn } from "@/lib/utils";
import { calculateEventLayout, isWorkingHour, getVisibleHours, isDayClosed } from "@/calendar/helpers";

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
          "absolute z-[3] h-[24px] w-3 cursor-pointer bg-secondary opacity-0 transition-all hover:w-4 hover:bg-primary/10 hover:opacity-100 group-hover:opacity-100",
          side === "left"
            ? "left-0 border-r border-primary"
            : "right-0 border-l border-primary",
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

export function CalendarWeekView({ singleDayEvents, multiDayEvents, summaryShiftEvents, showNotesRow = true, onShiftCreated, onShiftDeleted, onShiftUpdated, onEventClick, hideAddButton, services = [], bookingLocations = [], bookingStaffMembers = [], shiftStaff = [], shiftLocations = [], shiftServices = [] }: IProps) {
  const t = useTranslations('Calendar.view');
  const { selectedDate, workingHours, visibleHours, entityType, showShiftGuidance, dayNotes, locations, selectedLocationId } = useCalendar();

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
      <div className="flex h-full min-h-0 flex-col">
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

          {showNotesRow && (
            <div className="relative z-10 flex border-b bg-muted/5">
              <div className="flex w-18 items-center justify-end pr-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/40 translate-y-[1px]">
                {t('notes')}
              </div>
              <div className="grid flex-1 divide-x border-l" style={gridStyle}>
                {visibleDays.map(({ day, index }) => {
                  const dateStr = format(day, "yyyy-MM-dd");
                  let note;

                  if (selectedLocationId === 'all') {
                    note = dayNotes.find(n => 
                      n.date === dateStr && 
                      n.location_ids.length === (locations?.length || 0)
                    );
                  } else {
                    note = dayNotes.find(n => n.date === dateStr);
                  }

                  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0);
                  const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59);

                  const summarySource = summaryShiftEvents && summaryShiftEvents.length > 0
                    ? summaryShiftEvents
                    : [...singleDayEvents, ...multiDayEvents];

                  const dayShifts = summarySource.filter(e => {
                    if (!e.metadata?.isShift) return false;
                    const start = parseISO(e.startDate);
                    const end = parseISO(e.endDate);
                    return start <= dayEnd && end >= dayStart;
                  });
                  
                  const filteredShifts = selectedLocationId === 'all'
                    ? dayShifts
                    : dayShifts.filter(s => s.location?.id === selectedLocationId);
                  
                  const entryMap = new Map<string, any>();
                  filteredShifts.forEach(s => {
                    if (!s.user) return;
                    
                    const key = `${s.user.id}-${s.location?.id || 'no-loc'}`;
                    if (!entryMap.has(key)) {
                      entryMap.set(key, {
                        id: `${s.id}-${key}`,
                        name: s.user.name,
                        color: s.color,
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
                  const dayStaff = Array.from(entryMap.values()).sort((a, b) => 
                    a.locationId.localeCompare(b.locationId)
                  );

                  return (
                    <DayNoteDialog key={index} date={day}>
                      <div
                        className="py-1.5 px-2 cursor-pointer hover:bg-accent/5 transition-colors group text-center min-h-[44px] flex flex-col items-center justify-center gap-1 overflow-hidden"
                      >
                        {dayStaff.length > 0 && (
                          <div className="flex flex-wrap gap-0.5 justify-center mb-0.5 max-w-full">
                            {dayStaff.map(staff => (
                              <div 
                                key={staff.id} 
                                className={cn(
                                  "flex items-center gap-0.5 px-1 py-0 rounded border text-[8px] font-bold uppercase truncate",
                                  selectedLocationId === 'all' ? "max-w-[60px]" : "max-w-[120px]"
                                )}
                                style={{
                                  backgroundColor: staff.color ? `${staff.color}22` : '#f3f4f6',
                                  borderColor: staff.color || '#e5e7eb',
                                  color: staff.color || '#374151'
                                }}
                                title={selectedLocationId === 'all' 
                                  ? staff.name 
                                  : `${staff.name} (${format(parseISO(staff.startTime), "HH:mm")} - ${format(parseISO(staff.endTime), "HH:mm")})`}
                              >
                                <div className="w-1 h-1 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: staff.color }} />
                                {staff.name.split(' ')[0]}
                                {selectedLocationId !== 'all' && (
                                  <span className="ml-0.5 opacity-70 font-normal lowercase">
                                    ({format(parseISO(staff.startTime), "HH:mm")}-{format(parseISO(staff.endTime), "HH:mm")})
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {note ? (
                          <TooltipProvider delayDuration={0} disableHoverableContent>
                            <Tooltip delayDuration={0} disableHoverableContent>
                              <TooltipTrigger asChild>
                                <div className="bg-gray-200 text-black rounded-md px-2 py-1 shadow-sm border border-gray-400 w-full overflow-hidden">
                                  <p className="text-[10px] font-bold leading-tight line-clamp-2 break-all text-left">
                                    {note.content.length > 30 ? `${note.content.slice(0, 30)}...` : note.content}
                                  </p>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="pointer-events-none" sideOffset={8}>
                                <p className="max-w-[150px] break-all">{note.content}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/25 italic group-hover:text-muted-foreground/40 transition-all font-medium truncate">
                            {t('noNotes')}
                          </span>
                        )}
                      </div>
                    </DayNoteDialog>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <ScrollArea className="h-full" type="always">
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
                            return (
                              hideAddButton || isPastDate ? (
                                <div className="absolute inset-x-0 top-0 h-[24px]" />
                              ) : (
                                <DroppableTimeBlock date={day} hour={hour} minute={0}>
                                  {entityType === 'booking' ? (
                                    <>
                                      <AddBookingDialog 
                                        services={services}
                                        locations={bookingLocations}
                                        staffMembers={bookingStaffMembers}
                                        startDate={day} 
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
                                        date={day}
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
                                        date={day}
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
                                    <AddShiftDialog startDate={day} startTime={{ hour, minute: 0 }} onShiftCreated={onShiftCreated} staff={shiftStaff} locations={shiftLocations} services={shiftServices}>
                                      <div className="absolute inset-x-0 top-0 h-[24px] cursor-pointer transition-colors hover:bg-accent" />
                                    </AddShiftDialog>
                                  )}
                                </DroppableTimeBlock>
                              )
                            );
                          })()}

                          {(() => {
                            const shifts = allShiftsMap[`${dayIndex}-${hour}-15`] || [];
                            return (
                              hideAddButton || isPastDate ? (
                                <div className="absolute inset-x-0 top-[24px] h-[24px]" />
                              ) : (
                                <DroppableTimeBlock date={day} hour={hour} minute={15}>
                                  {entityType === 'booking' ? (
                                    <>
                                      <AddBookingDialog 
                                        services={services}
                                        locations={bookingLocations}
                                        staffMembers={bookingStaffMembers}
                                        startDate={day} 
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
                                        date={day}
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
                                        date={day}
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
                                    <AddShiftDialog startDate={day} startTime={{ hour, minute: 15 }} onShiftCreated={onShiftCreated} staff={shiftStaff} locations={shiftLocations} services={shiftServices}>
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
                            return (
                              hideAddButton || isPastDate ? (
                                <div className="absolute inset-x-0 top-[48px] h-[24px]" />
                              ) : (
                                <DroppableTimeBlock date={day} hour={hour} minute={30}>
                                  {entityType === 'booking' ? (
                                    <>
                                      <AddBookingDialog 
                                        services={services}
                                        locations={bookingLocations}
                                        staffMembers={bookingStaffMembers}
                                        startDate={day} 
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
                                        date={day}
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
                                        date={day}
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
                                    <AddShiftDialog startDate={day} startTime={{ hour, minute: 30 }} onShiftCreated={onShiftCreated} staff={shiftStaff} locations={shiftLocations} services={shiftServices}>
                                      <div className="absolute inset-x-0 top-[48px] h-[24px] cursor-pointer transition-colors hover:bg-accent" />
                                    </AddShiftDialog>
                                  )}
                                </DroppableTimeBlock>
                              )
                            );
                          })()}

                          {(() => {
                            const shifts = allShiftsMap[`${dayIndex}-${hour}-45`] || [];
                            return (
                              hideAddButton || isPastDate ? (
                                <div className="absolute inset-x-0 top-[72px] h-[24px]" />
                              ) : (
                                <DroppableTimeBlock date={day} hour={hour} minute={45}>
                                  {entityType === 'booking' ? (
                                    <>
                                      <AddBookingDialog 
                                        services={services}
                                        locations={bookingLocations}
                                        staffMembers={bookingStaffMembers}
                                        startDate={day} 
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
                                        date={day}
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
                                        date={day}
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
                                    <AddShiftDialog startDate={day} startTime={{ hour, minute: 45 }} onShiftCreated={onShiftCreated} staff={shiftStaff} locations={shiftLocations} services={shiftServices}>
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
