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

  // If user is not admin or assistant, redirect to dashboard
  if (user.role !== 'admin' && user.role !== 'assistant') {
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
      ),
      service_policy_fields (
        id,
        field_type,
        title,
        description,
        is_required,
        field_order,
        service_policy_field_choices (
          id,
          title,
          price,
          choice_order
        )
      )
    `)
    .order('name')
    .range(0, limit - 1);

  // Note: We are not fetching addons server-side to keep it simple, 
  // they will be fetched on the client by React Query if needed, 
  // but for the table display name and categories are enough.
  // Actually, we SHOULD fetch policy_fields as they are needed for the edit modal.

  // Map raw database records to the Service interface
  const mappedServices = (servicesData || []).map(service => ({
    ...service,
    serviceCode: (service as any).service_code || null,
    policy_fields: ((service as any).service_policy_fields || []).map((field: any) => ({
      ...field,
      order: field.field_order ?? 0,
      choices: (field.service_policy_field_choices || []).map((choice: any) => ({
        ...choice,
        order: choice.choice_order ?? 0
      }))
    })),
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
      userRole={user.role}
    />
  );
}

