// Simplified locations API - GET (list locations) and POST (create location)
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CreateLocationRequest } from '@/lib/types/location_simple';

const deriveLocationCode = (name: string, providedCode?: string): string | null => {
  const normalizedProvided = providedCode?.replace(/[^A-Za-z]/g, '').toUpperCase() ?? '';
  if (normalizedProvided.length === 3) {
    return normalizedProvided;
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const activeOnly = searchParams.get('active_only') === 'true';
    const search = searchParams.get('search') || undefined;

    const supabase = await createClient();
    
    let query = supabase
      .from('locations')
      .select('*', { count: 'exact' })
      .order('name');

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,address.ilike.%${search}%`);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await query.range(from, to);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    const totalPages = count ? Math.ceil(count / limit) : 0;

    const formattedData = (data || []).map(mapLocationRecord);

    return NextResponse.json({
      success: true,
      data: formattedData,
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: totalPages,
      },
    });
  } catch (error) {
    console.error('Locations GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const body: CreateLocationRequest = await request.json();
    
    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { error: 'Location name is required' },
        { status: 400 }
      );
    }

    if (!body.address) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }

    const locationCode = deriveLocationCode(body.name, body.locationCode ?? undefined);

    const { data, error } = await supabase
      .from('locations')
      .insert({
        name: body.name,
        location_code: locationCode,
        address: body.address,
        phone: body.phone || null,
        email: body.email || null,
        color: body.color || '#3b82f6',
        is_active: body.is_active ?? true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    const formattedData = mapLocationRecord(data);

    return NextResponse.json({ success: true, data: formattedData }, { status: 201 });
  } catch (error) {
    console.error('Locations POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}