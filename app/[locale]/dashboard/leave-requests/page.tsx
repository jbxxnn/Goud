import { createClient } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/db/server-supabase";
import { redirect } from "next/navigation";
import { LeaveRequestsClient } from "./leave-requests-client";

export const metadata = {
    title: "Leave Requests | GoudEcho",
};

export default async function LeaveRequestsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.user_metadata.role !== 'admin') {
        redirect('/dashboard');
    }

    const adminDb = getServiceSupabase();

    // Fetch all requests with staff details
    const { data: requests } = await adminDb
        .from('time_off_requests')
        .select(`
            *,
            users:staff_id (
                first_name,
                last_name,
                email
            )
        `)
        .order('created_at', { ascending: false });

    return <LeaveRequestsClient requests={requests || []} />;
}
