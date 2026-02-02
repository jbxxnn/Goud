
"use client";

import { useMemo } from "react";
import { isSameDay, parseISO } from "date-fns";
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

interface IProps {
    view: TCalendarView;
    onViewChange: (view: TCalendarView) => void;
    onEventClick?: (event: IEvent) => void;
}

export function BookingCalendarContainer({ view, onViewChange, onEventClick }: IProps) {
    const { selectedDate, selectedUserId, events } = useCalendar();

    const filteredEvents = useMemo(() => {
        return events.filter(event => {
            const eventStartDate = parseISO(event.startDate);
            const eventEndDate = parseISO(event.endDate);

            if (view === "year") {
                const yearStart = new Date(selectedDate.getFullYear(), 0, 1);
                const yearEnd = new Date(selectedDate.getFullYear(), 11, 31, 23, 59, 59, 999);
                const isInSelectedYear = eventStartDate <= yearEnd && eventEndDate >= yearStart;
                const isUserMatch = selectedUserId === "all" || event.user.id === selectedUserId;
                return isInSelectedYear && isUserMatch;
            }

            if (view === "month" || view === "agenda") {
                const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
                const monthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0, 23, 59, 59, 999);
                const isInSelectedMonth = eventStartDate <= monthEnd && eventEndDate >= monthStart;
                const isUserMatch = selectedUserId === "all" || event.user.id === selectedUserId;
                return isInSelectedMonth && isUserMatch;
            }

            if (view === "week") {
                const dayOfWeek = selectedDate.getDay();

                const weekStart = new Date(selectedDate);
                weekStart.setDate(selectedDate.getDate() - dayOfWeek);
                weekStart.setHours(0, 0, 0, 0);

                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);
                weekEnd.setHours(23, 59, 59, 999);

                const isInSelectedWeek = eventStartDate <= weekEnd && eventEndDate >= weekStart;
                const isUserMatch = selectedUserId === "all" || event.user.id === selectedUserId;
                return isInSelectedWeek && isUserMatch;
            }

            if (view === "day") {
                const dayStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 0, 0, 0);
                const dayEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 23, 59, 59);
                const isInSelectedDay = eventStartDate <= dayEnd && eventEndDate >= dayStart;
                const isUserMatch = selectedUserId === "all" || event.user.id === selectedUserId;
                return isInSelectedDay && isUserMatch;
            }
        });
    }, [selectedDate, selectedUserId, events, view]);

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
        <div className="overflow-hidden rounded-xl border">
            <BookingCalendarHeader view={view} events={filteredEvents} onViewChange={onViewChange} />

            <DndProviderWrapper>
                {view === "day" && <CalendarDayView singleDayEvents={singleDayEvents} multiDayEvents={multiDayEvents} onEventClick={onEventClick} />}
                {view === "month" && <CalendarMonthView singleDayEvents={singleDayEvents} multiDayEvents={multiDayEvents} onEventClick={onEventClick} />}
                {view === "week" && <CalendarWeekView singleDayEvents={singleDayEvents} multiDayEvents={multiDayEvents} onEventClick={onEventClick} />}
                {view === "year" && <CalendarYearView allEvents={eventStartDates} onViewChange={onViewChange} />}
                {view === "agenda" && <CalendarAgendaView singleDayEvents={singleDayEvents} multiDayEvents={multiDayEvents} onEventClick={onEventClick} />}
            </DndProviderWrapper>
        </div>
    );
}
