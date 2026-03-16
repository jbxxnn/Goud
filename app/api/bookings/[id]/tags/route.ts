import { NextRequest, NextResponse } from 'next/server';
import { BookingTagService } from '@/lib/database/booking-tags';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: bookingId } = await params;
    const tags = await BookingTagService.getTagsByBookingId(bookingId);
    return NextResponse.json({ success: true, data: tags });
  } catch (error) {
    console.error('Error fetching booking tags:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch booking tags' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: bookingId } = await params;
    const { tagId } = await req.json();

    if (!tagId) {
      return NextResponse.json({ success: false, error: 'tagId is required' }, { status: 400 });
    }

    await BookingTagService.addTagToBooking(bookingId, tagId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error adding tag to booking:', error);
    return NextResponse.json({ success: false, error: 'Failed to add tag to booking' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const start = Date.now();
  try {
    const { id: bookingId } = await params;
    const { tagIds } = await req.json();

    if (!Array.isArray(tagIds)) {
      return NextResponse.json({ success: false, error: 'tagIds must be an array' }, { status: 400 });
    }

    console.log(`[SyncTags] Starting sync for booking ${bookingId} with ${tagIds.length} tags`);
    const dbStart = Date.now();
    await BookingTagService.syncBookingTags(bookingId, tagIds);
    console.log(`[SyncTags] Database sync took ${Date.now() - dbStart}ms`);

    console.log(`[SyncTags] Total request time: ${Date.now() - start}ms`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`[SyncTags] Error after ${Date.now() - start}ms:`, error);
    return NextResponse.json({ success: false, error: 'Failed to sync booking tags' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: bookingId } = await params;
    const { searchParams } = new URL(req.url);
    const tagId = searchParams.get('tagId');

    if (!tagId) {
      return NextResponse.json({ success: false, error: 'tagId is required as a query parameter' }, { status: 400 });
    }

    await BookingTagService.removeTagFromBooking(bookingId, tagId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing tag from booking:', error);
    return NextResponse.json({ success: false, error: 'Failed to remove tag from booking' }, { status: 500 });
  }
}
