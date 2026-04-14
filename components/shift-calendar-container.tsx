"use client";

import { useMemo } from "react";
import { isSameDay, parseISO, startOfWeek, endOfWeek } from "date-fns";
import { useCalendar } from "@/calendar/contexts/calendar-context";
import { DndProviderWrapper } from "@/calendar/components/dnd/dnd-provider";
import { ShiftCalendarHeader } from "@/components/shift-calendar-header";
import { CalendarYearView } from "@/calendar/components/year-view/calendar-year-view";
import { CalendarMonthView } from "@/calendar/components/month-view/calendar-month-view";
import { CalendarAgendaView } from "@/calendar/components/agenda-view/calendar-agenda-view";
import { CalendarDayView } from "@/calendar/components/week-and-day-view/calendar-day-view";
import { CalendarWeekView } from "@/calendar/components/week-and-day-view/calendar-week-view";
import type { IEvent } from "@/calendar/interfaces";
import type { TCalendarView } from "@/calendar/types";

interface IProps {
  view: TCalendarView;
  onViewChange: (view: TCalendarView) => void;
  onShiftCreated?: () => void;
  onShiftDeleted?: () => void;
  onShiftUpdated?: () => void;
  summaryShiftEvents?: IEvent[];
  hideAddButton?: boolean;
}

export function ShiftCalendarContainer({ view, onViewChange, onShiftCreated, onShiftDeleted, onShiftUpdated, summaryShiftEvents, hideAddButton }: IProps) {
  const { selectedDate, selectedUserId, selectedLocationId, events } = useCalendar();

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const eventStartDate = parseISO(event.startDate);
      const eventEndDate = parseISO(event.endDate);

      if (view === "year") {
        const yearStart = new Date(selectedDate.getFullYear(), 0, 1);
        const yearEnd = new Date(selectedDate.getFullYear(), 11, 31, 23, 59, 59, 999);
        const isInSelectedYear = eventStartDate <= yearEnd && eventEndDate >= yearStart;
        const isUserMatch = selectedUserId === "all" || event.user.id === selectedUserId;
        const isLocationMatch = !selectedLocationId || selectedLocationId === "all" || event.location?.id === selectedLocationId;
        return isInSelectedYear && isUserMatch && isLocationMatch;
      }

      if (view === "month" || view === "agenda") {
        const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });

        const monthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0, 23, 59, 59, 999);
        const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

        const isInSelectedMonth = eventStartDate <= gridEnd && eventEndDate >= gridStart;
        const isUserMatch = selectedUserId === "all" || event.user.id === selectedUserId;
        const isLocationMatch = !selectedLocationId || selectedLocationId === "all" || event.location?.id === selectedLocationId;
        return isInSelectedMonth && isUserMatch && isLocationMatch;
      }

      if (view === "week") {
        const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });

        const isInSelectedWeek = eventStartDate <= weekEnd && eventEndDate >= weekStart;
        const isUserMatch = selectedUserId === "all" || event.user.id === selectedUserId;
        const isLocationMatch = !selectedLocationId || selectedLocationId === "all" || event.location?.id === selectedLocationId;
        return isInSelectedWeek && isUserMatch && isLocationMatch;
      }

      if (view === "day") {
        const dayStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 0, 0, 0);
        const dayEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 23, 59, 59);
        const isInSelectedDay = eventStartDate <= dayEnd && eventEndDate >= dayStart;
        const isUserMatch = selectedUserId === "all" || event.user.id === selectedUserId;
        const isLocationMatch = !selectedLocationId || selectedLocationId === "all" || event.location?.id === selectedLocationId;
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

  return (
    <div className="overflow-hidden rounded-xl border">
      <ShiftCalendarHeader view={view} events={filteredEvents} onViewChange={onViewChange} onShiftCreated={onShiftCreated} hideAddButton={hideAddButton} />

      <DndProviderWrapper>
        {view === "day" && <CalendarDayView singleDayEvents={singleDayEvents} multiDayEvents={multiDayEvents} summaryShiftEvents={summaryShiftEvents} onShiftCreated={onShiftCreated} onShiftDeleted={onShiftDeleted} onShiftUpdated={onShiftUpdated} hideAddButton={hideAddButton} showNotesRow={false} />}
        {view === "month" && <CalendarMonthView singleDayEvents={singleDayEvents} multiDayEvents={multiDayEvents} onShiftDeleted={onShiftDeleted} onShiftUpdated={onShiftUpdated} hideAddButton={hideAddButton} />}
        {view === "week" && <CalendarWeekView singleDayEvents={singleDayEvents} multiDayEvents={multiDayEvents} summaryShiftEvents={summaryShiftEvents} onShiftCreated={onShiftCreated} onShiftDeleted={onShiftDeleted} onShiftUpdated={onShiftUpdated} hideAddButton={hideAddButton} showNotesRow={false} />}
        {view === "year" && <CalendarYearView allEvents={eventStartDates} onViewChange={onViewChange} />}
        {view === "agenda" && <CalendarAgendaView singleDayEvents={singleDayEvents} multiDayEvents={multiDayEvents} onShiftDeleted={onShiftDeleted} onShiftUpdated={onShiftUpdated} hideAddButton={hideAddButton} />}
      </DndProviderWrapper>
    </div>
  );
}
