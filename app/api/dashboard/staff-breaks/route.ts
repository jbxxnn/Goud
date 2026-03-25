import { NextRequest, NextResponse } from 'next/server';
import { ShiftService } from '@/lib/database/shifts';
import { expandRecurringShifts } from '@/lib/utils/expand-recurring-shifts';
import { ShiftWithDetails } from '@/lib/types/shift';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get('staffId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // 1. Determine date range
    // Use the provided range or default to +/- 1 month if not provided
    const rangeStart = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const rangeEnd = endDate ? new Date(endDate) : new Date(new Date().setMonth(new Date().getMonth() + 1));

    // 2. Fetch active shifts
    // We fetch active shifts, using start_date and end_date to filter single shifts, while keeping recurring parents
    const shiftQueryParams: any = {
      active_only: true,
      limit: 1000,
      start_date: rangeStart.toISOString(),
      end_date: rangeEnd.toISOString(),
    };
    
    if (staffId && staffId !== 'undefined' && staffId !== 'null') {
      shiftQueryParams.staff_id = staffId;
    }

    const shiftsResponse = await ShiftService.getShiftsWithDetails(shiftQueryParams);
    const shifts = shiftsResponse.data || [];

    // 3. Expand recurring shifts into instances
    const expandedShifts = expandRecurringShifts(shifts as ShiftWithDetails[], rangeStart, rangeEnd);

    // 3. For each expanded shift, get its breaks concurrently in chunks to prevent connection pool exhaustion while maximizing speed
    const allBreaks = [];
    const debugBreaksCounts = [];
    
    // Chunking to 30 concurrent requests to hit the database in parallel
    const chunkSize = 30;
    for (let i = 0; i < expandedShifts.length; i += chunkSize) {
      const chunk = expandedShifts.slice(i, i + chunkSize);
      
      const chunkPromises = chunk.map(async (shift) => {
        const instanceDate = shift._instanceDate ? shift._instanceDate.split('T')[0] : shift.start_time.split('T')[0];
        const breaks = await ShiftService.getShiftBreaks(shift.id, instanceDate);
        return { shift, breaks };
      });
      
      const chunkResults = await Promise.all(chunkPromises);
      
      for (const { shift, breaks } of chunkResults) {
        debugBreaksCounts.push({ shiftId: shift.id, breaksCount: breaks.length });
        allBreaks.push(...breaks.map(b => ({
          ...b,
          location_id: shift.location_id,
          staff: {
            id: shift.staff_id,
            first_name: shift.staff_first_name,
            last_name: shift.staff_last_name
          }
        })));
      }
    }

    return NextResponse.json({
      success: true,
      data: allBreaks,
      debug: {
        shiftsCount: shifts.length,
        expandedShiftsCount: expandedShifts.length,
        debugBreaksCounts,
      }
    });
  } catch (error) {
    console.error('Error in GET /api/dashboard/staff-breaks:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
