// Individual Blackout Period API routes - GET, PUT, DELETE
import { NextRequest, NextResponse } from 'next/server';
import { ShiftService } from '@/lib/database/shifts';
import { UpdateBlackoutPeriodRequest } from '@/lib/types/shift';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function PUT(request: NextRequest, context: RouteParams) {
  try {
    const { id } = await context.params;
    const body: UpdateBlackoutPeriodRequest = await request.json();

    // Validate date range if both dates are provided
    if (body.start_date && body.end_date) {
      const startDate = new Date(body.start_date);
      const endDate = new Date(body.end_date);
      if (endDate <= startDate) {
        return NextResponse.json(
          {
            success: false,
            error: 'End date must be after start date',
          },
          { status: 400 }
        );
      }
    }

    // Update blackout period
    const blackout = await ShiftService.updateBlackoutPeriod(id, body);

    return NextResponse.json({
      success: true,
      data: blackout,
    });
  } catch (error) {
    console.error('Blackout period PUT error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteParams) {
  try {
    const { id } = await context.params;

    await ShiftService.deleteBlackoutPeriod(id);

    return NextResponse.json({
      success: true,
      message: 'Blackout period deleted successfully',
    });
  } catch (error) {
    console.error('Blackout period DELETE error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

