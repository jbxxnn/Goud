import { NextRequest, NextResponse } from 'next/server';
import { ShiftService } from '@/lib/database/shifts';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const shiftId = searchParams.get('shift_id');
    
    if (!shiftId) {
      return NextResponse.json({ success: false, error: 'shift_id is required' }, { status: 400 });
    }

    const shiftBreaks = await ShiftService.getShiftBreaks(shiftId);
    return NextResponse.json({ success: true, data: shiftBreaks });
  } catch (error: any) {
    console.error('Error in GET /api/shift-breaks:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const newBreak = await ShiftService.createShiftBreak(data);
    return NextResponse.json({ success: true, data: newBreak });
  } catch (error: any) {
    console.error('Error in POST /api/shift-breaks:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
