// Shifts API routes - GET (list shifts) and POST (create shift)
import { NextRequest, NextResponse } from 'next/server';
import { ShiftService } from '@/lib/database/shifts';
import { CreateShiftRequest } from '@/lib/types/shift';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const staff_id = searchParams.get('staff_id') || undefined;
    const location_id = searchParams.get('location_id') || undefined;
    const service_id = searchParams.get('service_id') || undefined;
    const start_date = searchParams.get('start_date') || undefined;
    const end_date = searchParams.get('end_date') || undefined;
    const is_recurring = searchParams.get('is_recurring') === 'true' ? true : searchParams.get('is_recurring') === 'false' ? false : undefined;
    const active_only = searchParams.get('active_only') === 'true';
    const with_details = searchParams.get('with_details') === 'true';

    let result;
    if (with_details) {
      result = await ShiftService.getShiftsWithDetails({
        page,
        limit,
        staff_id,
        location_id,
        start_date,
        end_date,
        is_recurring,
        active_only,
      });
    } else {
      result = await ShiftService.getShifts({
        page,
        limit,
        staff_id,
        location_id,
        service_id,
        start_date,
        end_date,
        is_recurring,
        active_only,
      });
    }

    const totalPages = Math.ceil(result.total / limit);

    return NextResponse.json({
      success: true,
      data: result.data,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Shifts GET error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateShiftRequest = await request.json();

    // Validate required fields
    if (!body.staff_id || !body.location_id || !body.start_time || !body.end_time) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing required fields: staff_id, location_id, start_time, end_time' 
        },
        { status: 400 }
      );
    }

    // Validate time range
    const startTime = new Date(body.start_time);
    const endTime = new Date(body.end_time);
    if (endTime <= startTime) {
      return NextResponse.json(
        { 
          success: false,
          error: 'End time must be after start time' 
        },
        { status: 400 }
      );
    }

    // Validate shift for conflicts
    const validation = await ShiftService.validateShift(body);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Shift conflicts detected',
          conflicts: validation.conflicts,
        },
        { status: 409 }
      );
    }

    // Create shift
    const shift = await ShiftService.createShift(body);

    return NextResponse.json({
      success: true,
      data: shift,
    });
  } catch (error) {
    console.error('Shifts POST error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

