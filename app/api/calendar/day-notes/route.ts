import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const locationId = searchParams.get('locationId');

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Missing startDate or endDate' }, { status: 400 });
    }

    const supabase = await createClient();

    let query = supabase
      .from('calendar_day_notes')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate);

    if (locationId && locationId !== 'all') {
      // Using overlap operator (&&) to check if the locationId is in the location_ids array
      query = query.contains('location_ids', [locationId]);
    }

    const { data, error } = await query.order('date', { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('[day-notes] GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, date, content, locationIds } = body;

    if (!date || !content || !locationIds || !Array.isArray(locationIds)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = await createClient();

    // Check user role for permission (Admin, Staff, Assistant only)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userData || !['admin', 'staff', 'assistant'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    const payload = {
      date,
      content,
      location_ids: locationIds,
      created_by: user.id,
      updated_at: new Date().toISOString(),
    };

    let result;
    if (id) {
      // Update existing
      result = await supabase
        .from('calendar_day_notes')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
    } else {
      // Insert new
      result = await supabase
        .from('calendar_day_notes')
        .insert({ ...payload, created_at: new Date().toISOString() })
        .select()
        .single();
    }

    if (result.error) {
      throw result.error;
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error: any) {
    console.error('[day-notes] POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const supabase = await createClient();

    // Role check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || !['admin', 'staff', 'assistant'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await supabase
      .from('calendar_day_notes')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[day-notes] DELETE error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
