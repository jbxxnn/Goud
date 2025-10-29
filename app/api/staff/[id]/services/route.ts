import { NextRequest, NextResponse } from 'next/server';
import { StaffService } from '@/lib/database/staff';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Get staff service qualifications
    const services = await StaffService.getStaffServices(id);

    return NextResponse.json({
      success: true,
      data: services,
    });
  } catch (error) {
    console.error('Error fetching staff services:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch staff services',
      },
      { status: 500 }
    );
  }
}

