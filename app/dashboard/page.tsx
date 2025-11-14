import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardClient from "./admin-dashboard";
import ClientDashboard from "./client-dashboard";

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
  }

  // For other roles (staff, midwife), redirect to login or show client dashboard
  // You can customize this based on your requirements
  return <ClientDashboard clientId={userId} />;
}
