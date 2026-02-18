import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import MidwivesClient from './midwives-client';

export default async function MidwivesPage() {
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

  // If user is not admin or assistant, redirect to dashboard
  if (user.role !== 'admin' && user.role !== 'assistant') {
    redirect('/dashboard');
  }

  // Get midwives count
  const { count } = await supabase
    .from('midwives')
    .select('*', { count: 'exact', head: true });

  const total = count || 0;
  const limit = 20;
  const totalPages = Math.ceil(total / limit);

  // Fetch first page of midwives
  const { data: midwivesData } = await supabase
    .from('midwives')
    .select('*')
    .order('first_name', { ascending: true })
    .order('last_name', { ascending: true })
    .range(0, limit - 1);

  return (
    <MidwivesClient
      initialMidwives={(midwivesData || []) as any}
      initialPagination={{
        page: 1,
        totalPages: totalPages || 1,
        total: total
      }}
      userRole={user.role}
    />
  );
}





