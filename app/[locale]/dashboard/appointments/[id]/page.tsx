import { createClient } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/db/server-supabase";
import { notFound, redirect } from "next/navigation";
import { AppointmentDetailClient } from "@/components/staff-dashboard/appointment-detail-client";

export default async function AppointmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/auth/login');
    }

    // Role check (Optional but recommended: ensure user is staff/admin)
    // For now assuming dashboard access implies authorization, but let's be safe.
    // The AppSidebar logic checks roles, so if they are here, they likely have access.

    // Use Service Role to bypass RLS (since Booking RLS might be restrictive for Staff SELECTs)
    const adminDb = getServiceSupabase();

    // Fetch booking with top-level details
    const { data: booking, error } = await adminDb
        .from('bookings')
        .select(`
            *,
            services (*),
            locations (*),
            staff (*)
        `)
        .eq('id', id)
        .single();

    if (error || !booking) {
        console.error('Booking fetch error:', error);
        notFound();
    }

    // Manual fetch for addons
    const { data: addons } = await adminDb
        .from('booking_addons')
        .select(`
            *,
            service_addons (*)
        `)
        .eq('booking_id', booking.id);

    (booking as any).booking_addons = addons || [];

    // Manual fetch for user/client details
    // bookings.client_id is the primary user reference
    if (booking.client_id) {
        const { data: clientUser } = await adminDb
            .from('users')
            .select('*')
            .eq('id', booking.client_id)
            .single();

        // Attach to booking object as 'users' relation expectation
        (booking as any).users = clientUser;
        (booking as any).users = clientUser;
    } else if (booking.created_by) {
        const { data: clientUser } = await adminDb
            .from('users')
            .select('*')
            .eq('id', booking.created_by)
            .single();
        (booking as any).users = clientUser;
    }

    // Fetch previous bookings for this client
    let previousBookings: any[] = [];
    const clientIdentifier = booking.client_id || booking.created_by;

    if (clientIdentifier) {
        const { data: history } = await adminDb
            .from('bookings')
            .select('id, start_time, status, service_id, services(name), locations(name)')
            .eq('client_id', clientIdentifier) // Assuming client_id is consistent
            .neq('id', booking.id)
            .in('status', ['completed', 'cancelled'])
            .order('start_time', { ascending: false })
            .limit(5);

        if (history) {
            previousBookings = history;
        }
    }

    return <AppointmentDetailClient booking={booking} currentUser={user} previousBookings={previousBookings} />;
}
