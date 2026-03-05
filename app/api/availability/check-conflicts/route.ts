import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/server-supabase";
import { expandRecurringShifts } from "@/lib/utils/expand-recurring-shifts";
import { toDate, formatInTimeZone } from "date-fns-tz";

export async function POST(req: NextRequest) {
  try {
    const { startTime, endTime, staffId, locationId, serviceId } = await req.json();

    if (!startTime || !endTime || !staffId || !locationId || !serviceId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    const dateStr = formatInTimeZone(start, "Europe/Amsterdam", "yyyy-MM-dd");
    const supabase = getServiceSupabase();

    const conflicts: { type: "blackout" | "break" | "booking" | "no_shift"; name?: string; details?: string }[] = [];

    // 1. Check Blackout Periods
    const { data: blackoutData } = await supabase
      .from("blackout_periods")
      .select("location_id, staff_id, start_date, end_date, reason")
      .eq("is_active", true)
      .or(`location_id.eq.${locationId},location_id.is.null`)
      .or(`staff_id.eq.${staffId},staff_id.is.null`)
      .lt("start_date", endTime)
      .gt("end_date", startTime);

    if (blackoutData && blackoutData.length > 0) {
      blackoutData.forEach((b) => {
        conflicts.push({
          type: "blackout",
          name: b.reason || "Holiday/Blackout",
        });
      });
    }

    // 2. Check Sitewide Breaks
    const { data: globalBreaksData } = await supabase
      .from("sitewide_breaks")
      .select("*")
      .eq("is_active", true);

    if (globalBreaksData) {
      for (const gb of globalBreaksData) {
        let applies = false;
        if (gb.is_recurring) {
          applies = true;
        } else {
          const bStart = gb.start_date || "0000-01-01";
          const bEnd = gb.end_date || "9999-12-31";
          if (dateStr >= bStart && dateStr <= bEnd) {
            applies = true;
          }
        }

        if (applies) {
          const breakStartTs = toDate(`${dateStr}T${gb.start_time}`, { timeZone: "Europe/Amsterdam" });
          const breakEndTs = toDate(`${dateStr}T${gb.end_time}`, { timeZone: "Europe/Amsterdam" });

          // check overlap
          if (start < breakEndTs && breakStartTs < end) {
            conflicts.push({
              type: "break",
              name: gb.name || "Sitewide Break",
            });
          }
        }
      }
    }

    // 3. Check Shift Breaks
    // First find the shift(s) covering this time
    const { data: shiftsData } = await supabase
      .from("shifts")
      .select("id, is_recurring, recurrence_rule, start_time, end_time, parent_shift_id")
      .eq("staff_id", staffId)
      .eq("location_id", locationId)
      .eq("is_active", true);
    
    if (shiftsData) {
      const expanded = expandRecurringShifts(shiftsData as any, start, end);
      const activeShiftIds = expanded
        .filter(s => {
          const sStart = new Date(s.start_time);
          const sEnd = new Date(s.end_time);
          return start >= sStart && end <= sEnd;
        })
        .map(s => s.id);
      
      const parentIds = expanded.map(s => s.parent_shift_id).filter(Boolean);
      const searchShiftIds = Array.from(new Set([...activeShiftIds, ...parentIds]));

      if (activeShiftIds.length === 0) {
        conflicts.push({
          type: "break", // Reusing 'break' type for UI consistency or adding 'no_shift' ?
          // User asked for prompt: "telling them there is no shift for the selected slot"
          // Let's use a specific 'no_shift' type.
          // @ts-ignore
          type: "no_shift",
          details: "No active shift found for this slot"
        });
      }

      if (searchShiftIds.length > 0) {
        const { data: shiftBreaks } = await supabase
          .from("shift_breaks")
          .select("name, start_time, end_time")
          .in("shift_id", searchShiftIds);
        
        if (shiftBreaks) {
          for (const sb of shiftBreaks) {
            const bStart = new Date(sb.start_time);
            const bEnd = new Date(sb.end_time);
            
            // If it's a pattern break (different date), project it
            let actualStart = bStart;
            let actualEnd = bEnd;
            
            if (sb.start_time.split('T')[0] !== dateStr) {
               actualStart = toDate(`${dateStr}T${bStart.getUTCHours().toString().padStart(2,'0')}:${bStart.getUTCMinutes().toString().padStart(2,'0')}:00`, { timeZone: 'UTC' });
               actualEnd = toDate(`${dateStr}T${bEnd.getUTCHours().toString().padStart(2,'0')}:${bEnd.getUTCMinutes().toString().padStart(2,'0')}:00`, { timeZone: 'UTC' });
            }

            if (start < actualEnd && actualStart < end) {
              conflicts.push({
                type: "break",
                name: sb.name || "Staff Break",
              });
            }
          }
        }
      }
    } else {
      // No shift data at all for this staff/location
      conflicts.push({
        // @ts-ignore
        type: "no_shift",
        details: "No active shift found for this slot"
      });
    }

    // 4. Check Existing Bookings
    const { data: bookingsData } = await supabase
      .from("bookings")
      .select("id, start_time, end_time")
      .eq("staff_id", staffId)
      .neq("status", "cancelled")
      .lt("start_time", endTime)
      .gt("end_time", startTime);

    if (bookingsData && bookingsData.length > 0) {
      bookingsData.forEach((b) => {
        conflicts.push({
          type: "booking",
          details: `Booking ID: ${b.id}`,
        });
      });
    }

    return NextResponse.json({ conflicts });
  } catch (err) {
    console.error("Conflict check error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
