import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id, itemId } = await params;
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    // Allow updating content, is_completed, and comment
    const allowedUpdates = ['content', 'is_completed', 'comment'];
    const updates: any = {};

    Object.keys(body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = body[key];
      }
    });

    // If marking as completed, set completed_by and completed_at
    if (updates.is_completed === true) {
      updates.completed_by = user.id;
      updates.completed_at = new Date().toISOString();
    } else if (updates.is_completed === false) {
      updates.completed_by = null;
      updates.completed_at = null;
    }

    const { data, error } = await supabase
      .from('booking_checklist_items')
      .update(updates)
      .eq('id', itemId)
      .eq('booking_id', id) // Security check to ensure item belongs to booking
      .select()
      .single();

    if (error) {
      console.error('Error updating checklist item:', error);
      return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id, itemId } = await params;
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('booking_checklist_items')
      .delete()
      .eq('id', itemId)
      .eq('booking_id', id);

    if (error) {
      console.error('Error deleting checklist item:', error);
      return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
