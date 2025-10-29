import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ShiftsClient from './shifts-client';

export default async function ShiftsPage() {
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

  // Fetch calendar settings server-side for faster initial load
  let initialCalendarSettings = null;
  try {
    const { data: settingsData, error: settingsError } = await supabase
      .from('calendar_settings')
      .select('*')
      .order('setting_key');

    if (!settingsError && settingsData) {
      // Convert settings array to object format
      const settingsObject = settingsData.reduce((acc, setting) => {
        acc[setting.setting_key] = setting.setting_value;
        return acc;
      }, {} as Record<string, unknown>);
      initialCalendarSettings = settingsObject;
    }
  } catch (error) {
    console.error('Error fetching calendar settings:', error);
    // Continue without settings, will use defaults
  }

  return <ShiftsClient initialCalendarSettings={initialCalendarSettings} />;
}

