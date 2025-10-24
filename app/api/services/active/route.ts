// Active services API route - GET (get all active services for booking)
import { NextRequest, NextResponse } from 'next/server';
import { ServiceService } from '@/lib/database/services';

export async function GET(request: NextRequest) {
  try {
    const result = await ServiceService.getActiveServices();

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Active services GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
