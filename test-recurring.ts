const { createClient } = require('@supabase/supabase-js');
const { expandRecurringShifts } = require('./lib/utils/expand-recurring-shifts.ts');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data: shifts } = await supabase.from('shifts').select('*');
  const d = new Date('2026-02-01T00:00:00Z');
  const dEnd = new Date('2026-02-28T23:59:59Z');
  const expanded = expandRecurringShifts(shifts, d, dEnd);
  
  const feb2 = expanded.filter(s => s.start_time.startsWith('2026-02-02'));
  console.log('Shifts on Feb 2:', feb2.length);
}
run();
