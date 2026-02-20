import { NextRequest, NextResponse } from 'next/server';
import { ShiftService } from '@/lib/database/shifts';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get('active_only') === 'true';

    const sitewideBreaks = await ShiftService.getSitewideBreaks(activeOnly);
    
    return NextResponse.json({ success: true, data: sitewideBreaks });
  } catch (error: any) {
    console.error('Error in GET /api/sitewide-breaks:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const newBreak = await ShiftService.createSitewideBreak(data);
    return NextResponse.json({ success: true, data: newBreak });
  } catch (error: any) {
    console.error('Error in POST /api/sitewide-breaks:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
