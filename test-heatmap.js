const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  try {
    const { data: shifts, error: shiftsError } = await supabase.from('shifts').select('*').order('created_at', { ascending: false }).limit(1);
    if (shiftsError) {
      console.error('Shifts error:', shiftsError);
      return;
    }
    if (!shifts || shifts.length === 0) return console.error('not found shift');
    const shift = shifts[0];
    
    const { data: ss, error: ssError } = await supabase.from('shift_services').select('service_id').eq('shift_id', shift.id);
    if (ssError) {
      console.error('Shift services error:', ssError);
      return;
    }
    const serviceId = ss[0]?.service_id;
    console.log('Shift start:', shift.start_time, 'Service:', serviceId, 'Location:', shift.location_id);
    
    if (!serviceId || !shift.location_id) {
       console.error('Missing service or location');
       return;
    }

    const url = `http://localhost:3000/api/availability/heatmap?serviceId=${serviceId}&locationId=${shift.location_id}&start=2026-02-01&end=2026-03-31`;
    console.log('Fetching:', url);
    const res = await fetch(url);
    if (!res.ok) {
       console.error('Heatmap error:', res.status, await res.text());
       return;
    }
    const data = await res.json();
    console.log('Days with slots:', JSON.stringify(data.days?.filter(d => d.availableSlots > 0), null, 2));
  } catch (e) {
    console.error('Caught error:', e);
  }
}

run();
