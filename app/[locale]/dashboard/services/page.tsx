import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ServicesClient from '../services/services-client';

export default async function ServicesPage() {
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

  return (
    <ServicesClient 
      initialServices={[]}
      initialPagination={{
        page: 1,
        totalPages: 1
      }}
    />
  );
}

