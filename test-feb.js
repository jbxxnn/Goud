const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data: shifts } = await supabase.from('shifts').select('*').like('start_time', '2026-02-02%');
  console.log(JSON.stringify(shifts, null, 2));
}
run();
