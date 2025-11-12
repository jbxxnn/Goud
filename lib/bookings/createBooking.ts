import { getServiceSupabase } from '@/lib/db/server-supabase';
import { BookingAddonSelection, BookingPolicyAnswer } from '@/lib/validation/booking';

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
  dueDate?: string; // YYYY-MM-DD
  birthDate?: string; // YYYY-MM-DD
  midwifeId?: string;
  houseNumber?: string;
  postalCode?: string;
  streetName?: string;
  city?: string;
  policyAnswers?: BookingPolicyAnswer[] | null;
  addons?: BookingAddonSelection[] | null;
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
      due_date: input.dueDate || null,
      birth_date: input.birthDate || null,
      midwife_id: input.midwifeId || null,
      house_number: input.houseNumber || null,
      postal_code: input.postalCode || null,
      street_name: input.streetName || null,
      city: input.city || null,
      policy_answers: input.policyAnswers && input.policyAnswers.length > 0 ? input.policyAnswers : null,
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

  if (input.addons && input.addons.length > 0) {
    const addonIds = Array.from(new Set(input.addons.map((addon) => addon.addonId)));
    const { data: addonRecords, error: addonFetchError } = await supabase
      .from('service_addons')
      .select('id, service_id, price')
      .in('id', addonIds);

    if (addonFetchError) {
      throw new Error('Kon add-ons niet laden');
    }

    const addonMap = new Map<string, { service_id: string; price: number | null }>();
    for (const record of addonRecords ?? []) {
      if (record?.id) {
        addonMap.set(record.id, { service_id: record.service_id, price: record.price ?? 0 });
      }
    }

    const inserts: { booking_id: string; addon_id: string; quantity: number; price_eur_cents: number }[] = [];

    for (const addon of input.addons) {
      const record = addonMap.get(addon.addonId);
      if (!record || record.service_id !== input.serviceId) {
        throw new Error('Ongeldige add-on selectie');
      }
      const referencePrice = typeof record.price === 'number' ? Math.round(record.price * 100) : 0;
      const priceCents = typeof addon.priceEurCents === 'number' ? addon.priceEurCents : referencePrice;
      inserts.push({
        booking_id: booking.id,
        addon_id: addon.addonId,
        quantity: Math.max(1, addon.quantity || 1),
        price_eur_cents: Math.max(0, priceCents),
      });
    }

    if (inserts.length > 0) {
      const { error: addonInsertError } = await supabase.from('booking_addons').insert(inserts);
      if (addonInsertError) {
        throw new Error('Kon add-ons niet opslaan');
      }
    }
  }

  return booking;
}







