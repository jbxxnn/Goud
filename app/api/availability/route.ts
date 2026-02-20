import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/db/server-supabase';
import { generateSlotsForDay, type BlackoutPeriod, type Shift, type TimeInterval, type ServiceRules } from '@/lib/availability/slots';
import { daySlotsCache, availabilityCacheHeaders, makeDaySlotsCacheKey } from '@/lib/availability/cache';

const NO_CACHE_HEADERS: Record<string, string> = { 'Cache-Control': 'no-store' };

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const serviceId = searchParams.get('serviceId');
    const locationId = searchParams.get('locationId');
    const dateStr = searchParams.get('date'); // ISO YYYY-MM-DD
    const excludeBookingId = searchParams.get('excludeBookingId'); // For rescheduling - exclude this booking from conflicts
    const staffId = searchParams.get('staffId'); // Optional - filter by staff
    const isTwin = searchParams.get('isTwin') === 'true';
    const continuationToken = searchParams.get('continuationToken');

    if (!serviceId || !locationId || !dateStr) {
      return NextResponse.json({ error: 'Missing serviceId, locationId, or date' }, { status: 400 });
    }

    const date = new Date(`${dateStr}T00:00:00.000Z`);
    console.log('[availability] params', { serviceId, locationId, date: dateStr });
    const dayStart = new Date(date);
    const dayEnd = new Date(date);
    dayEnd.setUTCHours(23, 59, 59, 999);

    const supabase = getServiceSupabase();

    const noCacheHeader = req.headers.get('Cache-Control');
    const tParam = searchParams.get('_t');
    const skipCache = Boolean(excludeBookingId) || noCacheHeader === 'no-cache' || Boolean(tParam);
    const cacheKey = skipCache
      ? null
      : makeDaySlotsCacheKey({
        serviceId,
        locationId,
        date: dateStr,
        staffId: staffId ?? null,
        isTwin,
      });
    if (!skipCache && cacheKey) {
      const cached = daySlotsCache.get(cacheKey);
      if (cached) {
        return NextResponse.json(cached, { headers: availabilityCacheHeaders });
      }
    }

    // Fetch service rules (duration, buffer, lead_time) from services
    const { data: serviceData, error: serviceErr } = await supabase
      .from('services')
      .select('id, duration, buffer_time, lead_time, allows_twins, twin_duration_minutes')
      .eq('id', serviceId)
      .maybeSingle();
    if (serviceErr || !serviceData) {
      console.log('[availability] service not found or error', serviceErr);
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }
    const serviceRules: ServiceRules = {
      durationMinutes: Number(serviceData.duration) || 0,
      bufferMinutes: Number(serviceData.buffer_time) || 0,
      leadTimeMinutes: Number(serviceData.lead_time) || 0,
    };

    if (continuationToken) {
      const { data: contData, error: contErr } = await supabase
        .from('booking_continuations')
        .select('*, repeat_type:service_repeat_types(duration_minutes, service_id)')
        .eq('token', continuationToken)
        .single();

      if (!contErr && contData?.repeat_type) {
        if (contData.repeat_type.service_id === serviceId) {
          serviceRules.durationMinutes = contData.repeat_type.duration_minutes;
        }
      }
    }

    if (isTwin) {
      if (serviceData.allows_twins) {
        // Use custom twin duration if set, otherwise double the base duration.
        if (serviceData.twin_duration_minutes) {
          serviceRules.durationMinutes = serviceData.twin_duration_minutes;
        } else {
          // Note: Buffer time is NOT multiplied by default, as cleanup usually takes same time.
          serviceRules.durationMinutes = serviceRules.durationMinutes * 2;
        }
      } else {
        // If service doesn't allow twins but isTwin=true is passed, ignore it or error?
        // For now, we ignore the twin flag to prevent errors, but logically this shouldn't happen from UI.
        console.warn('[availability] isTwin requested for service that does not allow twins');
      }
    }

    // shift_services → collect shift_ids that allow this service
    const { data: shiftServices, error: ssErr } = await supabase
      .from('shift_services')
      .select('shift_id')
      .eq('service_id', serviceId);
    if (ssErr) {
      console.log('[availability] shift_services error', ssErr);
      return NextResponse.json({ error: 'Failed to load shift services' }, { status: 500 });
    }
    const allowedShiftIds = (shiftServices ?? []).map((s: any) => s.shift_id);
    if (allowedShiftIds.length === 0) {
      const payload = { slots: [] as any[] };
      if (!skipCache && cacheKey) {
        daySlotsCache.set(cacheKey, payload);
      }
      return NextResponse.json(payload, skipCache ? { headers: NO_CACHE_HEADERS } : { headers: availabilityCacheHeaders });
    }

    // If Twin Request: Fetch qualified staff first
    let qualifiedStaffIds: string[] | null = null;
    if (isTwin) {
      const { data: qualifiedStaff, error: qsErr } = await supabase
        .from('staff_services')
        .select('staff_id')
        .eq('service_id', serviceId)
        .eq('is_twin_qualified', true);

      if (qsErr) {
        console.error('[availability] qualified staff error', qsErr);
        return NextResponse.json({ error: 'Failed to check staff qualifications' }, { status: 500 });
      }
      qualifiedStaffIds = (qualifiedStaff ?? []).map((s: any) => s.staff_id);

      if (qualifiedStaffIds.length === 0) {
        const payload = { slots: [] as any[] };
        if (!skipCache && cacheKey) {
          daySlotsCache.set(cacheKey, payload);
        }
        return NextResponse.json(payload, skipCache ? { headers: NO_CACHE_HEADERS } : { headers: availabilityCacheHeaders });
      }
    }

    // Shifts intersecting the day, at location, active, and included in allowedShiftIds
    let shiftsQuery = supabase
      .from('shifts')
      .select('id, staff_id, location_id, start_time, end_time, is_active')
      .eq('location_id', locationId)
      .eq('is_active', true)
      .in('id', allowedShiftIds)
      .lt('start_time', dayEnd.toISOString())
      .gt('end_time', dayStart.toISOString());

    // Filter by staff
    if (staffId) {
      shiftsQuery = shiftsQuery.eq('staff_id', staffId);
    }
    if (qualifiedStaffIds !== null) {
      shiftsQuery = shiftsQuery.in('staff_id', qualifiedStaffIds);
    }

    const { data: shiftsData, error: shiftsErr } = await shiftsQuery;
    if (shiftsErr) {
      console.log('[availability] shifts error', shiftsErr);
      return NextResponse.json({ error: 'Failed to load shifts' }, { status: 500 });
    }

    const shifts: Shift[] = (shiftsData ?? []).map((s: any) => ({
      id: s.id,
      staffId: s.staff_id,
      locationId: s.location_id,
      startTime: new Date(s.start_time),
      endTime: new Date(s.end_time),
      isActive: !!s.is_active,
      qualifiedServiceIds: [serviceId],
    }));

    // Blackouts for the location intersecting the day
    const { data: blackoutData, error: blackoutErr } = await supabase
      .from('blackout_periods')
      .select('location_id, start_date, end_date')
      .or(`location_id.eq.${locationId},location_id.is.null`)
      .lte('start_date', dayEnd.toISOString())
      .gte('end_date', dayStart.toISOString());
    if (blackoutErr) {
      console.log('[availability] blackout error', blackoutErr);
      return NextResponse.json({ error: 'Failed to load blackouts' }, { status: 500 });
    }
    const blackouts: BlackoutPeriod[] = (blackoutData ?? []).map((b: any) => ({
      locationId: b.location_id,
      startDate: new Date(b.start_date),
      endDate: new Date(b.end_date),
    }));

    // Existing bookings for those shifts on that day (not cancelled)
    // Exclude the current booking if rescheduling
    let bookingsQuery = supabase
      .from('bookings')
      .select('shift_id, start_time, end_time, status')
      .in('shift_id', allowedShiftIds)
      .neq('status', 'cancelled')
      .lt('start_time', dayEnd.toISOString())
      .gt('end_time', dayStart.toISOString());

    if (excludeBookingId) {
      bookingsQuery = bookingsQuery.neq('id', excludeBookingId);
    }

    const { data: bookingsData, error: bookingsErr } = await bookingsQuery;
    if (bookingsErr) {
      console.log('[availability] bookings error', bookingsErr);
      return NextResponse.json({ error: 'Failed to load bookings' }, { status: 500 });
    }
    const existingByShift = new Map<string, TimeInterval[]>();
    for (const b of bookingsData ?? []) {
      const list = existingByShift.get(b.shift_id) ?? [];
      list.push({ start: new Date(b.start_time), end: new Date(b.end_time) });
      existingByShift.set(b.shift_id, list);
    }

    const existingAll: TimeInterval[] = [];
    for (const arr of existingByShift.values()) existingAll.push(...arr);

    // Fetch active locks
    const { data: locksData, error: locksErr } = await supabase
      .from('booking_locks')
      .select('start_time, end_time')
      .in('shift_id', allowedShiftIds)
      .gt('expires_at', new Date().toISOString())
      .lt('start_time', dayEnd.toISOString())
      .gt('end_time', dayStart.toISOString());

    if (locksErr) {
      console.log('[availability] locks error', locksErr);
    }

    const activeLocks: TimeInterval[] = (locksData ?? []).map((l: any) => ({
      start: new Date(l.start_time),
      end: new Date(l.end_time),
    }));

    const { data: breaksData, error: breaksErr } = await supabase
      .from('staff_recurring_breaks')
      .select('staff_id, start_time, end_time, day_of_week')
      .in('staff_id', shifts.map(s => s.staffId));

    if (breaksErr) {
      console.log('[availability] breaks error', breaksErr);
    }

    // Fetch shift specific breaks
    const { data: shiftBreaksData, error: shiftBreaksErr } = await supabase
      .from('shift_breaks')
      .select('shift_id, start_time, end_time')
      .in('shift_id', allowedShiftIds)
      .lt('start_time', dayEnd.toISOString())
      .gt('end_time', dayStart.toISOString());

    if (shiftBreaksErr) {
      console.log('[availability] shift breaks error', shiftBreaksErr);
    }

    const dayOfWeek = date.getDay(); // 0-6
    const staffRecurringBreaksForDay: TimeInterval[] = (breaksData ?? [])
      .filter((b: any) => b.day_of_week === null || b.day_of_week === dayOfWeek)
      .map((b: any) => {
        // breaks are stored as TIME (HH:MM:SS), need to combine with current Date
        const [startH, startM] = b.start_time.split(':');
        const [endH, endM] = b.end_time.split(':');
        
        const start = new Date(date);
        start.setHours(Number(startH), Number(startM), 0, 0);
        
        const end = new Date(date);
        end.setHours(Number(endH), Number(endM), 0, 0);
        
        return { start, end };
      });

    const shiftBreaksForDay: TimeInterval[] = (shiftBreaksData ?? []).map((b: any) => ({
      start: new Date(b.start_time),
      end: new Date(b.end_time),
    }));

    const breaksForDay = [...staffRecurringBreaksForDay, ...shiftBreaksForDay];

    const allSlots = generateSlotsForDay({      date,
      serviceId,
      locationId,
      shifts,
      serviceRules,
      blackouts,
      existingBookings: existingAll,
      breaks: breaksForDay,
    });

    console.log('[availability] slots count (before locks)', allSlots.length);
    const payload = { slots: allSlots }; // Cache the raw available slots
    if (!skipCache && cacheKey) {
      daySlotsCache.set(cacheKey, payload);
    }

    // Filter by active locks for the response
    const visibleSlots = allSlots.filter(slot => {
      const slotStart = new Date(slot.startTime);
      const slotEnd = new Date(slot.endTime);
      return !activeLocks.some(lock =>
        slotStart < lock.end && lock.start < slotEnd
      );
    });

    return NextResponse.json({ slots: visibleSlots }, skipCache ? { headers: NO_CACHE_HEADERS } : { headers: availabilityCacheHeaders });
  } catch (e: any) {
    console.error('[availability] error', e);
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}



