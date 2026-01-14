"use client";

import { useState, useEffect, useCallback } from "react";
import { Info } from "lucide-react";
import { useCalendar } from "@/calendar/contexts/calendar-context";

import { TimeInput } from "@/components/ui/time-input";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

import type { TimeValue } from "react-aria-components";

import { useTranslations } from 'next-intl';

interface ChangeVisibleHoursInputProps {
  onSaveHandlerReady?: (handler: () => Promise<void>) => void;
}

export function ChangeVisibleHoursInput({ onSaveHandlerReady }: ChangeVisibleHoursInputProps = {}) {
  const t = useTranslations('Shifts.visibleHoursInput');
  const { visibleHours, setVisibleHours } = useCalendar();

  const [from, setFrom] = useState<{ hour: number; minute: number }>({ hour: visibleHours.from, minute: 0 });
  const [to, setTo] = useState<{ hour: number; minute: number }>({ hour: visibleHours.to, minute: 0 });

  // Update local state when visibleHours changes from context
  useEffect(() => {
    setFrom({ hour: visibleHours.from, minute: 0 });
    setTo({ hour: visibleHours.to === 24 ? 0 : visibleHours.to, minute: 0 });
  }, [visibleHours]);

  const handleApply = useCallback(async () => {
    const toHour = to.hour === 0 ? 24 : to.hour;
    await setVisibleHours({ from: from.hour, to: toHour });
  }, [from, to, setVisibleHours]);

  // Expose the save handler to parent
  useEffect(() => {
    if (onSaveHandlerReady) {
      onSaveHandlerReady(handleApply);
    }
  }, [handleApply, onSaveHandlerReady]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold">{t('title')}</p>

        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger>
              <Info className="size-3" />
            </TooltipTrigger>

            <TooltipContent className="max-w-80 text-center">
              <p>{t('tooltip')}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="flex items-center gap-4">
        <p>{t('from')}</p>
        <TimeInput id="start-time" hourCycle={12} granularity="hour" value={from as TimeValue} onChange={setFrom as (value: TimeValue | null) => void} />
        <p>{t('to')}</p>
        <TimeInput id="end-time" hourCycle={12} granularity="hour" value={to as TimeValue} onChange={setTo as (value: TimeValue | null) => void} />
      </div>
    </div>
  );
}
