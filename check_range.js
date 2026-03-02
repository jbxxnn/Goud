
const { createClient } = require('@supabase/supabase-js');

async function checkRange() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(url, key);

  console.log('--- Order by start_time DESC (latest starts) ---');
  const { data: latest } = await supabase
    .from('bookings')
    .select('start_time')
    .order('start_time', { ascending: false })
    .limit(5);
  console.log(latest);

  console.log('\n--- Order by start_time ASC (earliest starts) ---');
  const { data: earliest } = await supabase
    .from('bookings')
    .select('start_time')
    .order('start_time', { ascending: true })
    .limit(5);
  console.log(earliest);

  console.log('\n--- Count by status ---');
  const { data: statusCounts } = await supabase.rpc('get_status_counts').catch(() => ({})); 
  // Fallback if RPC doesn't exist
  const statuses = ['confirmed', 'pending', 'cancelled', 'ongoing', 'completed', 'no_show'];
  for (const s of statuses) {
    const { count } = await supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', s);
    console.log(`${s}: ${count}`);
  }
}

checkRange();
