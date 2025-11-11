// Simplified locations API routes - GET, PUT, DELETE
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { UpdateLocationRequest } from '@/lib/types/location_simple';

const deriveLocationCode = (name?: string, providedCode?: string): string | null => {
  const normalizedProvided = providedCode?.replace(/[^A-Za-z]/g, '').toUpperCase() ?? '';
  if (normalizedProvided.length === 3) {
    return normalizedProvided;
  }

  if (!name) {
    return normalizedProvided.length ? normalizedProvided : null;
  }

  const normalizedName = name.replace(/[^A-Za-z]/g, '').toUpperCase();
  const generated = normalizedName.slice(0, 3);
  return generated.length ? generated : null;
};

const mapLocationRecord = (location: Record<string, any>) => {
  if (!location) return location;
  return {
    ...location,
    locationCode: location.location_code ?? null,
  };
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Location ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    const formattedData = mapLocationRecord(data);

    return NextResponse.json({ success: true, data: formattedData });
  } catch (error) {
    console.error('Location GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body: UpdateLocationRequest = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Location ID is required' },
        { status: 400 }
      );
    }

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof body.name !== 'undefined') {
      updates.name = body.name;
    }

    if (typeof body.address !== 'undefined') {
      updates.address = body.address;
    }

    if (typeof body.phone !== 'undefined') {
      updates.phone = body.phone || null;
    }

    if (typeof body.email !== 'undefined') {
      updates.email = body.email || null;
    }

    if (typeof body.color !== 'undefined') {
      updates.color = body.color;
    }

    if (typeof body.is_active !== 'undefined') {
      updates.is_active = body.is_active;
    }

    if (typeof body.locationCode !== 'undefined') {
      updates.location_code = deriveLocationCode(body.name, body.locationCode);
    } else if (typeof body.name !== 'undefined' && typeof updates.location_code === 'undefined') {
      // If name changes but no code provided, attempt to regenerate
      updates.location_code = deriveLocationCode(body.name);
    }

    const { data, error } = await supabase
      .from('locations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    const formattedData = mapLocationRecord(data);

    return NextResponse.json({ success: true, data: formattedData });
  } catch (error) {
    console.error('Location PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Location ID is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('locations')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    const formattedData = mapLocationRecord(data);

    return NextResponse.json({ success: true, data: formattedData });
  } catch (error) {
    console.error('Location DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
