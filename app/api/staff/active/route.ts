// Active staff API route - GET (get all active staff)
import { NextRequest, NextResponse } from 'next/server';
import { StaffService } from '@/lib/database/staff';

export async function GET(request: NextRequest) {
  try {
    const result = await StaffService.getActiveStaff();

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Active staff GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
