import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params;
    const { serviceId } = await request.json();
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!serviceId) {
      return NextResponse.json({ error: 'Service ID is required' }, { status: 400 });
    }

    // 1. Get all master checklists for this service
    const { data: checklists, error: checklistError } = await supabase
      .from('master_checklist_services')
      .select(`
        master_checklist:checklist_id (
          id,
          master_checklist_items (
            content,
            item_order
          )
        )
      `)
      .eq('service_id', serviceId);

    if (checklistError) {
      console.error('Error fetching master checklists:', checklistError);
      return NextResponse.json({ error: 'Failed to fetch master checklists' }, { status: 500 });
    }

    // Flatten all items from all associated checklists
    const allMasterItems = checklists?.flatMap((c: any) => 
      c.master_checklist?.master_checklist_items || []
    ) || [];

    if (allMasterItems.length === 0) {
      return NextResponse.json({ message: 'No master items found for this service', addedCount: 0 });
    }

    // 2. Get existing checklist items for this booking to avoid duplicates
    const { data: existingItems, error: existingError } = await supabase
      .from('booking_protocol_checklist_items')
      .select('content')
      .eq('booking_id', bookingId);

    if (existingError) {
      console.error('Error fetching existing protocol items:', existingError);
      return NextResponse.json({ error: 'Failed to fetch existing items' }, { status: 500 });
    }

    const existingContents = new Set(existingItems?.map(i => i.content));

    // 3. Filter items that don't exist yet
    const itemsToAdd = allMasterItems
      .filter(item => !existingContents.has(item.content))
      .map(item => ({
        booking_id: bookingId,
        content: item.content,
        created_by: user.id
      }));

    if (itemsToAdd.length === 0) {
      return NextResponse.json({ message: 'All items already exist', addedCount: 0 });
    }

    // 4. Batch insert new items
    const { error: insertError } = await supabase
      .from('booking_protocol_checklist_items')
      .insert(itemsToAdd);

    if (insertError) {
      console.error('Error inserting protocol checklist items:', insertError);
      return NextResponse.json({ error: 'Failed to sync protocol items' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Checklist synced successfully', 
      addedCount: itemsToAdd.length 
    });

  } catch (error) {
    console.error('Unexpected error in sync:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
