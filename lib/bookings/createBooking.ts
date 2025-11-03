import { getServiceSupabase } from '@/lib/db/server-supabase';

export type CreateBookingInput = {
  clientId: string;
  serviceId: string;
  locationId: string;
  staffId: string;
  shiftId: string;
  startTime: string; // ISO
  endTime: string;   // ISO
  priceEurCents: number;
  notes?: string;
};

export async function createBooking(input: CreateBookingInput) {
  const supabase = getServiceSupabase();

  // Load shift and service rules for validation
  const [{ data: shift, error: shiftErr }, { data: service, error: svcErr }] = await Promise.all([
    supabase
      .from('shifts')
      .select('id, staff_id, location_id, start_time, end_time, is_active')
      .eq('id', input.shiftId)
      .maybeSingle(),
    supabase
      .from('services')
      .select('id, lead_time')
      .eq('id', input.serviceId)
      .maybeSingle(),
  ]);

  if (shiftErr || !shift) throw new Error('Shift not found');
  if (!shift.is_active) throw new Error('Shift inactive');
  if (shift.location_id !== input.locationId) throw new Error('Shift location mismatch');
  if (shift.staff_id !== input.staffId) throw new Error('Shift staff mismatch');
  if (svcErr || !service) throw new Error('Service not found');

  // Qualification check: shift must allow the service
  const { data: ss, error: ssErr } = await supabase
    .from('shift_services')
    .select('id')
    .eq('shift_id', input.shiftId)
    .eq('service_id', input.serviceId)
    .maybeSingle();
  if (ssErr || !ss) throw new Error('Service not available for this shift');

  // Time window checks
  const start = new Date(input.startTime);
  const end = new Date(input.endTime);
  if (!(start < end)) throw new Error('Invalid time range');
  const shiftStart = new Date(shift.start_time);
  const shiftEnd = new Date(shift.end_time);
  if (start < shiftStart || end > shiftEnd) throw new Error('Outside shift hours');

  const now = new Date();
  const leadMinutes = Number(service.lead_time) || 0;
  const minStartAllowed = new Date(now.getTime() + leadMinutes * 60_000);
  if (start < minStartAllowed) throw new Error('Lead time not satisfied');

  // Attempt insert; unique index on (shift_id, start_time, end_time) prevents double-booking
  const { data: booking, error: insertErr } = await supabase
    .from('bookings')
    .insert({
      client_id: input.clientId,
      service_id: input.serviceId,
      location_id: input.locationId,
      staff_id: input.staffId,
      shift_id: input.shiftId,
      start_time: input.startTime,
      end_time: input.endTime,
      price_eur_cents: input.priceEurCents,
      status: 'confirmed',
      payment_status: 'unpaid',
      notes: input.notes ?? null,
    })
    .select('*')
    .single();

  if (insertErr) {
    // Rely on unique constraint to signal conflicts
    if (String(insertErr.message || '').toLowerCase().includes('duplicate')) {
      throw new Error('Slot already taken');
    }
    throw insertErr;
  }

  return booking;
}







