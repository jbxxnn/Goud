// Individual Shift API routes - GET, PUT, DELETE
import { NextRequest, NextResponse } from 'next/server';
import { ShiftService } from '@/lib/database/shifts';
import { UpdateShiftRequest } from '@/lib/types/shift';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(
  request: NextRequest,
  context: RouteParams
) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const with_details = searchParams.get('with_details') === 'true';

    let shift;
    if (with_details) {
      shift = await ShiftService.getShiftWithDetails(id);
    } else {
      shift = await ShiftService.getShiftById(id);
    }

    if (!shift) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Shift not found' 
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: shift,
    });
  } catch (error) {
    console.error('Shift GET error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: RouteParams
) {
  try {
    const { id } = await context.params;
    const body: UpdateShiftRequest = await request.json();

    // Validate time range if both times are provided
    if (body.start_time && body.end_time) {
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
    }

    // Get existing shift to merge with update data
    const existingShift = await ShiftService.getShiftById(id);
    if (!existingShift) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Shift not found' 
        },
        { status: 404 }
      );
    }

    // Validate shift for conflicts
    const validation = await ShiftService.validateShift({
      id,
      staff_id: body.staff_id || existingShift.staff_id,
      location_id: body.location_id || existingShift.location_id,
      start_time: body.start_time || existingShift.start_time,
      end_time: body.end_time || existingShift.end_time,
    });

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

    // Update shift
    const shift = await ShiftService.updateShift(id, body);

    return NextResponse.json({
      success: true,
      data: shift,
    });
  } catch (error) {
    console.error('Shift PUT error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteParams
) {
  try {
    const { id } = await context.params;

    // Check if shift exists
    const shift = await ShiftService.getShiftById(id);
    if (!shift) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Shift not found' 
        },
        { status: 404 }
      );
    }

    await ShiftService.deleteShift(id);

    return NextResponse.json({
      success: true,
      message: 'Shift deleted successfully',
    });
  } catch (error) {
    console.error('Shift DELETE error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

