'use client';

import { useState, useEffect, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Booking } from '@/lib/types/booking';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Location } from '@/lib/types/location_simple';
import { formatInTimeZone, toDate } from 'date-fns-tz';
import { useTranslations } from 'next-intl';
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

type RescheduleSummary = {
  previous: {
    startTime: string;
    endTime: string;
    locationName: string;
  };
  next: {
    startTime: string;
    endTime: string;
    locationName: string;
  };
};

type RescheduleModalText = {
  title: string;
  currentBooking: string;
  selectNewDateTime: string;
  location: string;
  selectLocation: string;
  availableTimes: string;
  loadingTimes: string;
  noSlots: string;
  morning: string;
  afternoon: string;
  evening: string;
  prevMonth: string;
  nextMonth: string;
  weekdays: {
    sun: string;
    mon: string;
    tue: string;
    wed: string;
    thu: string;
    fri: string;
    sat: string;
  };
  cancel: string;
  confirm: string;
  processing: string;
  successTitle: string;
  successDescription: string;
  previous: string;
  new: string;
  date: string;
  time: string;
  done: string;
  notAvailable: string;
  errorTitle: string;
};

const formatDate = (dateString: string) => {
  return formatInTimeZone(toDate(dateString, { timeZone: 'Europe/Amsterdam' }), 'Europe/Amsterdam', 'd MMM yyyy');
};

const formatTime = (dateString: string) => {
  return formatInTimeZone(toDate(dateString, { timeZone: 'Europe/Amsterdam' }), 'Europe/Amsterdam', 'HH:mm');
};

const toISODate = (d: Date): string => {
  return formatInTimeZone(d, 'Europe/Amsterdam', 'yyyy-MM-dd');
};

