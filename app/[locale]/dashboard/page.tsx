import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardClient from "./admin-dashboard";
import ClientDashboard from "./client-dashboard";
import StaffDashboard from "./staff-dashboard";

export default async function ProtectedPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  // Get user ID from claims
  const userId = data.claims.sub;

  // Get user data from users table to check role
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();

  if (userError || !user) {
    redirect("/auth/login");
  }

  // Render appropriate dashboard based on role
  if (user.role === 'admin') {
    return <DashboardClient />;
  } else if (user.role === 'client') {
    return <ClientDashboard clientId={userId} />;
  } else if (user.role === 'staff') {
    // Fetch staff profile linked to this user
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('id, first_name')
      .eq('user_id', userId)
      .single();

    if (staffError || !staff) {
      return (
        <div className="container py-8">
          <div className="bg-destructive/10 text-destructive p-4 rounded-md">
            Error: Staff profile not found for this user. Please contact an administrator.
          </div>
        </div>
      );
    }

    return <StaffDashboard staff={staff} />;
  }

  // Fallback for midwife or unsure roles -> Client Dashboard (safe default)
  return <ClientDashboard clientId={userId} />;
}
