import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SettingsSidebar } from '@/components/settings/settings-sidebar';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Verify admin access
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (userData?.role !== 'admin') {
    redirect('/dashboard');
  }

  return (
    <div className="container mx-auto py-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage global configuration for your workspace.</p>
      </div>
      
      <SettingsSidebar />
    </div>
  );
}
