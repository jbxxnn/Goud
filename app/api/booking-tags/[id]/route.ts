import { NextRequest, NextResponse } from 'next/server';
import { BookingTagService } from '@/lib/database/booking-tags';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const data = await req.json();
    const { id } = await params;
    const updatedTag = await BookingTagService.updateBookingTag(id, data);
    return NextResponse.json({ success: true, data: updatedTag });
  } catch (error: any) {
    const { id } = await params;
    console.error(`Error in PUT /api/booking-tags/${id}:`, error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await BookingTagService.deleteBookingTag(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    const { id } = await params;
    console.error(`Error in DELETE /api/booking-tags/${id}:`, error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
