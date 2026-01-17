import { createClient } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/db/server-supabase";
import { redirect } from "next/navigation";
import { HistoryClient } from "./history-client";

export const metadata = {
    title: "My History | GoudEcho",
};

export default async function HistoryPage() {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
        redirect('/auth/login');
    }

    const adminDb = getServiceSupabase();
    const { data: user } = await adminDb
        .from('users')
        .select('id, role')
        .eq('id', authUser.id)
        .single();

    if (!user || (user.role !== 'staff' && user.role !== 'admin')) {
        redirect('/dashboard');
    }



    // Fetch the staff profile for the current user
    const { data: staffMember } = await adminDb
        .from('staff')
        .select('id')
        .eq('user_id', user.id)
        .single();

    if (!staffMember) {
        // If they are admin but not in staff table, they might not have a staff profile
        // Return empty list or handle gracefully
        return <HistoryClient appointments={[]} />;
    }

    // Fetch completed bookings for this staff member
    const { data: appointments } = await adminDb
        .from('bookings')
        .select(`
            *,
            users:users!client_id (
                first_name,
                last_name,
                email,
                phone
            ),
            services:services!service_id (
                name,
                duration
            ),
            locations:locations!location_id (
                name
            )
        `)
        .eq('staff_id', staffMember.id)
        .in('status', ['completed', 'cancelled'])
        .order('start_time', { ascending: false })
        .limit(50); // Limit to last 50 for performance

    return <HistoryClient appointments={appointments || []} />;
}
