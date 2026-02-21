import { NextRequest, NextResponse } from 'next/server';
import { ShiftService } from '@/lib/database/shifts';

interface RouteParams {
  params: Promise<{
    id: string; // The parent shift ID
  }>;
}

export async function POST(
  request: NextRequest,
  context: RouteParams
) {
  try {
    const { id: parent_shift_id } = await context.params;
    
    // Validate we actually have a parent shift
    const parentShift = await ShiftService.getShiftById(parent_shift_id);
    if (!parentShift || !parentShift.is_recurring) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Parent recurring shift not found' 
        },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { exception_date } = body;

    if (!exception_date) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing required field: exception_date' 
        },
        { status: 400 }
      );
    }

    // Create a tombstone exception (is_active: false)
    // This tells the frontend expander to skip generating the instance on this specific date
    const exceptionShift = await ShiftService.createShift({
      staff_id: parentShift.staff_id,
      location_id: parentShift.location_id,
      // Date is irrelevant for tombstones but required by schema. We use the exception date + original times.
      start_time: `${exception_date}T00:00:00.000Z`, 
      end_time: `${exception_date}T23:59:59.000Z`,
      is_recurring: false,
      parent_shift_id: parentShift.id,
      exception_date: exception_date,
      service_ids: [], // No services needed for a tombstone
    });

    // We must manually flip this to inactive since CreateShiftRequest doesn't conventionally accept is_active=false on creation yet.
    // The ShiftService itself can handle updates.
    await ShiftService.updateShift(exceptionShift.id, {
      is_active: false,
    });

    return NextResponse.json({
      success: true,
      data: exceptionShift,
    });
  } catch (error) {
    console.error('Shift Exception POST error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
