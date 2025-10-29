"use client";

import * as React from "react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { parseISO, format } from "date-fns";
import type { CalendarDay, Modifiers } from "react-day-picker";

interface SingleCalendarProps {
  className?: string;
  classNames?: Record<string, string>;
  events?: Array<{ startDate: string; endDate: string; title: string; color?: string }>;
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  showOutsideDays?: boolean;
  month?: Date;
  onMonthChange?: (month: Date | undefined) => void;
}

function SingleCalendar({ className, classNames, showOutsideDays = true, selected, onSelect, events = [] }: SingleCalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState<Date | undefined>(selected instanceof Date ? selected : undefined);

  // Create modifiers for days with events
  const modifiers = React.useMemo(() => {
    const eventDates = new Set<string>();
    events.forEach(event => {
      const startDate = parseISO(event.startDate);
      const endDate = parseISO(event.endDate);
      
      // Add all dates in the event range
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        eventDates.add(format(currentDate, 'yyyy-MM-dd'));
        currentDate.setDate(currentDate.getDate() + 1);
      }
    });

    return {
      hasEvents: (date: Date) => eventDates.has(format(date, 'yyyy-MM-dd'))
    };
  }, [events]);

  // Custom day component with event indicators
  const DayButton = React.useCallback((props: { day: CalendarDay; modifiers: Modifiers } & React.ButtonHTMLAttributes<HTMLButtonElement>) => {
    const { day, modifiers, ...buttonProps } = props;
    const hasEvents = modifiers.hasEvents;
    
    return (
      <div className="relative w-full h-full">
        <button
          {...buttonProps}
          className={cn(
            "relative w-full h-full p-0 text-center font-normal",
            "hover:bg-accent hover:text-accent-foreground",
            "data-[selected=true]:bg-primary data-[selected=true]:text-primary-foreground",
            "data-[today=true]:bg-accent data-[today=true]:text-accent-foreground",
            "data-[outside-month=true]:text-muted-foreground",
            "rounded-md transition-colors",
            buttonProps.className
          )}
        >
          <span className="text-sm">{day.date.getDate()}</span>
          {hasEvents && (
            <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
              <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
            </div>
          )}
        </button>
      </div>
    );
  }, []);

  return (
    <Calendar
      mode="single"
      selected={selected}
      onSelect={onSelect}
      showOutsideDays={showOutsideDays}
      month={currentMonth}
      onMonthChange={setCurrentMonth}
      className={cn("p-3", className)}
      modifiers={modifiers}
      components={{
        DayButton,
      }}
      classNames={{
        day: "relative w-full h-full p-0 text-center font-normal",
        ...classNames,
      }}
    />
  );
}
SingleCalendar.displayName = "Calendar";

export { SingleCalendar };