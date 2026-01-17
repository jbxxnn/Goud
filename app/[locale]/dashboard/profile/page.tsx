import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardHeader } from "@/components/client-dashboard/header";
import { Separator } from "@/components/ui/separator";
import { ProfileForm } from "./profile-form";
import { PreferencesForm } from "./preferences-form";
import { PregnancyDetails } from "./pregnancy-details";

export default async function ProfilePage() {
    const supabase = await createClient();

    const { data, error } = await supabase.auth.getClaims();
    if (error || !data?.claims) {
        redirect("/auth/login");
    }

    // Get user ID from claims
    const userId = data.claims.sub;

    // Get user data
    const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

    if (userError || !user) {
        redirect("/auth/login");
    }

    return (
        <div className="container max-w-4xl py-6 space-y-8">
            <div>
                <DashboardHeader
                    heading="Profile & Preferences"
                    text="Manage your personal details and application settings."
                />
            </div>

            <Separator />

            <div className="grid gap-8">
                <ProfileForm user={user} />

                <Separator />

                <div className="grid gap-8 md:grid-cols-2">
                    <PreferencesForm />
                    <PregnancyDetails />
                </div>
            </div>
        </div>
    );
}
