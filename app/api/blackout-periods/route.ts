// Blackout Periods API routes - GET (list) and POST (create)
import { NextRequest, NextResponse } from 'next/server';
import { ShiftService } from '@/lib/database/shifts';
import { CreateBlackoutPeriodRequest } from '@/lib/types/shift';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const location_id = searchParams.get('location_id') || undefined;
    const staff_id = searchParams.get('staff_id') || undefined;
    const start_date = searchParams.get('start_date') || undefined;
    const end_date = searchParams.get('end_date') || undefined;
    const active_only = searchParams.get('active_only') === 'true';

    const result = await ShiftService.getBlackoutPeriods({
      page,
      limit,
      location_id,
      staff_id,
      start_date,
      end_date,
      active_only,
    });

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
    console.error('Blackout periods GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateBlackoutPeriodRequest = await request.json();

    // Validate required fields
    if (!body.start_date || !body.end_date || !body.reason) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: start_date, end_date, reason',
        },
        { status: 400 }
      );
    }

    // Validate date range
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

    // Create blackout period
    const blackout = await ShiftService.createBlackoutPeriod(body);

    return NextResponse.json({
      success: true,
      data: blackout,
    });
  } catch (error) {
    console.error('Blackout periods POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

