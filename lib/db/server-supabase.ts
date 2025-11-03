import { createClient } from '@supabase/supabase-js';

export function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
  if (!url || !serviceKey) {
    throw new Error('Supabase environment variables are not configured');
  }
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}







