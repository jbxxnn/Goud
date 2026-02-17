import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SitewideBreaksManager } from '@/components/settings/sitewide-breaks-manager';

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
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>
      
      <SitewideBreaksManager />
    </div>
  );
}
