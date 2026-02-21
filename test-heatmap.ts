const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data: shifts } = await supabase.from('shifts').select('id, location_id, start_time').eq('start_time', '2026-03-02T08:00:00+00:00');
  if (!shifts || shifts.length === 0) return console.log('not found shift');
  const shift = shifts[0];
  const { data: ss } = await supabase.from('shift_services').select('service_id').eq('shift_id', shift.id);
  const serviceId = ss[0]?.service_id;
  console.log('Service:', serviceId, 'Location:', shift.location_id);
  
  const url = `http://localhost:3000/api/availability/heatmap?serviceId=${serviceId}&locationId=${shift.location_id}&start=2026-02-01&end=2026-03-31`;
  const res = await fetch(url);
  const data = await res.json();
  console.log(JSON.stringify(data.days?.filter((d: any) => d.availableSlots > 0), null, 2));
}
run();
