import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import StaffClient from './staff-client';

export default async function StaffPage() {
  // Get the server-side Supabase client
  const supabase = await createClient();

  // Get the current user (server-side authenticated)
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

  // If not authenticated, redirect to login
  if (authError || !authUser) {
    redirect('/auth/login');
  }

  // Get user data directly from the database using server client
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single();

  // If user not found in database, redirect to login
  if (userError || !user) {
    redirect('/auth/login');
  }

  // If user is not admin, redirect to dashboard
  if (user.role !== 'admin') {
    redirect('/dashboard');
  }

  // Get staff count
  const { count } = await supabase
    .from('staff')
    .select('*', { count: 'exact', head: true });

  const total = count || 0;
  const limit = 20;
  const totalPages = Math.ceil(total / limit);

  // Fetch first page of staff
  const { data: staffData } = await supabase
    .from('staff')
    .select('*')
    .order('first_name', { ascending: true })
    .order('last_name', { ascending: true })
    .range(0, limit - 1);

  return (
    <StaffClient
      initialStaff={(staffData || []) as any}
      initialPagination={{
        page: 1,
        totalPages: totalPages || 1,
        total: total
      }}
    />
  );
}
