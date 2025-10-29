import { Columns, Grid3x3, List, Grid2x2, CalendarRange, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserSelect } from "@/calendar/components/header/user-select";
import { TodayButton } from "@/calendar/components/header/today-button";
import { DateNavigator } from "@/calendar/components/header/date-navigator";
import { AddShiftDialog } from "@/calendar/components/dialogs/add-shift-dialog";
import type { IEvent } from "@/calendar/interfaces";
import type { TCalendarView } from "@/calendar/types";

interface IProps {
  view: TCalendarView;
  events: IEvent[];
  onViewChange: (view: TCalendarView) => void;
  onShiftCreated?: () => void;
}

export function ShiftCalendarHeader({ view, events, onViewChange, onShiftCreated }: IProps) {
  return (
    <div className="flex flex-col gap-4 border-b bg-primary-foreground p-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-3">
        <TodayButton />
        <DateNavigator view={view} events={events} />
      </div>

      <div className="flex flex-col items-center gap-1.5 sm:flex-row sm:justify-between">
        <div className="flex w-full items-center gap-1.5">
          <div className="inline-flex first:rounded-r-none last:rounded-l-none [&:not(:first-child):not(:last-child)]:rounded-none">
            <Button
              aria-label="View by day"
              size="icon"
              variant={view === "day" ? "default" : "outline"}
              className="rounded-r-none [&_svg]:size-5"
              onClick={() => onViewChange("day")}
            >
              <List strokeWidth={1.8} />
            </Button>

            <Button
              aria-label="View by week"
              size="icon"
              variant={view === "week" ? "default" : "outline"}
              className="-ml-px rounded-none [&_svg]:size-5"
              onClick={() => onViewChange("week")}
            >
              <Columns strokeWidth={1.8} />
            </Button>

            <Button
              aria-label="View by month"
              size="icon"
              variant={view === "month" ? "default" : "outline"}
              className="-ml-px rounded-none [&_svg]:size-5"
              onClick={() => onViewChange("month")}
            >
              <Grid2x2 strokeWidth={1.8} />
            </Button>

            <Button
              aria-label="View by year"
              size="icon"
              variant={view === "year" ? "default" : "outline"}
              className="-ml-px rounded-none [&_svg]:size-5"
              onClick={() => onViewChange("year")}
            >
              <Grid3x3 strokeWidth={1.8} />
            </Button>

            <Button
              aria-label="View by agenda"
              size="icon"
              variant={view === "agenda" ? "default" : "outline"}
              className="-ml-px rounded-l-none [&_svg]:size-5"
              onClick={() => onViewChange("agenda")}
            >
              <CalendarRange strokeWidth={1.8} />
            </Button>
          </div>

          <UserSelect />
          
          <AddShiftDialog onShiftCreated={onShiftCreated}>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" style={{ borderRadius: '0.3rem' }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Shift
            </Button>
          </AddShiftDialog>
        </div>
      </div>
    </div>
  );
}

