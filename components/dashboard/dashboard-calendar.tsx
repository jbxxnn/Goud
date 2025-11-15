'use client';

import * as React from 'react';
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardCalendarEvent {
  startDate: string;
  endDate: string;
  title: string;
  color?: string;
}

interface DashboardCalendarProps {
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  events?: DashboardCalendarEvent[];
  className?: string;
}

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const buildMonthMatrix = (month: Date) => {
  const start = startOfWeek(startOfMonth(month));
  const end = endOfWeek(endOfMonth(month));
  const weeks: Date[][] = [];
  let cursor = start;
  let currentWeek: Date[] = [];

  while (cursor <= end) {
    currentWeek.push(cursor);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    cursor = addDays(cursor, 1);
  }

  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  return weeks;
};

export function DashboardCalendar({
  selected,
  onSelect,
  events = [],
  className,
}: DashboardCalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(
    startOfMonth(selected ?? new Date())
  );

  React.useEffect(() => {
    if (selected) {
      setCurrentMonth(startOfMonth(selected));
    }
  }, [selected]);

  const weeks = React.useMemo(() => buildMonthMatrix(currentMonth), [currentMonth]);

  const eventsLookup = React.useMemo(() => {
    const map = new Map<string, DashboardCalendarEvent[]>();
    events.forEach((event) => {
      const start = parseISO(event.startDate);
      const end = parseISO(event.endDate);
      let cursor = start;
      while (cursor <= end) {
        const key = format(cursor, 'yyyy-MM-dd');
        map.set(key, [...(map.get(key) || []), event]);
        cursor = addDays(cursor, 1);
      }
    });
    return map;
  }, [events]);

  const handleSelect = (date: Date) => {
    onSelect?.(date);
  };

  const renderDay = (date: Date) => {
    const key = format(date, 'yyyy-MM-dd');
    const hasEvents = eventsLookup.has(key);
    const selectedDate = selected ? isSameDay(date, selected) : false;
    const isToday = isSameDay(date, new Date());
    const outside = !isSameMonth(date, currentMonth);

    return (
      <button
        key={key}
        onClick={() => handleSelect(date)}
        className={cn(
          'relative flex h-8 w-full flex-col items-center justify-center text-sm font-medium transition-colors',
          'hover:bg-primary/10 hover:text-primary',
          selectedDate && 'text-card font-semibold bg-primary hover:text-card',
          isToday && 'text-card font-semibold',
          isToday && !selectedDate && 'text-primary font-semibold',
          outside && 'text-gray-300',
          !outside && !selectedDate && 'text-secondary-foreground'
        )}
      >
        <span>{date.getDate()}</span>
        {hasEvents && (
          <span className="absolute bottom-1 inline-flex h-1.5 w-1.5 mx-auto rounded-full bg-accent" />
        )}
      </button>
    );
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-foreground">
          {format(currentMonth, 'MMMM yyyy')}
        </div>
        <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => setCurrentMonth((prev) => subMonths(prev, 1))}
          className="rounded-full border border-muted-foreground/30 p-1 text-muted-foreground transition-colors hover:text-primary"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => setCurrentMonth((prev) => addMonths(prev, 1))}
          className="rounded-full border border-muted-foreground/30 p-1 text-muted-foreground transition-colors hover:text-primary"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {WEEK_DAYS.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="space-y-2">
        {weeks.map((week, idx) => (
          <div key={idx} className="grid grid-cols-7 gap-2">
            {week.map((day) => renderDay(day))}
          </div>
        ))}
      </div>
    </div>
  );
}


