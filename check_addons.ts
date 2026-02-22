import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase.from('bookings').select('id, created_at').order('created_at', { ascending: false }).limit(3);
  console.log("Latest bookings:", data);
  if (data) {
     for (const b of data) {
         const { data: addons } = await supabase.from('booking_addons').select('*').eq('booking_id', b.id);
         console.log("Addons for", b.id, ":", addons);
     }
  }
}
main();
