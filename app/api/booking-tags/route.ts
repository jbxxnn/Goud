import { NextRequest, NextResponse } from 'next/server';
import { BookingTagService } from '@/lib/database/booking-tags';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get('active_only') === 'true' || searchParams.get('activeOnly') === 'true';

    const tags = await BookingTagService.getBookingTags(activeOnly);
    
    return NextResponse.json({ success: true, data: tags });
  } catch (error: any) {
    console.error('Error in GET /api/booking-tags:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const newTag = await BookingTagService.createBookingTag(data);
    return NextResponse.json({ success: true, data: newTag });
  } catch (error: any) {
    console.error('Error in POST /api/booking-tags:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
