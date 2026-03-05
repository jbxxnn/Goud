import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/server-supabase";
import { createBooking } from "@/lib/bookings/createBooking";
import { ShiftService } from "@/lib/database/shifts";
import { bookingRequestSchema } from "@/lib/validation/booking";
import { z } from "zod";

// Shared schema extension for admin-specific fields
const adminBookingSchema = bookingRequestSchema.extend({
  payment_method: z.enum(['online', 'at_location']).optional().default('online'),
  // Scale down strict requirements for admin-initiated bookings
  shiftId: z.string().optional(),
  phone: z.string().optional(),
  dueDate: z.string().optional(),
  birthDate: z.string().optional(),
  midwifeId: z.string().optional(),
  houseNumber: z.string().optional(),
  postalCode: z.string().optional(),
  streetName: z.string().optional(),
  city: z.string().optional(),
  force: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const supabase = getServiceSupabase();
    const body = await req.json();
    const parsed = adminBookingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const { 
      staffId, 
      locationId, 
      serviceId, 
      startTime, 
      endTime, 
      payment_method,
      clientEmail,
      firstName,
      lastName,
      force
    } = parsed.data;

    // 1. Ensure a shift exists for this booking (unless forced)
    const start = new Date(startTime);
    const end = new Date(endTime);

    let shiftId = "";
    const isForced = force === true;

    if (!isForced) {
      // Fetch potential shifts for this staff/location that could cover the target date
      const { data: potentialShifts } = await ShiftService.getShifts({
        staff_id: staffId,
        location_id: locationId,
        active_only: true,
        limit: 100,
      });

      // We need to expand any recurring shifts to see if they have an instance on this day
      const { expandRecurringShift } = await import('@/lib/utils/expand-recurring-shifts');
      
      const overlappingShift = (potentialShifts || []).find(s => {
        const instances = expandRecurringShift(s as any, start, end);
        return instances.some(inst => {
          const iStart = new Date(inst.start_time);
          const iEnd = new Date(inst.end_time);
          return start >= iStart && end <= iEnd;
        });
      });

      if (overlappingShift) {
        shiftId = overlappingShift.id;
      } else {
        return NextResponse.json({ 
          error: "No active shift found for this time and staff member. Bookings can only be made during active shifts." 
        }, { status: 400 });
      }
    }

    // 2. Create the booking
    // Use createClient to get the current authenticated session
    const { createClient } = await import('@/lib/supabase/server');
    const authSupabase = await createClient();
    const { data: { user: currentUser } } = await authSupabase.auth.getUser();

    if (!currentUser) {
      return NextResponse.json({ 
        error: "Authentication required. You must be logged in as staff to create admin bookings." 
      }, { status: 401 });
    }

    // Role Verification: Ensure caller is explicitly staff/admin/assistant
    const { data: userData, error: userError } = await authSupabase
        .from('users')
        .select('role')
        .eq('id', currentUser.id)
        .single();

    if (userError || !userData || !['admin', 'staff', 'assistant'].includes(userData.role)) {
      return NextResponse.json({ 
        error: "Forbidden. You do not have permission to create admin-level bookings." 
      }, { status: 403 });
    }
    
    const booking = await createBooking({
      ...parsed.data,
      clientId: currentUser.id, // The performer
      createdBy: parsed.data.clientId, // The target client (passed as clientId from UI)
      shiftId: isForced ? "" : shiftId,
      bypassShiftValidation: isForced,
      // Admin bookings are confirmed by default
    });

    // 3. Handle Payment / Mollie
    let checkoutUrl: string | undefined;
    if (payment_method === 'online') {
      try {
        const { default: mollieClient } = await import('@/lib/mollie/client');
        const priceEurCents = parsed.data.priceEurCents;

        const payment = await mollieClient.payments.create({
          amount: { currency: 'EUR', value: (priceEurCents / 100).toFixed(2) },
          description: `Admin Booking #${booking.id}`,
          redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/booking/confirmation?bookingId=${booking.id}`,
          webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/mollie`,
          metadata: { booking_id: booking.id },
        });

        if (payment.id) {
          await supabase.from('bookings').update({
            mollie_payment_id: payment.id,
            payment_link: payment._links.checkout?.href,
          }).eq('id', booking.id);
          checkoutUrl = payment._links.checkout?.href;
        }
      } catch (err) {
        console.error("Mollie creation failed for admin booking", err);
      }
    } else {
      // Mark as at_location
      await supabase.from('bookings').update({
        payment_status: 'pending_at_location',
      }).eq('id', booking.id);
    }

    // 4. Send Confirmation Email
    try {
      const { sendBookingConfirmationEmail } = await import('@/lib/email');
      
      const { data: fullBooking } = await supabase
        .from('bookings')
        .select(`
          id,
          start_time,
          end_time,
          price_eur_cents,
          notes,
          services (name),
          locations (name),
          staff:staff_id (name)
        `)
        .eq('id', booking.id)
        .single();
        
      if (fullBooking) {
        const dateObj = new Date(fullBooking.start_time);
        await sendBookingConfirmationEmail(clientEmail, {
          clientName: `${firstName} ${lastName}`,
          serviceName: (fullBooking.services as any)?.name || 'Service',
          date: dateObj.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }),
          time: dateObj.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }),
          locationName: (fullBooking.locations as any)?.name || 'Locatie',
          price: `€${(fullBooking.price_eur_cents / 100).toFixed(2)}`,
          bookingId: fullBooking.id,
          notes: fullBooking.notes,
          paymentLink: checkoutUrl,
        });
      }
    } catch (emailErr) {
      console.error("Failed to send admin booking confirmation email", emailErr);
    }

    return NextResponse.json({ success: true, booking, checkoutUrl });

  } catch (err) {
    console.error("Admin booking error:", err);
    return NextResponse.json({ 
      error: err instanceof Error ? err.message : "Failed to create booking" 
    }, { status: 500 });
  }
}