function Calendar({ month, selectedDate, onSelectDate, heatmap, onPrevMonth, onNextMonth, text }: {
  month: Date;
  selectedDate: string;
  onSelectDate: (d: string) => void;
  heatmap: Record<string, number>;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  text: RescheduleModalText;
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
    const nextDate = toDate(last.dateStr + 'T00:00:00', { timeZone: 'Europe/Amsterdam' });
    nextDate.setDate(nextDate.getDate() + 1);
    cells.push({ dateStr: toISODate(nextDate), isOtherMonth: true });
  }

  const monthLabel = month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <div className="border rounded p-3 bg-border">
      <div className="flex justify-between items-center mb-3">
        <button
          className="px-2 py-1 border rounded"
          onClick={onPrevMonth}
        >
          {text.prevMonth}
        </button>
        <div className="font-medium">{monthLabel}</div>
        <button
          className="px-2 py-1 border rounded"
          onClick={onNextMonth}
        >
          {text.nextMonth}
        </button>
      </div>
      <div className="grid grid-cols-7 gap-2 text-xs mb-4 font-bold">
        {(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const).map((d) => (
          <div key={d} className="text-center text-gray-500">{text.weekdays[d]}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {cells.map((cell, idx) => {
          const count = heatmap[cell.dateStr] ?? 0;
          const isSelected = selectedDate === cell.dateStr;
          const enabled = count > 0;
          return (
            <button
              key={idx}
              className={`aspect-square rounded-full flex flex-col items-center justify-center ${isSelected
                ? 'bg-primary text-primary-foreground'
                : enabled
                  ? (cell.isOtherMonth ? 'text-gray-600 hover:bg-gray-50' : 'hover:bg-gray-50')
                  : 'opacity-40 cursor-not-allowed'
                }`}
              disabled={!enabled}
              onClick={() => enabled && onSelectDate(cell.dateStr)}
            >
              <div className="text-sm">{new Date(cell.dateStr).getDate()}</div>
              {/* <div className="text-[10px] text-gray-600">{count} slots</div> */}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TimePicker({ slots, selected, onSelect, loading, text }: {
  slots: Slot[];
  selected: Slot | null;
  onSelect: (s: Slot) => void;
  loading: boolean;
  text: RescheduleModalText;
}) {
  const groups: { morning: Slot[]; afternoon: Slot[]; evening: Slot[] } = { morning: [], afternoon: [], evening: [] };
  for (const s of slots) {
    const h = parseInt(formatInTimeZone(toDate(s.startTime, { timeZone: 'Europe/Amsterdam' }), 'Europe/Amsterdam', 'H'));
    if (h < 12) groups.morning.push(s);
    else if (h < 17) groups.afternoon.push(s);
    else groups.evening.push(s);
  }

  return (
    <div>
      <label className="block text-sm mb-2">{text.availableTimes}</label>
      {loading && <div className="text-sm text-gray-500 mb-2">{text.loadingTimes}</div>}
      {!loading && slots.length === 0 && <div className="text-sm text-gray-500">{text.noSlots}</div>}
      {!loading && slots.length > 0 && (
        <div className="space-y-4">
          {(['morning', 'afternoon', 'evening'] as const).map((k) => groups[k].length > 0 && (
            <div key={k}>
              <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">{text[k]}</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {groups[k].map((s, idx) => (
                  <Button
                    key={`${s.shiftId}-${idx}`}
                    variant={selected === s ? 'default' : 'outline'}
                    className={`w-full ${selected === s ? '' : 'bg-white'}`}
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
  const tAppointments = useTranslations('Appointments');
  const text: RescheduleModalText = {
    title: tAppointments.has('rescheduleModal.title') ? tAppointments('rescheduleModal.title') : 'Reschedule Booking',
    currentBooking: tAppointments.has('rescheduleModal.currentBooking') ? tAppointments('rescheduleModal.currentBooking') : 'Current Booking',
    selectNewDateTime: tAppointments.has('rescheduleModal.selectNewDateTime') ? tAppointments('rescheduleModal.selectNewDateTime') : 'Select New Date & Time',
    location: tAppointments.has('rescheduleModal.location') ? tAppointments('rescheduleModal.location') : 'Location',
    selectLocation: tAppointments.has('rescheduleModal.selectLocation') ? tAppointments('rescheduleModal.selectLocation') : 'Select location',
    availableTimes: tAppointments.has('rescheduleModal.availableTimes') ? tAppointments('rescheduleModal.availableTimes') : 'Available Times',
    loadingTimes: tAppointments.has('rescheduleModal.loadingTimes') ? tAppointments('rescheduleModal.loadingTimes') : 'Loading times...',
    noSlots: tAppointments.has('rescheduleModal.noSlots') ? tAppointments('rescheduleModal.noSlots') : 'No slots available for chosen date.',
    morning: tAppointments.has('rescheduleModal.morning') ? tAppointments('rescheduleModal.morning') : 'Morning',
    afternoon: tAppointments.has('rescheduleModal.afternoon') ? tAppointments('rescheduleModal.afternoon') : 'Afternoon',
    evening: tAppointments.has('rescheduleModal.evening') ? tAppointments('rescheduleModal.evening') : 'Evening',
    prevMonth: tAppointments.has('rescheduleModal.prevMonth') ? tAppointments('rescheduleModal.prevMonth') : 'Prev',
    nextMonth: tAppointments.has('rescheduleModal.nextMonth') ? tAppointments('rescheduleModal.nextMonth') : 'Next',
    weekdays: {
      sun: tAppointments.has('rescheduleModal.weekdays.sun') ? tAppointments('rescheduleModal.weekdays.sun') : 'Sun',
      mon: tAppointments.has('rescheduleModal.weekdays.mon') ? tAppointments('rescheduleModal.weekdays.mon') : 'Mon',
      tue: tAppointments.has('rescheduleModal.weekdays.tue') ? tAppointments('rescheduleModal.weekdays.tue') : 'Tue',
      wed: tAppointments.has('rescheduleModal.weekdays.wed') ? tAppointments('rescheduleModal.weekdays.wed') : 'Wed',
      thu: tAppointments.has('rescheduleModal.weekdays.thu') ? tAppointments('rescheduleModal.weekdays.thu') : 'Thu',
      fri: tAppointments.has('rescheduleModal.weekdays.fri') ? tAppointments('rescheduleModal.weekdays.fri') : 'Fri',
      sat: tAppointments.has('rescheduleModal.weekdays.sat') ? tAppointments('rescheduleModal.weekdays.sat') : 'Sat',
    },
    cancel: tAppointments.has('rescheduleModal.cancel') ? tAppointments('rescheduleModal.cancel') : 'Cancel',
    confirm: tAppointments.has('rescheduleModal.confirm') ? tAppointments('rescheduleModal.confirm') : 'Reschedule',
    processing: tAppointments.has('rescheduleModal.processing') ? tAppointments('rescheduleModal.processing') : 'Rescheduling...',
    successTitle: tAppointments.has('rescheduleModal.successTitle') ? tAppointments('rescheduleModal.successTitle') : 'Appointment Rescheduled',
    successDescription: tAppointments.has('rescheduleModal.successDescription') ? tAppointments('rescheduleModal.successDescription') : 'Your appointment has been updated successfully. Review the previous and new booking details below.',
    previous: tAppointments.has('rescheduleModal.previous') ? tAppointments('rescheduleModal.previous') : 'Previous',
    new: tAppointments.has('rescheduleModal.new') ? tAppointments('rescheduleModal.new') : 'New',
    date: tAppointments.has('rescheduleModal.date') ? tAppointments('rescheduleModal.date') : 'Date',
    time: tAppointments.has('rescheduleModal.time') ? tAppointments('rescheduleModal.time') : 'Time',
    done: tAppointments.has('rescheduleModal.done') ? tAppointments('rescheduleModal.done') : 'Done',
    notAvailable: tAppointments.has('rescheduleModal.notAvailable') ? tAppointments('rescheduleModal.notAvailable') : 'N/A',
    errorTitle: tAppointments.has('rescheduleModal.errorTitle') ? tAppointments('rescheduleModal.errorTitle') : 'Failed to reschedule booking',
  };
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [locations, setLocations] = useState<Location[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loadingHeatmap, setLoadingHeatmap] = useState(false);
  const [heatmap, setHeatmap] = useState<Record<string, number>>({});
  const [monthCursor, setMonthCursor] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleSummary, setRescheduleSummary] = useState<RescheduleSummary | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const timeSectionRef = useRef<HTMLDivElement | null>(null);

  // Fetch locations
  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/locations/active')
      .then(r => r.json())
      .then(res => {
        if (res.success && res.data) {
          setLocations(res.data);
        }
      })
      .catch(err => console.error('Failed to fetch locations:', err));
  }, [isOpen]);

  // Initialize when modal opens
  useEffect(() => {
    if (!isOpen || !booking) {
      setSelectedDate('');
      setSelectedSlot(null);
      setSelectedLocationId('');
      setSlots([]);
      setRescheduleSummary(null);
      return;
    }
    setSelectedLocationId(booking.location_id);
  }, [isOpen, booking]);

  useEffect(() => {
    if (!booking || !selectedDate || !selectedLocationId) {
      setSlots([]);
      return;
    }
    setLoadingSlots(true);
    const params = new URLSearchParams({
      serviceId: booking.service_id,
      locationId: selectedLocationId,
      date: selectedDate,
      excludeBookingId: booking.id, // Exclude current booking from availability check
      // Removed staffId filter to allow rescheduling to any available staff at this location
    });
    fetch(`/api/availability?${params.toString()}`)
      .then(r => r.json())
      .then(d => {
        const s: Slot[] = (d.slots ?? []).map((x: any) => ({
          shiftId: x.shiftId,
          staffId: x.staffId,
          startTime: x.startTime,
          endTime: x.endTime,
        }));
        setSlots(s);
      })
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [booking, selectedDate, selectedLocationId]);

  useEffect(() => {
    if (!booking || !selectedLocationId || !isOpen) return;
    setLoadingHeatmap(true);
    const start = new Date(monthCursor);
    const end = new Date(monthCursor);
    end.setMonth(end.getMonth() + 3);
    end.setDate(0);
    const params = new URLSearchParams({
      serviceId: booking.service_id,
      locationId: selectedLocationId,
      // Removed staffId filter to allow rescheduling to any available staff at this location
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
  }, [booking, monthCursor, isOpen, selectedLocationId]);

  useEffect(() => {
    if (!selectedDate || !isOpen) return;

    const scrollContainer = scrollContainerRef.current;
    const timeSection = timeSectionRef.current;

    if (!scrollContainer || !timeSection) return;

    const topOffset = 88;
    const containerRect = scrollContainer.getBoundingClientRect();
    const sectionRect = timeSection.getBoundingClientRect();
    const nextScrollTop =
      scrollContainer.scrollTop + (sectionRect.top - containerRect.top) - topOffset;

    scrollContainer.scrollTo({
      top: Math.max(0, nextScrollTop),
      behavior: 'smooth',
    });
  }, [selectedDate, isOpen]);

  const handleReschedule = async () => {
    if (!booking || !selectedSlot || !selectedLocationId || rescheduling) return;
    setRescheduling(true);
    try {
      const selectedLocation = locations.find((location) => location.id === selectedLocationId);

      await onReschedule(
        booking.id,
        selectedSlot.startTime,
        selectedSlot.endTime,
        selectedLocationId,   // Use newly selected location
        selectedSlot.staffId,  // Use staff from the selected slot
        selectedSlot.shiftId
      );
      setRescheduleSummary({
        previous: {
          startTime: booking.start_time,
          endTime: booking.end_time,
          locationName: booking.locations?.name || text.notAvailable,
        },
        next: {
          startTime: selectedSlot.startTime,
          endTime: selectedSlot.endTime,
          locationName: selectedLocation?.name || booking.locations?.name || text.notAvailable,
        },
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : text.errorTitle;
      toast.error(text.errorTitle, {
        description: errorMessage,
      });
    } finally {
      setRescheduling(false);
    }
  };

  if (!booking) return null;

  return (
    <>
      <Sheet open={isOpen && !rescheduleSummary} onOpenChange={(open) => {
        if (!open) onClose();
      }}>
        <SheetContent className="w-full sm:max-w-[500px] p-0 flex flex-col">
        <SheetHeader className="px-4 sm:px-6 py-4 border-b">
          <SheetTitle>{text.title}</SheetTitle>
        </SheetHeader>
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6">
          <div className="space-y-2">
            <h3 className="font-semibold">{text.currentBooking}</h3>
            <div className="text-sm p-3 bg-muted rounded-md">
              <div><span className="font-medium">{text.date}:</span> {formatDate(booking.start_time)}</div>
              <div><span className="font-medium">{text.time}:</span> {formatTime(booking.start_time)} - {formatTime(booking.end_time)}</div>
              <div><span className="font-medium">{text.location}:</span> {booking.locations?.name || text.notAvailable}</div>
              {/* <div><span className="font-medium">Staff:</span> {booking.staff ? `${booking.staff.first_name} ${booking.staff.last_name}` : 'N/A'}</div> */}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">{text.selectNewDateTime}</h3>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{text.location}</label>
              <Select value={selectedLocationId} onValueChange={(val) => {
                setSelectedLocationId(val);
                setSelectedSlot(null);
                setSelectedDate('');
              }}>
                <SelectTrigger className="w-full bg-white">
                  <SelectValue placeholder={text.selectLocation} />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="relative">
              <Calendar
                month={monthCursor}
                selectedDate={selectedDate}
                onSelectDate={(d) => {
                  setSelectedDate(d);
                  setSelectedSlot(null);
                }}
                heatmap={heatmap}
                text={text}
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
              <div ref={timeSectionRef}>
                <TimePicker
                  slots={slots}
                  selected={selectedSlot}
                  onSelect={setSelectedSlot}
                  loading={loadingSlots}
                  text={text}
                />
              </div>
            )}
          </div>
        </div>
        <div className="px-4 sm:px-6 py-4 border-t flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>{text.cancel}</Button>
          <Button
            onClick={handleReschedule}
            disabled={!selectedSlot || !selectedLocationId || rescheduling}
          >
            {rescheduling ? text.processing : text.confirm}
          </Button>
        </div>
        </SheetContent>
      </Sheet>

      <Dialog
        open={Boolean(rescheduleSummary)}
        onOpenChange={(open) => {
          if (!open) {
            setRescheduleSummary(null);
            onClose();
          }
        }}
      >
        <DialogContent className="max-w-lg" style={{borderRadius: '0.5rem'}}>
          <DialogHeader>
            <DialogTitle>{text.successTitle}</DialogTitle>
            <DialogDescription>
              {text.successDescription}
            </DialogDescription>
          </DialogHeader>

          {rescheduleSummary && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-md border bg-muted p-4" style={{borderRadius: '0.5rem'}}>
                <p className="text-sm font-semibold mb-3">{text.previous}</p>
                <div className="space-y-2 text-sm">
                  <div className='line-through'><span className="font-medium">{text.date}:</span> {formatDate(rescheduleSummary.previous.startTime)}</div>
                  <div className='line-through'><span className="font-medium">{text.time}:</span> {formatTime(rescheduleSummary.previous.startTime)} - {formatTime(rescheduleSummary.previous.endTime)}</div>
                  <div className='line-through'><span className="font-medium">{text.location}:</span> {rescheduleSummary.previous.locationName}</div>
                </div>
              </div>

              <div className="rounded-lg border border-accent bg-accent p-4" style={{borderRadius: '0.5rem'}}>
                <p className="text-sm font-semibold mb-3">{text.new}</p>
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">{text.date}:</span> {formatDate(rescheduleSummary.next.startTime)}</div>
                  <div><span className="font-medium">{text.time}:</span> {formatTime(rescheduleSummary.next.startTime)} - {formatTime(rescheduleSummary.next.endTime)}</div>
                  <div><span className="font-medium">{text.location}:</span> {rescheduleSummary.next.locationName}</div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              onClick={() => {
                setRescheduleSummary(null);
                onClose();
              }}
            >
              {text.done}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
