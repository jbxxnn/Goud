import { useMemo } from "react";
import { formatDate } from "date-fns";

import { useCalendar } from "@/calendar/contexts/calendar-context";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { getEventsCount, navigateDate, rangeText } from "@/calendar/helpers";

import type { IEvent } from "@/calendar/interfaces";
import type { TCalendarView } from "@/calendar/types";
import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

interface IProps {
  view: TCalendarView;
  events: IEvent[];
}

export function DateNavigator({ view, events }: IProps) {
  const { selectedDate, setSelectedDate } = useCalendar();

  const month = formatDate(selectedDate, "MMMM");
  const year = selectedDate.getFullYear();

  const eventCount = useMemo(() => getEventsCount(events, selectedDate, view), [events, selectedDate, view]);

  const handlePrevious = () => setSelectedDate(navigateDate(selectedDate, view, "previous"));
  const handleNext = () => setSelectedDate(navigateDate(selectedDate, view, "next"));

  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-2">
        <span className="text-lg font-semibold">
          {month} {year}
        </span>
        <Badge className="px-1.5 bg-primary text-white border-border">
          {eventCount} events
        </Badge>
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={handlePrevious} className="bg-primary hover:bg-secondary-foreground text-sidebar-primary-foreground rounded-md !p-1 h-auto" style={{ borderRadius: '8rem' }}>
          <HugeiconsIcon icon={ArrowLeft01Icon} size={24} />
        </Button>

        <p className="text-sm text-muted-foreground">{rangeText(view, selectedDate)}</p>

        <Button onClick={handleNext} className="bg-primary hover:bg-secondary-foreground text-sidebar-primary-foreground rounded-md !p-1 h-auto" style={{ borderRadius: '8rem' }}>
          <HugeiconsIcon icon={ArrowRight01Icon} size={24} />
        </Button>
      </div>
    </div>
  );
}
