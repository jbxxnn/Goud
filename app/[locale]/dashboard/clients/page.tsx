import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ClientsClient from './clients-client';

export default async function ClientsPage() {
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

  // Fetch initial clients (default to role='client' to match client component)
  const { UserService } = await import('@/lib/database/users');
  const initialData = await UserService.getUsers(1, 50, 'client');

  return (
    <ClientsClient
      initialClients={initialData.success ? (initialData.data || []) : []}
      initialPagination={initialData.success && initialData.pagination ? {
        page: initialData.pagination.page,
        totalPages: initialData.pagination.total_pages,
        total: initialData.pagination.total
      } : {
        page: 1,
        totalPages: 1,
        total: 0
      }}
    />
  );
}
