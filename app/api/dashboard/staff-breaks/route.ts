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

    if (!staffId) {
      return NextResponse.json(
        { success: false, error: 'Missing staffId' },
        { status: 400 }
      );
    }

    // 1. Fetch all active shifts for the staff member
    // We fetch all active shifts to ensure we capture recurring parents that started in the past
    const shiftsResponse = await ShiftService.getShiftsWithDetails({
      staff_id: staffId,
      active_only: true,
      limit: 1000,
    });

    const shifts = shiftsResponse.data || [];

    // 2. Expand recurring shifts into instances
    // Use the provided range or default to +/- 1 month if not provided
    const rangeStart = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const rangeEnd = endDate ? new Date(endDate) : new Date(new Date().setMonth(new Date().getMonth() + 1));

    const expandedShifts = expandRecurringShifts(shifts as ShiftWithDetails[], rangeStart, rangeEnd);

    // 3. For each expanded shift, get its breaks
    const allBreaks = [];
    for (const shift of expandedShifts) {
      const instanceDate = shift._instanceDate ? shift._instanceDate.split('T')[0] : shift.start_time.split('T')[0];
      const breaks = await ShiftService.getShiftBreaks(shift.id, instanceDate);
      
      // Add staff info to each break for the calendar mapper
      allBreaks.push(...breaks.map(b => ({
        ...b,
        staff: {
          id: shift.staff_id,
          first_name: shift.staff_first_name,
          last_name: shift.staff_last_name
        }
      })));
    }

    // 4. Return the aggregated breaks
    return NextResponse.json({
      success: true,
      data: allBreaks,
    });
  } catch (error) {
    console.error('Error in GET /api/dashboard/staff-breaks:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
