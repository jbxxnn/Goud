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

  // Get services count
  const { count } = await supabase
    .from('services')
    .select('*', { count: 'exact', head: true });

  const total = count || 0;
  const limit = 20;
  const totalPages = Math.ceil(total / limit);

  // Fetch first page of services
  const { data: servicesData } = await supabase
    .from('services')
    .select(`
      *,
      service_categories (
        id,
        name
      )
    `)
    .order('name')
    .range(0, limit - 1);

  // Note: We are not fetching staff_ids or addons server-side to keep it simple, 
  // they will be fetched on the client by React Query if needed, 
  // but for the table display name and categories are enough.
  // Actually, let's just pass empty array for now and let the client fetch, 
  // or fetch them properly. For now, let's just make sure pagination numbers are correct.

  // Map raw database records to the Service interface
  const mappedServices = (servicesData || []).map(service => ({
    ...service,
    serviceCode: (service as any).service_code || null,
    policy_fields: [],
    addons: []
  }));

  return (
    <ServicesClient
      initialServices={mappedServices as any}
      initialPagination={{
        page: 1,
        totalPages: totalPages || 1,
        total: total
      }}
    />
  );
}

