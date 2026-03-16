import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: checklistId } = await params;
    const supabase = await createClient();

    // Check authentication and role
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData?.role !== 'admin' && userData?.role !== 'assistant') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { serviceIds } = body;

    if (!Array.isArray(serviceIds)) {
      return NextResponse.json({ error: 'serviceIds must be an array' }, { status: 400 });
    }

    // Use a transaction (Supabase RPC or sequential calls)
    // To sync, we first delete existing mappings and then insert new ones
    
    // 1. Delete all existing mappings for this checklist
    const { error: deleteError } = await supabase
      .from('master_checklist_services')
      .delete()
      .eq('checklist_id', checklistId);

    if (deleteError) {
      console.error('Error deleting existing mappings:', deleteError);
      return NextResponse.json({ error: 'Failed to sync service mappings' }, { status: 500 });
    }

    // 2. Insert new mappings if there are any
    if (serviceIds.length > 0) {
      const newMappings = serviceIds.map(serviceId => ({
        checklist_id: checklistId,
        service_id: serviceId
      }));

      const { error: insertError } = await supabase
        .from('master_checklist_services')
        .insert(newMappings);

      if (insertError) {
        console.error('Error inserting new mappings:', insertError);
        return NextResponse.json({ error: 'Failed to sync service mappings' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
