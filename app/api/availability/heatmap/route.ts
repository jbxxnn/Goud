import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/db/server-supabase';
import {
  summarizeDayHeatmap,
  generateSlotsForDay,
  type BlackoutPeriod,
  type Shift,
  type TimeInterval,
  type ServiceRules,
  type Slot,
} from '@/lib/availability/slots';
import { expandRecurringShifts } from '@/lib/utils/expand-recurring-shifts';
import {
  heatmapCache,
  daySlotsCache,
  availabilityCacheHeaders,
  makeDaySlotsCacheKey,
  makeHeatmapCacheKey,
} from '@/lib/availability/cache';

export const runtime = 'edge';

function parseISODateOnly(s: string): Date {
  return new Date(`${s}T00:00:00.000Z`);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const serviceId = searchParams.get('serviceId');
    const locationId = searchParams.get('locationId');
    const startStr = searchParams.get('start'); // YYYY-MM-DD
    const endStr = searchParams.get('end');     // YYYY-MM-DD
    const staffId = searchParams.get('staffId'); // Optional - filter by staff

    if (!serviceId || !locationId || !startStr || !endStr) {
      return NextResponse.json({ error: 'Missing serviceId, locationId, start, or end' }, { status: 400 });
    }

    console.log('[availability/heatmap] params', { serviceId, locationId, startStr, endStr });

    const start = parseISODateOnly(startStr);
    const end = parseISODateOnly(endStr);
    if (!(start <= end)) return NextResponse.json({ error: 'Invalid range' }, { status: 400 });

    const cacheKey = makeHeatmapCacheKey({
      serviceId,
      locationId,
      start: startStr,
      end: endStr,
      staffId: staffId ?? null,
    });
    const cached = heatmapCache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached, { headers: availabilityCacheHeaders });
    }

    const supabase = getServiceSupabase();

    // Fetch service rules once
    const { data: serviceData, error: serviceErr } = await supabase
      .from('services')
      .select('id, duration, buffer_time, lead_time')
      .eq('id', serviceId)
      .maybeSingle();
    if (serviceErr || !serviceData) return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    const serviceRules: ServiceRules = {
      durationMinutes: Number(serviceData.duration) || 0,
      bufferMinutes: Number(serviceData.buffer_time) || 0,
      leadTimeMinutes: Number(serviceData.lead_time) || 0,
    };
    if (!serviceRules.durationMinutes || serviceRules.durationMinutes <= 0) {
      console.log('[availability/heatmap] no duration for service → returning empty days');
      const payload = { days: [] as any[] };
      heatmapCache.set(cacheKey, payload);
      return NextResponse.json(payload, { headers: availabilityCacheHeaders });
    }

    // Collect allowed shifts
    const { data: shiftServices, error: ssErr } = await supabase
      .from('shift_services')
      .select('shift_id')
      .eq('service_id', serviceId);
    if (ssErr) return NextResponse.json({ error: 'Failed to load shift services' }, { status: 500 });
    const allowedShiftIds = (shiftServices ?? []).map((s: any) => s.shift_id);
    if (allowedShiftIds.length === 0) {
      console.log('[availability/heatmap] no allowed shifts for service at all');
      const payload = { days: [] as any[] };
      heatmapCache.set(cacheKey, payload);
      return NextResponse.json(payload, { headers: availabilityCacheHeaders });
    }

    const startUTC = new Date(start);
    const endUTC = new Date(end);
    endUTC.setUTCHours(23, 59, 59, 999);

    // Shifts in range
    // Extra debug: also count all active shifts at this location in range (regardless of service)
    const { count: allLocShiftCount } = await supabase
      .from('shifts')
      .select('id', { count: 'exact', head: true })
      .eq('location_id', locationId)
      .eq('is_active', true)
      .lt('start_time', endUTC.toISOString())
      .gt('end_time', startUTC.toISOString());

    let shiftsQuery = supabase
      .from('shifts')
      .select('id, staff_id, location_id, start_time, end_time, is_active, is_recurring, recurrence_rule, parent_shift_id, exception_date')
      .eq('location_id', locationId)
      // We need to fetch any shift that is directly allowed OR is an exception to an allowed parent shift
      .or(`id.in.(${allowedShiftIds.join(',')}),parent_shift_id.in.(${allowedShiftIds.join(',')})`)
      // AND it must either be in range OR be a recurring parent series we can expand
      .or(`and(start_time.lt.${endUTC.toISOString()},end_time.gt.${startUTC.toISOString()}),and(is_recurring.eq.true,parent_shift_id.is.null)`);

    // Filter by staff if specified
    if (staffId) {
      shiftsQuery = shiftsQuery.eq('staff_id', staffId);
    }

    const { data: shiftsData, error: shiftsErr } = await shiftsQuery;
    if (shiftsErr) return NextResponse.json({ error: 'Failed to load shifts' }, { status: 500 });

    // Expand recurring shifts for the entire heatmap range once
    const expandedShiftsData = expandRecurringShifts(shiftsData as any, startUTC, endUTC);

    const shifts: Shift[] = expandedShiftsData.map((s: any) => ({
      id: s.id,
      staffId: s.staff_id,
      locationId: s.location_id,
      startTime: new Date(s.start_time),
      endTime: new Date(s.end_time),
      isActive: !!s.is_active,
      qualifiedServiceIds: [serviceId],
      is_recurring: !!s.is_recurring,
      recurrence_rule: s.recurrence_rule,
      parent_shift_id: s.parent_shift_id,
      exception_date: s.exception_date,
    }));

    console.log('[availability/heatmap] counts', {
      allowedShiftIds: allowedShiftIds.length,
      shifts: shifts.length,
      allLocationShiftsInRange: allLocShiftCount ?? 0,
    });
    if (shifts.length === 0) {
      // Fetch a few recent shifts for location to inspect times
      const { data: sampleLocShifts } = await supabase
        .from('shifts')
        .select('id, start_time, end_time')
        .eq('location_id', locationId)
        .eq('is_active', true)
        .order('start_time', { ascending: true })
        .limit(3);
      console.log('[availability/heatmap] sample location shifts (first 3 by start_time)', sampleLocShifts);
      // And a few for the allowed service ids regardless of location
      const { data: sampleAllowed } = await supabase
        .from('shifts')
        .select('id, location_id, start_time, end_time')
        .in('id', allowedShiftIds)
        .order('start_time', { ascending: true })
        .limit(3);
      console.log('[availability/heatmap] sample allowed shifts (first 3)', sampleAllowed);
    }

    // Blackouts for location in range
    const { data: blackoutData } = await supabase
      .from('blackout_periods')
      .select('location_id, start_date, end_date')
      .eq('location_id', locationId)
      .lte('start_date', endUTC.toISOString())
      .gte('end_date', startUTC.toISOString());
    const blackouts: BlackoutPeriod[] = (blackoutData ?? []).map((b: any) => ({
      locationId: b.location_id,
      startDate: new Date(b.start_date),
      endDate: new Date(b.end_date),
    }));

    console.log('[availability/heatmap] blackouts', blackouts.length);

    // Existing bookings for allowed shifts in range
    const { data: bookingsData } = await supabase
      .from('bookings')
      .select('shift_id, start_time, end_time, status')
      .in('shift_id', allowedShiftIds)
      .neq('status', 'cancelled')
      .lt('start_time', endUTC.toISOString())
      .gt('end_time', startUTC.toISOString());
    const existingByShift = new Map<string, TimeInterval[]>();
    for (const b of bookingsData ?? []) {
      const list = existingByShift.get(b.shift_id) ?? [];
      list.push({ start: new Date(b.start_time), end: new Date(b.end_time) });
      existingByShift.set(b.shift_id, list);
    }

    console.log('[availability/heatmap] existing bookings', bookingsData?.length ?? 0);

    // Iterate days and compute slot counts
    const perDaySlots = new Map<string, Slot[]>();
    const dayList: Date[] = [];
    const combinedExisting: TimeInterval[] = [];
    for (const arr of existingByShift.values()) combinedExisting.push(...arr);

    // Fetch active locks
    const { data: locksData, error: locksErr } = await supabase
      .from('booking_locks')
      .select('start_time, end_time')
      .in('shift_id', allowedShiftIds)
      .gt('expires_at', new Date().toISOString())
      .lt('start_time', endUTC.toISOString())
      .gt('end_time', startUTC.toISOString());

    if (locksErr) {
      console.log('[availability/heatmap] locks error', locksErr);
    }

    const activeLocks: TimeInterval[] = (locksData ?? []).map((l: any) => ({
      start: new Date(l.start_time),
      end: new Date(l.end_time),
    }));

    const dayMs = 24 * 60 * 60 * 1000;



    // Fetch shift specific breaks in range
    const { data: shiftBreaksData } = await supabase
      .from('shift_breaks')
      .select('shift_id, start_time, end_time, sitewide_break_id')
      .in('shift_id', allowedShiftIds)
      .lt('start_time', endUTC.toISOString())
      .gt('end_time', startUTC.toISOString());

    // Fetch active sitewide breaks
    const { data: globalBreaksData } = await supabase
      .from('sitewide_breaks')
      .select('*')
      .eq('is_active', true);

    for (let d = new Date(start); d <= end; d = new Date(d.getTime() + dayMs)) {
      dayList.push(new Date(d));
      const dayKey = d.toISOString().slice(0, 10);
      const dayCacheKey = makeDaySlotsCacheKey({
        serviceId,
        locationId,
        date: dayKey,
        staffId: staffId ?? null,
      });
      const cachedSlots = daySlotsCache.get(dayCacheKey);
      if (cachedSlots?.slots) {
        perDaySlots.set(
          dayKey,
          cachedSlots.slots.map((slot: Slot) => ({
            ...slot,
            startTime: new Date(slot.startTime),
            endTime: new Date(slot.endTime),
          })),
        );
        continue;
      }

      const dayStartStr = new Date(d).toISOString();
      const dayEnd = new Date(d);
      dayEnd.setUTCHours(23, 59, 59, 999);
      const dayEndStr = dayEnd.toISOString();

      const shiftBreaksForDay: TimeInterval[] = (shiftBreaksData ?? [])
        .filter((b: any) => b.end_time > dayStartStr && b.start_time < dayEndStr)
        .map((b: any) => ({
          start: new Date(b.start_time),
          end: new Date(b.end_time),
        }));

      // Project sitewide breaks onto shifts for the day
      const { toDate } = require('date-fns-tz');
      const sitewideBreaksToApply: TimeInterval[] = [];
      const dayKeyStr = d.toISOString().split('T')[0];

      for (const s of shifts) {
        // Only process shifts that apply to this day
        const sStart = new Date(s.startTime);
        const sEnd = new Date(s.endTime);
        if (sEnd <= new Date(dayStartStr) || sStart >= new Date(dayEndStr)) continue;

        for (const gb of globalBreaksData ?? []) {
          let applies = false;
          if (gb.is_recurring) {
            applies = true;
          } else {
            const bStart = gb.start_date || '0000-01-01';
            const bEnd = gb.end_date || '9999-12-31';
            if (dayKeyStr >= bStart && dayKeyStr <= bEnd) {
              applies = true;
            }
          }

          if (applies) {
            const breakStartTs = toDate(`${dayKeyStr}T${gb.start_time}`, { timeZone: 'Europe/Amsterdam' });
            const breakEndTs = toDate(`${dayKeyStr}T${gb.end_time}`, { timeZone: 'Europe/Amsterdam' });

            // Only apply if it overlaps with the shift and isn't already overridden
            if (breakStartTs >= sStart && breakEndTs <= sEnd) {
              const isOverridden = (shiftBreaksData ?? []).some(sb => sb.shift_id === s.id && sb.sitewide_break_id === gb.id);
              if (!isOverridden) {
                sitewideBreaksToApply.push({
                  start: breakStartTs,
                  end: breakEndTs
                });
              }
            }
          }
        }
      }

      const breaksForDay = [...shiftBreaksForDay, ...sitewideBreaksToApply];

      const slots = generateSlotsForDay({
        date: d,
        serviceId,
        locationId,
        shifts,
        serviceRules,
        blackouts,
        existingBookings: combinedExisting,
        breaks: breaksForDay,
      });
      perDaySlots.set(dayKey, slots);
      daySlotsCache.set(dayCacheKey, {
        slots: slots.map((slot) => ({
          ...slot,
        })),
      });
    }

    // Filter perDaySlots based on activeLocks
    if (activeLocks.length > 0) {
      for (const [dayKey, slots] of perDaySlots.entries()) {
        const visible = slots.filter(slot => {
          const sStart = new Date(slot.startTime);
          const sEnd = new Date(slot.endTime);
          return !activeLocks.some(lock => sStart < lock.end && lock.start < sEnd);
        });
        perDaySlots.set(dayKey, visible);
      }
    }

    const days = summarizeDayHeatmap(dayList, perDaySlots);
    const totalDaysWithSlots = days.filter((x) => x.availableSlots > 0).length;
    console.log('[availability/heatmap] days computed', { total: days.length, withSlots: totalDaysWithSlots, sample: days.slice(0, 3) });
    const payload = { days };
    heatmapCache.set(cacheKey, payload);
    return NextResponse.json(payload, { headers: availabilityCacheHeaders });
  } catch (e: any) {
    console.error('[availability/heatmap] error', e);
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}



