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
      .select('id, staff_id, location_id, start_time, end_time, is_active')
      .eq('location_id', locationId)
      .eq('is_active', true)
      .in('id', allowedShiftIds)
      .lt('start_time', endUTC.toISOString())
      .gt('end_time', startUTC.toISOString());
    
    // Filter by staff if specified
    if (staffId) {
      shiftsQuery = shiftsQuery.eq('staff_id', staffId);
    }

    const { data: shiftsData, error: shiftsErr } = await shiftsQuery;
    if (shiftsErr) return NextResponse.json({ error: 'Failed to load shifts' }, { status: 500 });

    const shifts: Shift[] = (shiftsData ?? []).map((s: any) => ({
      id: s.id,
      staffId: s.staff_id,
      locationId: s.location_id,
      startTime: new Date(s.start_time),
      endTime: new Date(s.end_time),
      isActive: !!s.is_active,
      qualifiedServiceIds: [serviceId],
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

    const dayMs = 24 * 60 * 60 * 1000;
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

      const slots = generateSlotsForDay({
        date: d,
        serviceId,
        locationId,
        shifts,
        serviceRules,
        blackouts,
        existingBookings: combinedExisting,
      });
      perDaySlots.set(dayKey, slots);
      daySlotsCache.set(dayCacheKey, {
        slots: slots.map((slot) => ({
          ...slot,
        })),
      });
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



