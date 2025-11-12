// Services API routes - GET (get service), PUT (update service), DELETE (delete service)
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getServiceSupabase } from '@/lib/db/server-supabase';
import { UpdateServiceRequest, ServicePolicyField, ServicePolicyFieldChoice, ServiceAddon } from '@/lib/types/service';

type RawPolicyField = ServicePolicyField & {
  choices?: ServicePolicyFieldChoice[];
  service_policy_field_choices?: ServicePolicyFieldChoice[];
};

type RawServiceAddon = ServiceAddon & {
  price?: number | string | null;
};

type RawServiceRecord = {
  service_code?: string | null;
  service_policy_fields?: RawPolicyField[];
  service_addons?: RawServiceAddon[];
  [key: string]: unknown;
};

const deriveServiceCode = (name?: string, providedCode?: string): string | null => {
  const normalizedProvided = providedCode?.replace(/[^A-Za-z0-9]/g, '').toUpperCase() ?? '';
  if (normalizedProvided.length === 3) {
    return normalizedProvided;
  }

  if (!name) {
    return null;
  }

  const normalizedName = name.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (normalizedName.length >= 3) {
    return normalizedName.slice(0, 3);
  }

  return null;
};

const mapServiceRecord = (
  service: RawServiceRecord | null | undefined,
  extras: Partial<Record<string, unknown>> = {}
) => {
  if (!service) return service;
  const { service_code, service_policy_fields, service_addons, ...rest } = service;
  const policyFields = (service_policy_fields ?? []).map((field) => ({
    ...field,
    choices: field.service_policy_field_choices ?? field.choices ?? [],
  }));
  // Use addons from extras if provided, otherwise fall back to service_addons from the record
  const rawAddons = (extras.addons as RawServiceAddon[]) ?? service_addons ?? [];
  const addons = rawAddons.map((addon) => ({
    ...addon,
    price: typeof addon.price === 'number' ? addon.price : Number(addon.price) || 0,
  }));
  return {
    ...rest,
    serviceCode: service_code ?? null,
    policy_fields: policyFields,
    addons,
    ...extras,
  };
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // const { searchParams } = new URL(request.url);
    // const withAddons = searchParams.get('with_addons') === 'true';

    if (!id) {
      return NextResponse.json(
        { error: 'Service ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('services')
      .select(`
        *,
        service_categories (
          id,
          name
        ),
        service_policy_fields (
          id,
          field_type,
          title,
          description,
          is_required,
          field_order,
          service_policy_field_choices (
            id,
            title,
            price,
            choice_order
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    // Fetch staff assignments for this service
    const { data: staffAssignments } = await supabase
      .from('staff_services')
      .select('staff_id')
      .eq('service_id', id);

    const staff_ids = staffAssignments?.map(sa => sa.staff_id) || [];
    
    // Fetch addons for this service separately
    // Use service role client to bypass RLS for public API endpoint
    const serviceSupabase = getServiceSupabase();
    const { data: addons, error: addonsError } = await serviceSupabase
      .from('service_addons')
      .select('id, service_id, name, description, price, is_required, is_active')
      .eq('service_id', id)
      .eq('is_active', true);
    
    if (addonsError) {
      console.error('Error fetching addons for service', id, addonsError);
    }
    
    const mappedData = mapServiceRecord(data, { staff_ids, addons: addons || [] });

    return NextResponse.json({
      success: true,
      data: mappedData
    });
  } catch (error) {
    console.error('Service GET error:', error);
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
    const body: UpdateServiceRequest = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Service ID is required' },
        { status: 400 }
      );
    }

    // Validate duration if provided
    if (body.duration !== undefined && body.duration <= 0) {
      return NextResponse.json(
        { error: 'Duration must be greater than 0' },
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

    const {
      serviceCode,
      policy_fields: policyFieldsPayload,
      staff_ids: staffIdsPayload,
      ...rest
    } = body;

    const updates: Record<string, unknown> = {
      ...rest,
      updated_at: new Date().toISOString(),
    };

    if (typeof serviceCode !== 'undefined' || typeof rest.name !== 'undefined') {
      updates.service_code = deriveServiceCode(rest.name, serviceCode);
    }

    const { data, error } = await supabase
      .from('services')
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

    // Handle policy fields update if provided
    if (typeof policyFieldsPayload !== 'undefined') {
      // Delete existing policy fields
      await supabase
        .from('service_policy_fields')
        .delete()
        .eq('service_id', id);

      // Insert new policy fields if any
      if (policyFieldsPayload.length > 0) {
        const policyFieldsData = policyFieldsPayload.map((field: ServicePolicyField, index: number) => ({
          service_id: id,
          field_type: field.field_type,
          title: field.title,
          description: field.description || null,
          is_required: field.is_required,
          field_order: index,
        }));

        const { error: policyFieldsError } = await supabase
          .from('service_policy_fields')
          .insert(policyFieldsData);

        if (!policyFieldsError) {
          // Get the inserted policy fields to get their IDs
          const { data: insertedFields } = await supabase
            .from('service_policy_fields')
            .select('id, field_order')
            .eq('service_id', id)
            .order('field_order');

          // Handle choices for multi-choice fields
        for (const field of policyFieldsPayload) {
            if (field.field_type === 'multi_choice' && field.choices && field.choices.length > 0) {
            const fieldId = insertedFields?.find(f => f.field_order === policyFieldsPayload?.indexOf(field))?.id;
              if (fieldId) {
                const choicesData = field.choices.map((choice: ServicePolicyFieldChoice, choiceIndex: number) => ({
                  field_id: fieldId,
                  title: choice.title,
                  price: choice.price,
                  choice_order: choiceIndex,
                }));

                await supabase
                  .from('service_policy_field_choices')
                  .insert(choicesData);
              }
            }
          }
        }
      }
    }

    // Handle staff assignments update if provided
    if (typeof staffIdsPayload !== 'undefined') {
      // Delete existing staff assignments
      await supabase
        .from('staff_services')
        .delete()
        .eq('service_id', id);

      // Insert new staff assignments if any
      if (staffIdsPayload.length > 0) {
        const staffAssignments = staffIdsPayload.map((staff_id: string) => ({
          staff_id,
          service_id: id,
          is_qualified: true,
          qualification_date: new Date().toISOString().split('T')[0],
        }));

        const { error: staffError } = await supabase
          .from('staff_services')
          .insert(staffAssignments);

        if (staffError) {
          console.error('Staff assignments error:', staffError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: mapServiceRecord(data),
    });
  } catch (error) {
    console.error('Service PUT error:', error);
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
        { error: 'Service ID is required' },
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
      .from('services')
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Service DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
