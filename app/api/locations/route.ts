// Locations API routes - GET (list locations) and POST (create location)
import { NextRequest, NextResponse } from 'next/server';
import { LocationService } from '@/lib/database/locations';
import { CreateLocationRequest } from '@/lib/types/location';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const activeOnly = searchParams.get('active_only') === 'true';
    const search = searchParams.get('search') || undefined;
    const city = searchParams.get('city') || undefined;
    const state = searchParams.get('state') || undefined;

    const params = {
      search,
      city,
      state,
      active_only: activeOnly,
      page,
      limit,
    };

    const result = await LocationService.getLocations(params);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Locations GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateLocationRequest = await request.json();
    
    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { error: 'Location name is required' },
        { status: 400 }
      );
    }

    if (!body.address) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }

    // Simplified validation - only name and address are required

    // Check if location name already exists
    const nameExists = await LocationService.locationNameExists(body.name);
    if (nameExists.success && nameExists.exists) {
      return NextResponse.json(
        { error: 'Location name already exists' },
        { status: 400 }
      );
    }

    const result = await LocationService.createLocation(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Locations POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
