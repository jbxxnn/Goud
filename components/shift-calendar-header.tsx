import { Button } from "@/components/ui/button";
import { UserSelect } from "@/calendar/components/header/user-select";
import { TodayButton } from "@/calendar/components/header/today-button";
import { DateNavigator } from "@/calendar/components/header/date-navigator";
import { AddShiftDialog } from "@/calendar/components/dialogs/add-shift-dialog";
import { HugeiconsIcon } from "@hugeicons/react";
import { LeftToRightListDashIcon, Layout3ColumnIcon, LayoutGridIcon, GridTableIcon, Calendar03Icon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
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
    <div className="flex flex-col gap-4 border-b bg-border p-4 lg:flex-row lg:items-center lg:justify-between">
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
              variant="outline"
              className={cn(
                "rounded-r-none [&_svg]:size-5",
                view === "day" && "text-background bg-secondary-foreground"
              )}
              onClick={() => onViewChange("day")}
            >
              <HugeiconsIcon icon={LeftToRightListDashIcon} size={24} />
            </Button>

            <Button
              aria-label="View by week"
              size="icon"
              variant="outline"
              className={cn(
                "-ml-px rounded-none [&_svg]:size-5",
                view === "week" && "text-background bg-secondary-foreground"
              )}
              onClick={() => onViewChange("week")}
            >
              <HugeiconsIcon icon={Layout3ColumnIcon} size={24} />
            </Button>

            <Button
              aria-label="View by month"
              size="icon"
              variant="outline"
              className={cn(
                "-ml-px rounded-none [&_svg]:size-5",
                view === "month" && "text-background bg-secondary-foreground"
              )}
              onClick={() => onViewChange("month")}
            >
              <HugeiconsIcon icon={LayoutGridIcon} size={24} />
            </Button>

            <Button
              aria-label="View by year"
              size="icon"
              variant="outline"
              className={cn(
                "-ml-px rounded-none [&_svg]:size-5",
                view === "year" && "text-background bg-secondary-foreground"
              )}
              onClick={() => onViewChange("year")}
            >
              <HugeiconsIcon icon={GridTableIcon} size={24} />
            </Button>

            <Button
              aria-label="View by agenda"
              size="icon"
              variant="outline"
              className={cn(
                "-ml-px rounded-l-none [&_svg]:size-5",
                view === "agenda" && "text-background bg-secondary-foreground"
              )}
              onClick={() => onViewChange("agenda")}
            >
              <HugeiconsIcon icon={Calendar03Icon} size={24} />
            </Button>
          </div>

          <UserSelect />
          
          <AddShiftDialog onShiftCreated={onShiftCreated}>
            <Button size="default" className="bg-secondary-foreground hover:bg-primary/90 text-primary-foreground" style={{ borderRadius: '0.2rem' }}>
              <HugeiconsIcon icon={PlusSignIcon} size={24} />
              Add Shift
            </Button>
          </AddShiftDialog>
        </div>
      </div>
    </div>
  );
}

