import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('booking_protocol_checklist_items')
      .select(`
        *,
        created_by_user:created_by (first_name, last_name),
        completed_by_user:completed_by (first_name, last_name)
      `)
      .eq('booking_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching protocol checklist:', error);
      return NextResponse.json({ error: 'Failed to fetch protocol checklist' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { content } = body;

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('booking_protocol_checklist_items')
      .insert({
        booking_id: id,
        content,
        created_by: user.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating protocol checklist item:', error);
      return NextResponse.json({ error: 'Failed to create item' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { is_completed } = await request.json();

    if (typeof is_completed !== 'boolean') {
      return NextResponse.json({ error: 'is_completed must be a boolean' }, { status: 400 });
    }

    const updates: {
      is_completed: boolean;
      completed_by: string | null;
      completed_at: string | null;
    } = {
      is_completed,
      completed_by: is_completed ? user.id : null,
      completed_at: is_completed ? new Date().toISOString() : null
    };

    const { data, error } = await supabase
      .from('booking_protocol_checklist_items')
      .update(updates)
      .eq('booking_id', id)
      .select();

    if (error) {
      console.error('Error bulk updating protocol checklist:', error);
      return NextResponse.json({ error: 'Failed to bulk update checklist' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
