import { ShiftWithDetails } from '@/lib/types/shift';
import { RRule } from 'rrule';
import { addDays, addWeeks, addMonths, startOfDay, endOfDay } from 'date-fns';

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
  endDate: Date
): ShiftWithDetails[] {
  // If not recurring, return the original shift
  if (!shift.is_recurring || !shift.recurrence_rule) {
    return [shift];
  }

  try {
    // Get the original shift's start and end times
    const shiftStart = new Date(shift.start_time);
    const shiftEnd = new Date(shift.end_time);
    
    // Calculate the duration in milliseconds
    const duration = shiftEnd.getTime() - shiftStart.getTime();
    
    // Parse the RRULE - add RRULE: prefix if not present
    let rruleString = shift.recurrence_rule;
    if (!rruleString.startsWith('RRULE:') && !rruleString.startsWith('DTSTART:')) {
      // Add DTSTART and RRULE prefix - use local date/time without Z
      const year = shiftStart.getFullYear();
      const month = String(shiftStart.getMonth() + 1).padStart(2, '0');
      const day = String(shiftStart.getDate()).padStart(2, '0');
      const hours = String(shiftStart.getHours()).padStart(2, '0');
      const minutes = String(shiftStart.getMinutes()).padStart(2, '0');
      const seconds = String(shiftStart.getSeconds()).padStart(2, '0');
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

    // Create a shift instance for each occurrence
    const instances: ShiftWithDetails[] = occurrences.map((occurrence, index) => {
      // Set the time of day to match the original shift
      const instanceStart = new Date(occurrence);
      instanceStart.setHours(shiftStart.getHours());
      instanceStart.setMinutes(shiftStart.getMinutes());
      instanceStart.setSeconds(shiftStart.getSeconds());
      
      const instanceEnd = new Date(instanceStart.getTime() + duration);

      return {
        ...shift,
        // Keep the original shift ID but add a suffix to make instances unique for the calendar
        id: `${shift.id}-instance-${index}`,
        start_time: instanceStart.toISOString(),
        end_time: instanceEnd.toISOString(),
        // Mark this as an instance of a recurring shift
        _isRecurringInstance: true,
        _originalShiftId: shift.id,
      } as ShiftWithDetails & { _isRecurringInstance?: boolean; _originalShiftId?: string };
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

  for (const shift of shifts) {
    const instances = expandRecurringShift(shift, startDate, endDate);
    expandedShifts.push(...instances);
  }

  return expandedShifts;
}

