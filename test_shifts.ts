import { ShiftService } from './lib/database/shifts';

async function test() {
  const shiftsResponse = await ShiftService.getShiftsWithDetails({
    active_only: true,
    limit: 1000,
  });
  console.log("Found shifts:", shiftsResponse.data?.length);
  const staffIds = new Set(shiftsResponse.data?.map(s => s.staff_id));
  console.log("Staff IDs:", Array.from(staffIds));
}

test().catch(console.error);
