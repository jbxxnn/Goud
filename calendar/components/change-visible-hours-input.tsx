"use client";

import { useState, useEffect } from "react";
import { Info, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCalendar } from "@/calendar/contexts/calendar-context";

import { Button } from "@/components/ui/button";
import { TimeInput } from "@/components/ui/time-input";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

import type { TimeValue } from "react-aria-components";

export function ChangeVisibleHoursInput() {
  const { visibleHours, setVisibleHours, isSaving } = useCalendar();

  const [from, setFrom] = useState<{ hour: number; minute: number }>({ hour: visibleHours.from, minute: 0 });
  const [to, setTo] = useState<{ hour: number; minute: number }>({ hour: visibleHours.to, minute: 0 });
  const [isLoading, setIsLoading] = useState(false);

  // Update local state when visibleHours changes from context
  useEffect(() => {
    setFrom({ hour: visibleHours.from, minute: 0 });
    setTo({ hour: visibleHours.to === 24 ? 0 : visibleHours.to, minute: 0 });
  }, [visibleHours]);

  const handleApply = async () => {
    setIsLoading(true);
    const toHour = to.hour === 0 ? 24 : to.hour;
    try {
      await setVisibleHours({ from: from.hour, to: toHour });
      toast.success("Visible hours updated successfully");
    } catch (error) {
      toast.error("Failed to update visible hours");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold">Change visible hours</p>

        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger>
              <Info className="size-3" />
            </TooltipTrigger>

            <TooltipContent className="max-w-80 text-center">
              <p>If an event falls outside the specified visible hours, the visible hours will automatically adjust to include that event.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="flex items-center gap-4">
        <p>From</p>
        <TimeInput id="start-time" hourCycle={12} granularity="hour" value={from as TimeValue} onChange={setFrom as (value: TimeValue | null) => void} />
        <p>To</p>
        <TimeInput id="end-time" hourCycle={12} granularity="hour" value={to as TimeValue} onChange={setTo as (value: TimeValue | null) => void} />
      </div>

      <Button 
        className="mt-4 w-fit" 
        onClick={handleApply}
        disabled={isLoading || isSaving}
      >
        {(isLoading || isSaving) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Apply
      </Button>
    </div>
  );
}
