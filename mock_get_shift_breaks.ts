const { toDate } = require('date-fns-tz');

function testGetShiftBreaks() {
  // A hypothetical shift in the DB
  // Created for Feb 1, 2026, from 09:00 to 17:00 local time (Amsterdam, UTC+1 in winter)
  // So saved as 08:00 to 16:00 UTC.
  const shift = {
    start_time: '2026-02-01T08:00:00.000Z',
    end_time: '2026-02-01T16:00:00.000Z'
  };

  const sDate = '2026-02-26'; // The instance date

  // Global break (12:00 to 13:00 Amsterdam time)
  const b = {
    id: 'break-123',
    name: 'Lunch Break',
    start_time: '12:00:00',
    end_time: '13:00:00'
  };

  const localBreaks: any[] = [];
  const inheritedBreaks: any[] = [];

  const breakStartTs = toDate(`${sDate}T${b.start_time}`, { timeZone: 'Europe/Amsterdam' }).toISOString();
  const breakEndTs = toDate(`${sDate}T${b.end_time}`, { timeZone: 'Europe/Amsterdam' }).toISOString();

  const pStart = new Date(shift.start_time);
  const pEnd = new Date(shift.end_time);
  const shiftStartOnDate = toDate(`${sDate}T${pStart.getUTCHours().toString().padStart(2,'0')}:${pStart.getUTCMinutes().toString().padStart(2,'0')}:00`, { timeZone: 'UTC' }).toISOString();
  const shiftEndOnDate = toDate(`${sDate}T${pEnd.getUTCHours().toString().padStart(2,'0')}:${pEnd.getUTCMinutes().toString().padStart(2,'0')}:00`, { timeZone: 'UTC' }).toISOString();

  console.log({
    sDate,
    pStartUTCHours: pStart.getUTCHours(),
    pEndUTCHours: pEnd.getUTCHours(),
    breakStartTs,
    breakEndTs,
    shiftStartOnDate,
    shiftEndOnDate,
    isOverlapping: breakStartTs >= shiftStartOnDate && breakEndTs <= shiftEndOnDate
  });

  if (breakStartTs >= shiftStartOnDate && breakEndTs <= shiftEndOnDate) {
    const isOverridden = localBreaks.some(lb => lb.sitewide_break_id === b.id);
    if (!isOverridden) {
      inheritedBreaks.push({
        id: `inherited-${b.id}`,
        name: b.name,
        start_time: breakStartTs,
        end_time: breakEndTs,
      });
    }
  }

  console.log('Inherited breaks:', inheritedBreaks);
}

testGetShiftBreaks();
