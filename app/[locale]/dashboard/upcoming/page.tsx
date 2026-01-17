import { createClient } from "@/lib/supabase/server";
import { UpcomingBookings } from "@/components/staff-dashboard/upcoming-bookings";
import { DashboardHeader } from "@/components/client-dashboard/header";
import { Separator } from "@/components/ui/separator";
import { redirect } from "next/navigation";

export default async function UpcomingPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/auth/login');
    }

    const { data: staff } = await supabase
        .from('staff')
        .select('id')
        .eq('user_id', user.id)
        .single();

    if (!staff) {
        return <div>Staff profile not found.</div>;
    }

    return (
        <div className="container py-6 space-y-6">
            <DashboardHeader
                heading="Upcoming Schedule"
                text="View your appointments for the next 30 days."
            />
            <Separator />
            <div className="p-6">
                <UpcomingBookings staffId={staff.id} />
            </div>
        </div>
    );
}
