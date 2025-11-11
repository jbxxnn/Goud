import * as React from "react"
import { addDays, format, isSameDay, startOfWeek } from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"

interface WeeklyCalendarProps {
  selectedDate: Date
  onSelect: (date: Date) => void
  className?: string
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6
  showNavigation?: boolean
}

function WeeklyCalendar({
  selectedDate,
  onSelect,
  className,
  weekStartsOn = 1,
  showNavigation = false,
}: WeeklyCalendarProps) {
  const weekStart = React.useMemo(
    () => startOfWeek(selectedDate, { weekStartsOn }),
    [selectedDate, weekStartsOn]
  )

  const weekDays = React.useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart]
  )

  const handleSelect = React.useCallback(
    (day: Date) => {
      onSelect(day)
    },
    [onSelect]
  )

  const handlePreviousWeek = React.useCallback(() => {
    onSelect(addDays(weekStart, -1))
  }, [onSelect, weekStart])

  const handleNextWeek = React.useCallback(() => {
    onSelect(addDays(weekStart, 7))
  }, [onSelect, weekStart])

  return (
    <div className={cn("rounded-xl p-4", className)}>
      <div className="mb-4 flex items-center justify-between">
        {showNavigation ? (
          <button
            type="button"
            onClick={handlePreviousWeek}
            aria-label="Previous week"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-current transition hover:bg-white/20"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        ) : (
          <span className="w-8" aria-hidden>
            &nbsp;
          </span>
        )}

        <h3 className="text-sm font-semibold">{format(selectedDate, "MMMM yyyy")}</h3>

        {showNavigation ? (
          <button
            type="button"
            onClick={handleNextWeek}
            aria-label="Next week"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-current transition hover:bg-white/20"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <span className="w-8" aria-hidden>
            &nbsp;
          </span>
        )}
      </div>

      <div className="grid grid-cols-7 gap-3 text-center text-xs font-medium uppercase tracking-wider text-current opacity-70">
        {weekDays.map((day) => (
          <span key={`weekday-${day.toISOString()}`}>{format(day, "EEEEE")}</span>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-7 gap-3">
        {weekDays.map((day) => {
          const isSelected = isSameDay(day, selectedDate)

          return (
            <button
              type="button"
              key={day.toISOString()}
              onClick={() => handleSelect(day)}
              className={cn(
                "flex p-1.5 items-center justify-center rounded-lg text-xs font-medium transition",
                isSelected
                  ? "bg-primary text-white rounded-full"
                  : "bg-white/10 text-current opacity-80 hover:bg-white/20 hover:opacity-100"
              )}
            >
              {format(day, "d")}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export { WeeklyCalendar }
export type { WeeklyCalendarProps }
