import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable() {
  const { data, error } = await supabase
    .from('booking_checklist_items')
    .select('*')
    .limit(1);

  if (error) {
    if (error.code === '42P01') { // undefined_table
      console.log('Table booking_checklist_items does not exist.');
    } else {
      console.error('Error checking table:', error);
    }
  } else {
    console.log('Table booking_checklist_items exists.');
  }
}

checkTable();
