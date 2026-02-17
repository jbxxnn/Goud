export type TimeInterval = {
  start: Date; // inclusive
  end: Date;   // exclusive
};

export type ServiceRules = {
  durationMinutes: number;
  bufferMinutes: number;
  leadTimeMinutes: number; // minimum minutes from now to allow booking
};

export type Shift = {
  id: string;
  staffId: string;
  locationId: string;
  startTime: Date;
  endTime: Date;
  qualifiedServiceIds: string[];
  isActive: boolean;
};

export type BlackoutPeriod = {
  locationId: string;
  startDate: Date; // inclusive
  endDate: Date;   // inclusive
};

export type Slot = {
  shiftId: string;
  staffId: string;
  startTime: Date;
  endTime: Date;
};

function isWithinBlackout(date: Date, blackouts: BlackoutPeriod[], locationId: string): boolean {
  for (const b of blackouts) {
    if (b.locationId !== locationId) continue;
    if (date >= startOfDay(b.startDate) && date <= endOfDay(b.endDate)) return true;
  }
  return false;
}

function startOfDay(d: Date): Date { const x = new Date(d); x.setUTCHours(0, 0, 0, 0); return x; }
function endOfDay(d: Date): Date { const x = new Date(d); x.setUTCHours(23, 59, 59, 999); return x; }

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function maxDate(a: Date, b: Date): Date { return a > b ? a : b; }
function minDate(a: Date, b: Date): Date { return a < b ? a : b; }

export type GenerateSlotsParams = {
  date: Date; // target day (local in location TZ before conversion)
  serviceId: string;
  locationId: string;
  shifts: Shift[];
  serviceRules: ServiceRules;
  blackouts: BlackoutPeriod[];
  existingBookings: TimeInterval[]; // for the same shift+day to exclude
  locks?: TimeInterval[]; // temporary locks to exclude
  now?: Date; // for testing; defaults to new Date()
};

export function generateSlotsForDay(params: GenerateSlotsParams): Slot[] {
  const {
    date,
    serviceId,
    locationId,
    shifts,
    serviceRules,
    blackouts,
    existingBookings,
    locks,
    now = new Date(),
  } = params;

  // Blackout check for the whole day
  if (isWithinBlackout(date, blackouts, locationId)) return [];

  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);

  const minStartAllowed = addMinutes(now, serviceRules.leadTimeMinutes);

  const daySlots: Slot[] = [];

  for (const shift of shifts) {
    if (!shift.isActive) continue;
    if (shift.locationId !== locationId) continue;
    if (!shift.qualifiedServiceIds.includes(serviceId)) continue;

    const shiftStart = maxDate(shift.startTime, dayStart);
    const shiftEnd = minDate(shift.endTime, dayEnd);
    if (shiftEnd <= shiftStart) continue;

    // Generate slots with fixed 15-minute interval
    let slotStart = new Date(shiftStart);
    const slotInterval = 15;

    while (addMinutes(slotStart, serviceRules.durationMinutes) <= shiftEnd) {
      const apptEnd = addMinutes(slotStart, serviceRules.durationMinutes);

      // Respect lead time
      if (slotStart < minStartAllowed) {
        slotStart = addMinutes(slotStart, slotInterval);
        continue;
      }

      // Exclude if overlapping with existing bookings
      const overlapsBooking = existingBookings.some((b) => intervalsOverlap({ start: slotStart, end: apptEnd }, b));
      if (!overlapsBooking) {
        // Exclude if overlapping with temporary locks
        const overlapsLock = locks?.some((l) => intervalsOverlap({ start: slotStart, end: apptEnd }, l));
        if (!overlapsLock) {
          daySlots.push({ shiftId: shift.id, staffId: shift.staffId, startTime: slotStart, endTime: apptEnd });
        }
      }

      slotStart = addMinutes(slotStart, slotInterval);
    }
  }

  // Sort by time
  daySlots.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  return daySlots;
}

function intervalsOverlap(a: TimeInterval, b: TimeInterval): boolean {
  return a.start < b.end && b.start < a.end;
}

export type DayHeatmap = { date: string; availableSlots: number }[]; // ISO date string

export function summarizeDayHeatmap(
  dates: Date[],
  perDaySlots: Map<string, Slot[]>
): DayHeatmap {
  return dates.map((d) => {
    const key = d.toISOString().slice(0, 10);
    return { date: key, availableSlots: perDaySlots.get(key)?.length ?? 0 };
  });
}



