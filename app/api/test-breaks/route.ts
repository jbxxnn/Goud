import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get all shifts
    const { data: shifts } = await supabase.from('shifts').select('*');
    const { data: globals } = await supabase.from('sitewide_breaks').select('*');

    const activeGlobals = globals?.filter(g => g.is_active) || [];

    const { toDate, formatInTimeZone } = require('date-fns-tz');

    const logs: any[] = [];
    
    for (const shift of shifts || []) {
      const sDate = shift.start_time.split('T')[0];
      const pStart = new Date(shift.start_time);
      const pEnd = new Date(shift.end_time);

      const pStartLocal = formatInTimeZone(pStart, 'Europe/Amsterdam', 'HH:mm');
      const pEndLocal = formatInTimeZone(pEnd, 'Europe/Amsterdam', 'HH:mm');
        
      for (const b of activeGlobals) {
        let applies = false;
        if (b.is_recurring) {
          applies = true;
        }

        if (applies) {
          const breakStartTs = toDate(`${sDate}T${b.start_time}`, { timeZone: 'Europe/Amsterdam' }).toISOString();
          const breakEndTs = toDate(`${sDate}T${b.end_time}`, { timeZone: 'Europe/Amsterdam' }).toISOString();

          const shiftStartOnDate = toDate(`${sDate}T${pStartLocal}:00`, { timeZone: 'Europe/Amsterdam' }).toISOString();
          const shiftEndOnDate = toDate(`${sDate}T${pEndLocal}:00`, { timeZone: 'Europe/Amsterdam' }).toISOString();

          // overlaps check
          const overlaps = breakStartTs >= shiftStartOnDate && breakEndTs <= shiftEndOnDate;
          
          logs.push({
            shiftId: shift.id,
            shiftLocal: `${pStartLocal} - ${pEndLocal}`,
            breakLocal: `${b.start_time} - ${b.end_time}`,
            overlaps
          });
        }
      }
    }

    return NextResponse.json({
      logs: logs.filter(l => l.overlaps), // show only overlapping ones
      allLogs: logs,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message });
  }
}
