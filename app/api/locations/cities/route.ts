// Cities API route - GET (get unique cities)
import { NextRequest, NextResponse } from 'next/server';
import { LocationService } from '@/lib/database/locations';

export async function GET(request: NextRequest) {
  try {
    const result = await LocationService.getUniqueCities();

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Cities GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
