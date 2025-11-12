import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Staff ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    // Get staff data
    const { data: staff, error } = await supabase
      .from('staff')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    // Get staff locations
    const { data: staffLocations } = await supabase
      .from('staff_locations')
      .select('location_id')
      .eq('staff_id', id);

    // Get staff services
    const { data: staffServices } = await supabase
      .from('staff_services')
      .select('service_id')
      .eq('staff_id', id);

    // Add location_ids and service_ids to staff data
    const staffWithRelations = {
      ...staff,
      location_ids: staffLocations?.map(sl => sl.location_id) || [],
      service_ids: staffServices?.map(ss => ss.service_id) || []
    };

    return NextResponse.json({
      success: true,
      data: staffWithRelations
    });
  } catch (error) {
    console.error('Staff GET error:', error);
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
    const { id } = await params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Staff ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { location_ids, service_ids, ...staffFields } = body;

    // Update staff record
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .update({
        ...staffFields,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (staffError) {
      return NextResponse.json(
        { error: staffError.message },
        { status: 400 }
      );
    }

    // Update location assignments if provided
    if (location_ids !== undefined) {
      // Remove existing assignments
      await supabase
        .from('staff_locations')
        .delete()
        .eq('staff_id', id);

      // Add new assignments
      if (location_ids.length > 0) {
        const locationAssignments = location_ids.map((location_id: string, index: number) => ({
          staff_id: id,
          location_id,
          is_primary: index === 0
        }));

        const { error: locationError } = await supabase
          .from('staff_locations')
          .insert(locationAssignments);

        if (locationError) {
          console.error('Error updating location assignments:', locationError);
        }
      }
    }

    // Update service qualifications if provided
    if (service_ids !== undefined) {
      // Remove existing qualifications
      await supabase
        .from('staff_services')
        .delete()
        .eq('staff_id', id);

      // Add new qualifications
      if (service_ids.length > 0) {
        const serviceQualifications = service_ids.map((service_id: string) => ({
          staff_id: id,
          service_id,
          is_qualified: true,
          qualification_date: new Date().toISOString().split('T')[0]
        }));

        const { error: serviceError } = await supabase
          .from('staff_services')
          .insert(serviceQualifications);

        if (serviceError) {
          console.error('Error updating service qualifications:', serviceError);
        }
      }
    }

    // Invalidate cache when staff assignments are updated
    const invalidateCache = location_ids !== undefined || service_ids !== undefined;
    
    return NextResponse.json({
      success: true,
      data: staff,
      cacheInvalidated: invalidateCache,
    }, {
      headers: invalidateCache ? {
        'Cache-Control': 'no-cache, must-revalidate',
        'X-Cache-Invalidate': 'staff-assignments',
      } : {}
    });
  } catch (error) {
    console.error('Staff PUT error:', error);
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
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Staff ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { error } = await supabase
      .from('staff')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    // Invalidate cache when staff is deleted
    return NextResponse.json({
      success: true,
      message: 'Staff deleted successfully',
      cacheInvalidated: true,
    }, {
      headers: {
        'Cache-Control': 'no-cache, must-revalidate',
        'X-Cache-Invalidate': 'staff-assignments',
      }
    });
  } catch (error) {
    console.error('Staff DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}