import { ShiftWithDetails } from '@/lib/types/shift';
import { RRule } from 'rrule';
import { addDays, addWeeks, addMonths, startOfDay, endOfDay } from 'date-fns';
import { formatInTimeZone, toDate } from 'date-fns-tz';

/**
 * Expands a recurring shift into multiple instances based on its recurrence rule
 * @param shift - The shift with recurrence rule
 * @param startDate - Start of the date range to expand
 * @param endDate - End of the date range to expand
 * @returns Array of shift instances
 */
export function expandRecurringShift(
  shift: ShiftWithDetails,
  startDate: Date,
  endDate: Date,
  exceptions: Set<string> = new Set()
): ShiftWithDetails[] {
  // If not recurring, return the original shift
  if (!shift.is_recurring || !shift.recurrence_rule) {
    return [shift];
  }

  try {
    // Get the original shift's start and end times
    const shiftStart = new Date(shift.start_time);
    const shiftEnd = new Date(shift.end_time);
    
    // Extract the strict local HH:mm string from the original shift Start and End
    // This removes the dependency on the math below crossing a DST gap
    const startHhMm = formatInTimeZone(shiftStart, 'Europe/Amsterdam', 'HH:mm');
    const endHhMm = formatInTimeZone(shiftEnd, 'Europe/Amsterdam', 'HH:mm');
    
    // Calculate the duration in milliseconds
    const duration = shiftEnd.getTime() - shiftStart.getTime();
    
    // Parse the RRULE - add RRULE: prefix if not present
    let rruleString = shift.recurrence_rule;
    if (!rruleString.startsWith('RRULE:') && !rruleString.startsWith('DTSTART:')) {
      // Add DTSTART and RRULE prefix - use local date/time without Z
      const year = formatInTimeZone(shiftStart, 'Europe/Amsterdam', 'yyyy');
      const month = formatInTimeZone(shiftStart, 'Europe/Amsterdam', 'MM');
      const day = formatInTimeZone(shiftStart, 'Europe/Amsterdam', 'dd');
      const hours = formatInTimeZone(shiftStart, 'Europe/Amsterdam', 'HH');
      const minutes = formatInTimeZone(shiftStart, 'Europe/Amsterdam', 'mm');
      const seconds = formatInTimeZone(shiftStart, 'Europe/Amsterdam', 'ss');
      const dtstart = `${year}${month}${day}T${hours}${minutes}${seconds}`;
      rruleString = `DTSTART:${dtstart}\nRRULE:${rruleString}`;
    } else if (!rruleString.startsWith('RRULE:') && !rruleString.includes('RRULE:')) {
      rruleString = `RRULE:${rruleString}`;
    }
    
    console.log('Expanding recurring shift:', {
      shiftId: shift.id,
      originalRule: shift.recurrence_rule,
      processedRule: rruleString,
      shiftStart: shiftStart.toISOString(),
      dateRange: { start: startDate.toISOString(), end: endDate.toISOString() }
    });
    
    // Parse the RRULE
    const rrule = RRule.fromString(rruleString);
    
    // Get all occurrences within the date range
    const occurrences = rrule.between(
      startOfDay(startDate),
      endOfDay(endDate),
      true // inclusive
    );
    
    console.log(`Generated ${occurrences.length} occurrences for shift ${shift.id}`);

    // Create a shift instance for each occurrence, skipping known exceptions
    const instances: ShiftWithDetails[] = [];
    
    occurrences.forEach((occurrence, index) => {
      // Check if this specific date is an exception (compare YYYY-MM-DD string)
      // Use the local timezone to ensure accurate day calculation (preventing UTC shifts)
      const dateString = formatInTimeZone(occurrence, 'Europe/Amsterdam', 'yyyy-MM-dd');
      if (exceptions.has(dateString)) {
        return; // Skip this occurrence, it has been overridden or deleted
      }

      // Reconstruct the precise Start and End Date objects in Europe/Amsterdam using the original HH:mm
      const instanceStartStr = `${dateString}T${startHhMm}:00`;
      const instanceEndStr = `${dateString}T${endHhMm}:00`;
      
      const instanceStart = toDate(instanceStartStr, { timeZone: 'Europe/Amsterdam' });
      const instanceEnd = toDate(instanceEndStr, { timeZone: 'Europe/Amsterdam' });

      // If the shift crosses midnight (end time < start time), add 1 day to the end time
      if (instanceEnd < instanceStart) {
        instanceEnd.setDate(instanceEnd.getDate() + 1);
      }

      instances.push({
        ...shift,
        // Keep the original shift ID but add a suffix to make instances unique for the calendar
        id: `${shift.id}-instance-${index}`,
        start_time: instanceStart.toISOString(),
        end_time: instanceEnd.toISOString(),
        // Mark this as an instance of a recurring shift
        _isRecurringInstance: true,
        _instanceDate: `${dateString}T00:00:00.000Z`,
        _originalShiftId: shift.id,
      } as ShiftWithDetails & { _isRecurringInstance?: boolean; _instanceDate?: string; _originalShiftId?: string });
    });

    return instances;
  } catch (error) {
    console.error('Error expanding recurring shift:', error, 'Rule:', shift.recurrence_rule);
    // If there's an error parsing the rule, return the original shift
    return [shift];
  }
}

/**
 * Expands all recurring shifts in an array
 * @param shifts - Array of shifts
 * @param startDate - Start of the date range
 * @param endDate - End of the date range
 * @returns Array of all shift instances (including expanded recurring ones)
 */
export function expandRecurringShifts(
  shifts: ShiftWithDetails[],
  startDate: Date,
  endDate: Date
): ShiftWithDetails[] {
  const expandedShifts: ShiftWithDetails[] = [];

  // Group exceptions by parent shift ID
  const exceptionsByParent = new Map<string, Set<string>>();
  
  // Separate exceptions from the raw list (and add normal shifts directly)
  const regularShifts: ShiftWithDetails[] = [];
  
  for (const shift of shifts) {
    if (shift.parent_shift_id && shift.exception_date) {
      // Record this exception date for this parent shift
      if (!exceptionsByParent.has(shift.parent_shift_id)) {
        exceptionsByParent.set(shift.parent_shift_id, new Set());
      }
      exceptionsByParent.get(shift.parent_shift_id)!.add(shift.exception_date);
    }
    
    if (!shift.parent_shift_id) {
       // It's a normal shift or a parent recurring shift
       regularShifts.push(shift);
    } else if (shift.is_active !== false) {
       // It's an overriding exception (an edited instance, not a deleted tombstone)
       // Add it directly so it renders on the calendar
       expandedShifts.push(shift);
    }
  }

  // Expand regular recurring shifts, passing down any mapped exception dates
  for (const shift of regularShifts) {
    const parentExceptions = exceptionsByParent.get(shift.id) || new Set();
    const instances = expandRecurringShift(shift, startDate, endDate, parentExceptions);
    expandedShifts.push(...instances);
  }

  return expandedShifts;
}

