import { NextRequest, NextResponse } from 'next/server';
import { StaffService } from '@/lib/database/staff';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Get staff location assignments
    const locations = await StaffService.getStaffLocations(id);

    return NextResponse.json({
      success: true,
      data: locations,
    });
  } catch (error) {
    console.error('Error fetching staff locations:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch staff locations',
      },
      { status: 500 }
    );
  }
}

