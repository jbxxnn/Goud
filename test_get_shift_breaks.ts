import { ShiftService } from './lib/database/shifts';

async function test() {
  console.log('Testing getShiftBreaks');
  // First, let's get a recurring shift
  const params = { is_recurring: true, limit: 1 };
  const shifts = await ShiftService.getShifts(params);
  if (shifts.data.length === 0) {
    console.log('No recurring shifts found');
    return;
  }
  const shift = shifts.data[0];
  console.log('Found shift:', shift.id, shift.start_time, shift.end_time);

  // Then let's get the breaks for its original date
  const originalDate = shift.start_time.split('T')[0];
  console.log('Fetching breaks for original date:', originalDate);
  const originalBreaks = await ShiftService.getShiftBreaks(`${shift.id}`, originalDate);
  console.log('Original breaks:', originalBreaks);

  // Then let's pretend it's an instance on the next day
  const nextDay = new Date(shift.start_time);
  nextDay.setDate(nextDay.getDate() + 1);
  const nextDate = nextDay.toISOString().split('T')[0];
  console.log('Fetching breaks for next date:', nextDate);
  const instanceBreaks = await ShiftService.getShiftBreaks(`${shift.id}-instance-1`, nextDate);
  console.log('Instance breaks:', instanceBreaks);
}

test().catch(console.error);
