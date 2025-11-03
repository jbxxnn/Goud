'use client';

import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Booking } from '@/lib/types/booking';
import { HugeiconsIcon } from '@hugeicons/react';
import { Loading03Icon } from '@hugeicons/core-free-icons';
import { toast } from 'sonner';

interface BookingRescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  onReschedule: (
    bookingId: string,
    newStartTime: string,
    newEndTime: string,
    locationId: string,
    staffId: string,
    shiftId: string
  ) => Promise<void>;
}

type Slot = {
  shiftId: string;
  staffId: string;
  startTime: string;
  endTime: string;
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('nl-NL', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
};

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('nl-NL', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

const toISODate = (d: Date): string => {
  const y = d.getFullYear();
  const m2 = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m2}-${dd}`;
};

function Calendar({ month, selectedDate, onSelectDate, heatmap, onPrevMonth, onNextMonth }: {
  month: Date;
  selectedDate: string;
  onSelectDate: (d: string) => void;
  heatmap: Record<string, number>;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}) {
  const year = month.getFullYear();
  const m = month.getMonth();
  const firstDay = new Date(year, m, 1);
  const lastDay = new Date(year, m + 1, 0);
  const startWeekday = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const cells: { dateStr: string; isOtherMonth: boolean }[] = [];
  for (let i = 0; i < startWeekday; i++) {
    const dateObj = new Date(year, m, 1 - (startWeekday - i));
    const dateStr = toISODate(dateObj);
    cells.push({ dateStr, isOtherMonth: true });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, m, d);
    const dateStr = toISODate(dateObj);
    cells.push({ dateStr, isOtherMonth: false });
  }
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1];
    const nextDate = new Date(last.dateStr + 'T00:00:00');
    nextDate.setDate(nextDate.getDate() + 1);
    cells.push({ dateStr: toISODate(nextDate), isOtherMonth: true });
  }

  const monthLabel = month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <div className="border rounded p-3">
      <div className="flex justify-between items-center mb-3">
        <button 
          className="px-2 py-1 border rounded" 
          onClick={onPrevMonth}
        >
          Prev
        </button>
        <div className="font-medium">{monthLabel}</div>
        <button 
          className="px-2 py-1 border rounded"
          onClick={onNextMonth}
        >
          Next
        </button>
      </div>
      <div className="grid grid-cols-7 gap-2 text-xs mb-2">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
          <div key={d} className="text-center text-gray-500">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {cells.map((cell, idx) => {
          const count = heatmap[cell.dateStr] ?? 0;
          const isSelected = selectedDate === cell.dateStr;
          const enabled = count > 0;
          return (
            <button
              key={idx}
              className={`aspect-square border rounded flex flex-col items-center justify-center ${
                isSelected
                  ? 'bg-black text-white'
                  : enabled
                    ? (cell.isOtherMonth ? 'text-gray-400 hover:bg-gray-50' : 'hover:bg-gray-50')
                    : 'opacity-40 cursor-not-allowed'
              }`}
              disabled={!enabled}
              onClick={() => enabled && onSelectDate(cell.dateStr)}
            >
              <div className="text-sm">{new Date(cell.dateStr).getDate()}</div>
              <div className="text-[10px] text-gray-600">{count} slots</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TimePicker({ slots, selected, onSelect, loading }: {
  slots: Slot[];
  selected: Slot | null;
  onSelect: (s: Slot) => void;
  loading: boolean;
}) {
  const groups: { morning: Slot[]; afternoon: Slot[]; evening: Slot[] } = { morning: [], afternoon: [], evening: [] };
  for (const s of slots) {
    const h = new Date(s.startTime).getHours();
    if (h < 12) groups.morning.push(s);
    else if (h < 17) groups.afternoon.push(s);
    else groups.evening.push(s);
  }

  return (
    <div>
      <label className="block text-sm mb-2">Available Times</label>
      {loading && <div className="text-sm text-gray-500 mb-2">Loading times…</div>}
      {!loading && slots.length === 0 && <div className="text-sm text-gray-500">No slots available for chosen date.</div>}
      {!loading && slots.length > 0 && (
        <div className="space-y-4">
          {(['morning','afternoon','evening'] as const).map((k) => groups[k].length > 0 && (
            <div key={k}>
              <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">{k}</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {groups[k].map((s, idx) => (
                  <Button
                    key={`${s.shiftId}-${idx}`}
                    variant={selected === s ? 'default' : 'outline'}
                    className={selected === s ? '' : 'bg-white'}
                    onClick={() => onSelect(s)}
                  >
                    {formatTime(s.startTime)}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function BookingRescheduleModal({ isOpen, onClose, booking, onReschedule }: BookingRescheduleModalProps) {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loadingHeatmap, setLoadingHeatmap] = useState(false);
  const [heatmap, setHeatmap] = useState<Record<string, number>>({});
  const [monthCursor, setMonthCursor] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0,0,0,0);
    return d;
  });
  const [rescheduling, setRescheduling] = useState(false);

  // Initialize when modal opens
  useEffect(() => {
    if (!isOpen || !booking) {
      setSelectedDate('');
      setSelectedSlot(null);
      setSlots([]);
      return;
    }
  }, [isOpen, booking]);

  useEffect(() => {
    if (!booking || !selectedDate || !booking.staff_id) {
      setSlots([]);
      return;
    }
    setLoadingSlots(true);
    const params = new URLSearchParams({
      serviceId: booking.service_id,
      locationId: booking.location_id,
      date: selectedDate,
      excludeBookingId: booking.id, // Exclude current booking from availability check
      staffId: booking.staff_id, // Filter by the same staff
    });
    fetch(`/api/availability?${params.toString()}`)
      .then(r => r.json())
      .then(d => {
        const s: Slot[] = (d.slots ?? []).map((x: any) => ({
          shiftId: x.shiftId,
          staffId: x.staffId,
          startTime: new Date(x.startTime).toISOString(),
          endTime: new Date(x.endTime).toISOString(),
        }));
        setSlots(s);
      })
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [booking, selectedDate]);

  useEffect(() => {
    if (!booking || !booking.location_id || !booking.staff_id || !isOpen) return;
    setLoadingHeatmap(true);
    const start = new Date(monthCursor);
    const end = new Date(monthCursor);
    end.setMonth(end.getMonth() + 3);
    end.setDate(0);
    const params = new URLSearchParams({
      serviceId: booking.service_id,
      locationId: booking.location_id,
      staffId: booking.staff_id, // Filter heatmap by the same staff
      start: toISODate(start),
      end: toISODate(end),
    });
    fetch(`/api/availability/heatmap?${params.toString()}`)
      .then(r => r.json())
      .then(d => {
        const map: Record<string, number> = {};
        for (const day of d.days ?? []) map[day.date] = day.availableSlots;
        setHeatmap(map);
      })
      .catch(() => setHeatmap({}))
      .finally(() => setLoadingHeatmap(false));
  }, [booking, monthCursor, isOpen]);

  const handleReschedule = async () => {
    if (!booking || !selectedSlot || !booking.location_id || !booking.staff_id) return;
    setRescheduling(true);
    try {
      await onReschedule(
        booking.id,
        selectedSlot.startTime,
        selectedSlot.endTime,
        booking.location_id, // Keep same location
        booking.staff_id,    // Keep same staff
        selectedSlot.shiftId
      );
      toast.success('Booking rescheduled', {
        description: 'The booking has been rescheduled successfully.',
      });
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reschedule booking';
      toast.error('Failed to reschedule booking', {
        description: errorMessage,
      });
    } finally {
      setRescheduling(false);
    }
  };

  if (!booking) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[600px] sm:w-[700px] p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle>Reschedule Booking</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          <div className="space-y-2">
            <h3 className="font-semibold">Current Booking</h3>
            <div className="text-sm p-3 bg-muted rounded-md">
              <div><span className="font-medium">Date:</span> {formatDate(booking.start_time)}</div>
              <div><span className="font-medium">Time:</span> {formatTime(booking.start_time)} - {formatTime(booking.end_time)}</div>
              <div><span className="font-medium">Location:</span> {booking.locations?.name || 'N/A'}</div>
              <div><span className="font-medium">Staff:</span> {booking.staff ? `${booking.staff.first_name} ${booking.staff.last_name}` : 'N/A'}</div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">Select New Date & Time</h3>
            <p className="text-sm text-gray-600">
              Location: <span className="font-medium">{booking.locations?.name || 'N/A'}</span>
              {' • '}
              Staff: <span className="font-medium">{booking.staff ? `${booking.staff.first_name} ${booking.staff.last_name}` : 'N/A'}</span>
            </p>
            
            <div className="relative">
              <Calendar
                month={monthCursor}
                selectedDate={selectedDate}
                onSelectDate={(d) => {
                  setSelectedDate(d);
                  setSelectedSlot(null);
                }}
                heatmap={heatmap}
                onPrevMonth={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))}
                onNextMonth={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))}
              />
              {loadingHeatmap && (
                <div className="absolute inset-0 bg-white/60 flex items-center justify-center rounded">
                  <div className="h-6 w-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            {selectedDate && (
              <TimePicker
                slots={slots}
                selected={selectedSlot}
                onSelect={setSelectedSlot}
                loading={loadingSlots}
              />
            )}
          </div>
        </div>
        <div className="px-6 py-4 border-t flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleReschedule}
            disabled={!selectedSlot || !booking?.location_id || !booking?.staff_id || rescheduling}
          >
            {rescheduling ? 'Rescheduling...' : 'Reschedule'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

