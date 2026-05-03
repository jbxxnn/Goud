
"use client";

import { useMemo } from "react";
import { isSameDay, parseISO, startOfWeek, endOfWeek } from "date-fns";
import { useCalendar } from "@/calendar/contexts/calendar-context";
import { DndProviderWrapper } from "@/calendar/components/dnd/dnd-provider";
import { BookingCalendarHeader } from "@/components/booking-calendar-header";
import { CalendarYearView } from "@/calendar/components/year-view/calendar-year-view";
import { CalendarMonthView } from "@/calendar/components/month-view/calendar-month-view";
import { CalendarAgendaView } from "@/calendar/components/agenda-view/calendar-agenda-view";
import { CalendarDayView } from "@/calendar/components/week-and-day-view/calendar-day-view";
import { CalendarWeekView } from "@/calendar/components/week-and-day-view/calendar-week-view";
import type { TCalendarView } from "@/calendar/types";
import type { IEvent } from "@/calendar/interfaces";
import type { Service } from "@/lib/types/booking";
import type { Location } from "@/lib/types/location_simple";
import type { Staff } from "@/lib/types/staff";

interface IProps {
    view: TCalendarView;
    onViewChange: (view: TCalendarView) => void;
    onEventClick?: (event: IEvent) => void;
    onBookingCreated?: () => void;
    userRole?: string;
    services: Service[];
    bookingLocations: Location[];
    bookingStaffMembers: Staff[];
    pageViewMode?: 'calendar' | 'table';
    onPageViewModeChange?: (mode: 'calendar' | 'table') => void;
}

export function BookingCalendarContainer({ view, onViewChange, onEventClick, onBookingCreated, userRole, services, bookingLocations, bookingStaffMembers, pageViewMode, onPageViewModeChange }: IProps) {
    const { selectedDate, selectedUserId, selectedLocationId, events } = useCalendar();
    const hideAddButton = userRole === 'staff';

    const filteredEvents = useMemo(() => {
        return events.filter(event => {
            const eventStartDate = parseISO(event.startDate);
            const eventEndDate = parseISO(event.endDate);

            if (view === "year") {
                const yearStart = new Date(selectedDate.getFullYear(), 0, 1);
                const yearEnd = new Date(selectedDate.getFullYear(), 11, 31, 23, 59, 59, 999);
                const isInSelectedYear = eventStartDate <= yearEnd && eventEndDate >= yearStart;
                const isUserMatch = selectedUserId === "all" || event.user.id === selectedUserId;
                const isLocationMatch = selectedLocationId === "all" || event.location?.id === selectedLocationId;
                return isInSelectedYear && isUserMatch && isLocationMatch;
            }

            if (view === "month" || view === "agenda") {
                const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
                const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });

                const monthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0, 23, 59, 59, 999);
                const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

                const isInSelectedMonth = eventStartDate <= gridEnd && eventEndDate >= gridStart;
                const isUserMatch = selectedUserId === "all" || event.user.id === selectedUserId;
                const isLocationMatch = selectedLocationId === "all" || event.location?.id === selectedLocationId;
                return isInSelectedMonth && isUserMatch && isLocationMatch;
            }

            if (view === "week") {
                const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
                const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });

                const isInSelectedWeek = eventStartDate <= weekEnd && eventEndDate >= weekStart;
                const isUserMatch = selectedUserId === "all" || event.user.id === selectedUserId;
                const isLocationMatch = selectedLocationId === "all" || event.location?.id === selectedLocationId;
                return isInSelectedWeek && isUserMatch && isLocationMatch;
            }

            if (view === "day") {
                const dayStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 0, 0, 0);
                const dayEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 23, 59, 59);
                const isInSelectedDay = eventStartDate <= dayEnd && eventEndDate >= dayStart;
                const isUserMatch = selectedUserId === "all" || event.user.id === selectedUserId;
                const isLocationMatch = selectedLocationId === "all" || event.location?.id === selectedLocationId;
                return isInSelectedDay && isUserMatch && isLocationMatch;
            }
        });
    }, [selectedDate, selectedUserId, selectedLocationId, events, view]);

    const singleDayEvents = filteredEvents.filter(event => {
        const startDate = parseISO(event.startDate);
        const endDate = parseISO(event.endDate);
        return isSameDay(startDate, endDate);
    });

    const multiDayEvents = filteredEvents.filter(event => {
        const startDate = parseISO(event.startDate);
        const endDate = parseISO(event.endDate);
        return !isSameDay(startDate, endDate);
    });

    const eventStartDates = useMemo(() => {
        return filteredEvents.map(event => ({ ...event, endDate: event.startDate }));
    }, [filteredEvents]);

    // Pass empty formatters to read-only views to avoid errors if they expect shift handlers
    // or simple ensure the read-only props are respected by not passing the handlers

    return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border">
            <BookingCalendarHeader 
              view={view} 
              events={filteredEvents} 
              onViewChange={onViewChange} 
              onBookingCreated={onBookingCreated}
              userRole={userRole}
              services={services}
              bookingLocations={bookingLocations}
              bookingStaffMembers={bookingStaffMembers}
              pageViewMode={pageViewMode}
              onPageViewModeChange={onPageViewModeChange}
              hideAddButton={hideAddButton}
            />

            <div className="min-h-0 flex-1 overflow-hidden">
            <DndProviderWrapper>
                {view === "day" && <CalendarDayView singleDayEvents={singleDayEvents} multiDayEvents={multiDayEvents} onEventClick={onEventClick} onShiftCreated={onBookingCreated} hideAddButton={hideAddButton} services={services} bookingLocations={bookingLocations} bookingStaffMembers={bookingStaffMembers} />}
                {view === "month" && (
                    <CalendarMonthView 
                        singleDayEvents={singleDayEvents.filter(e => !e.metadata?.isShift)} 
                        multiDayEvents={multiDayEvents.filter(e => !e.metadata?.isShift)} 
                        onEventClick={onEventClick} 
                        hideAddButton={hideAddButton}
                    />
                )}
                {view === "week" && <CalendarWeekView singleDayEvents={singleDayEvents} multiDayEvents={multiDayEvents} onEventClick={onEventClick} onShiftCreated={onBookingCreated} hideAddButton={hideAddButton} services={services} bookingLocations={bookingLocations} bookingStaffMembers={bookingStaffMembers} />}
                {view === "year" && (
                    <CalendarYearView 
                        allEvents={eventStartDates.filter(e => !e.metadata?.isShift)} 
                        onViewChange={onViewChange} 
                    />
                )}
                {view === "agenda" && <CalendarAgendaView singleDayEvents={singleDayEvents} multiDayEvents={multiDayEvents} onEventClick={onEventClick} hideAddButton={hideAddButton} />}
            </DndProviderWrapper>
            </div>
        </div>
    );
}
