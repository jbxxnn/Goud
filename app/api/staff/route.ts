import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { StaffSearchParams } from '@/lib/types/staff';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const withAssignments = searchParams.get('with_assignments') === 'true';
    
    const params: StaffSearchParams = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '10'),
      search: searchParams.get('search') || undefined,
      role: searchParams.get('role') as any || undefined,
      location_id: searchParams.get('location_id') || undefined,
      service_id: searchParams.get('service_id') || undefined,
      active_only: searchParams.get('active_only') === 'true',
    };

    const supabase = await createClient();
    
    // If with_assignments is true, use a single query with joins
    if (withAssignments) {
      let query = supabase
        .from('staff')
        .select(`
          *,
          staff_locations (
            location_id,
            is_primary
          ),
          staff_services (
            service_id,
            is_qualified
          )
        `, { count: 'exact' });

      // Apply filters
      if (params.search) {
        query = query.or(`first_name.ilike.%${params.search}%,last_name.ilike.%${params.search}%,email.ilike.%${params.search}%`);
      }

      if (params.role) {
        query = query.eq('role', params.role);
      }

      if (params.active_only) {
        query = query.eq('is_active', true);
      }

      // Apply pagination
      const page = params.page ?? 1;
      const limit = params.limit ?? 1000; // For assignments, usually want all
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      query = query.range(from, to).order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }

      // Transform the data to include location_ids and service_ids arrays
      const transformedData = (data || []).map((staff: any) => ({
        ...staff,
        location_ids: (staff.staff_locations || []).map((sl: any) => sl.location_id),
        service_ids: (staff.staff_services || [])
          .filter((ss: any) => ss.is_qualified)
          .map((ss: any) => ss.service_id),
      }));

      // Cache headers with version for cache invalidation
      // Use a version query param to bust cache when needed
      const cacheVersion = searchParams.get('v') || Date.now().toString();
      const cacheHeaders = {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
        'X-Cache-Version': cacheVersion,
      };

      return NextResponse.json({
        success: true,
        data: transformedData,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      }, { headers: cacheHeaders });
    }

    // Original query without assignments
    let query = supabase
      .from('staff')
      .select('*', { count: 'exact' });

    // Apply filters
    if (params.search) {
      query = query.or(`first_name.ilike.%${params.search}%,last_name.ilike.%${params.search}%,email.ilike.%${params.search}%`);
    }

    if (params.role) {
      query = query.eq('role', params.role);
    }

    if (params.active_only) {
      query = query.eq('is_active', true);
    }

    // Apply pagination
    const page = params.page ?? 1;
    const limit = params.limit ?? 10;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    query = query.range(from, to).order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Staff GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Check authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { location_ids, service_ids, ...staffFields } = body;

    // Create staff record
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .insert(staffFields)
      .select()
      .single();

    if (staffError) {
      return NextResponse.json(
        { error: staffError.message },
        { status: 400 }
      );
    }

    // Add location assignments if provided
    if (location_ids && location_ids.length > 0) {
      const locationAssignments = location_ids.map((location_id: string, index: number) => ({
        staff_id: staff.id,
        location_id,
        is_primary: index === 0
      }));

      const { error: locationError } = await supabase
        .from('staff_locations')
        .insert(locationAssignments);

      if (locationError) {
        console.error('Error creating location assignments:', locationError);
      }
    }

    // Add service qualifications if provided
    if (service_ids && service_ids.length > 0) {
      const serviceQualifications = service_ids.map((service_id: string) => ({
        staff_id: staff.id,
        service_id,
        is_qualified: true,
        qualification_date: new Date().toISOString().split('T')[0]
      }));

      const { error: serviceError } = await supabase
        .from('staff_services')
        .insert(serviceQualifications);

      if (serviceError) {
        console.error('Error creating service qualifications:', serviceError);
      }
    }

    // Invalidate cache by returning a cache-busting header
    // This tells clients to fetch fresh data on next request
    return NextResponse.json({
      success: true,
      data: staff,
      cacheInvalidated: true,
    }, {
      headers: {
        'Cache-Control': 'no-cache, must-revalidate',
        'X-Cache-Invalidate': 'staff-assignments',
      }
    });
  } catch (error) {
    console.error('Staff POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}