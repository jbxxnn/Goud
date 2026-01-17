import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ResultsList } from "@/components/client-dashboard/results/results-list";
import { DashboardHeader } from "@/components/client-dashboard/header";
import { Separator } from "@/components/ui/separator";

export default async function ResultsPage() {
    const supabase = await createClient();

    const { data, error } = await supabase.auth.getClaims();
    if (error || !data?.claims) {
        redirect("/auth/login");
    }

    // Get user ID from claims
    const userId = data.claims.sub;

    return (
        <div className="container max-w-7xl py-6 space-y-6">
            <div>
                <DashboardHeader
                    heading="My Results"
                    text="View and download photos and videos from your completed echoes."
                />
            </div>

            <Separator />

            <ResultsList clientId={userId} />
        </div>
    );
}
