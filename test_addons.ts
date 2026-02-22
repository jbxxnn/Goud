import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: addonsData, error } = await supabase
      .from('booking_addons')
      .select(`
        booking_id,
        quantity,
        price_eur_cents,
        service_addons (
          id,
          name,
          description,
          price
        ),
        service_addon_options (
          id,
          name
        )
      `)
      .eq('booking_id', '8bc4abd3-ada5-42d5-b704-ea1e82cc68bb');
  console.log("Error:", error);
  console.log("Data:", addonsData);
}
main();
