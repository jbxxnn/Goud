import { NextRequest, NextResponse } from 'next/server';
import { ShiftService } from '@/lib/database/shifts';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await req.json();
    const updatedBreak = await ShiftService.updateShiftBreak(id, data);
    return NextResponse.json({ success: true, data: updatedBreak });
  } catch (error: any) {
    console.error('Error in PUT /api/shift-breaks/[id]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await ShiftService.deleteShiftBreak(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in DELETE /api/shift-breaks/[id]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
