// Services API routes - GET (list services) and POST (create service)
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getServiceSupabase } from '@/lib/db/server-supabase';
import { CreateServiceRequest, ServicePolicyField, ServicePolicyFieldChoice, ServiceAddon } from '@/lib/types/service';

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

const deriveServiceCode = (name: string, providedCode?: string): string | null => {
  const normalizedProvided = providedCode?.replace(/[^A-Za-z0-9]/g, '').toUpperCase() ?? '';
  if (normalizedProvided.length === 3) {
    return normalizedProvided;
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
    allows_twins: rest.allows_twins,
    twin_price: rest.twin_price,
    twin_duration_minutes: rest.twin_duration_minutes,
    ...extras,
  };
};

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const activeOnly = searchParams.get('active_only') === 'true';
    const search = searchParams.get('search') || undefined;

    let query = supabase
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
      `, { count: 'exact' })
      .order('name');

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    if (search) {
      query = query.ilike('name', `%${search}%`);
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

    // Map the data to match the Service interface
    const mappedData = await Promise.all((data || []).map(async (service) => {
      // Fetch staff assignments for this service
      const { data: staffAssignments } = await supabase
        .from('staff_services')
        .select('staff_id')
        .eq('service_id', service.id);

      const staff_ids = staffAssignments?.map(sa => sa.staff_id) || [];

      // Fetch addons for this service separately
      // Use service role client to bypass RLS for public API endpoint
      const serviceSupabase = getServiceSupabase();
      const { data: addons, error: addonsError } = await serviceSupabase
        .from('service_addons')
        .select('id, service_id, name, description, price, is_required, is_active')
        .eq('service_id', service.id)
        .eq('is_active', true);

      if (addonsError) {
        console.error('Error fetching addons for service', service.id, addonsError);
      }

      return mapServiceRecord(service, {
        staff_ids,
        addons: addons || [],
        allows_twins: service.allows_twins,
        twin_price_eur_cents: service.twin_price_eur_cents,
        twin_duration_minutes: service.twin_duration_minutes,
      });
    }));

    return NextResponse.json({
      success: true,
      data: mappedData,
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: totalPages,
      }
    });
  } catch (error) {
    console.error('Services GET error:', error);
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

    const body: CreateServiceRequest = await request.json();

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { error: 'Service name is required' },
        { status: 400 }
      );
    }

    if (!body.duration || body.duration <= 0) {
      return NextResponse.json(
        { error: 'Duration must be greater than 0' },
        { status: 400 }
      );
    }

    const serviceCode = deriveServiceCode(body.name, body.serviceCode);

    const { data, error } = await supabase
      .from('services')
      .insert({
        name: body.name,
        service_code: serviceCode,
        description: body.description || null,
        duration: body.duration,
        buffer_time: body.buffer_time || 0,
        lead_time: body.lead_time || 0,
        reschedule_cutoff: body.reschedule_cutoff || 24,
        instructions: body.instructions || null,
        price: body.price || 0,
        sale_price: body.sale_price || null,
        cancel_cutoff: body.cancel_cutoff || null,
        scheduling_window: body.scheduling_window || 12,
        category_id: body.category_id || null,
        is_active: body.is_active !== undefined ? body.is_active : true,
        allows_twins: body.allows_twins !== undefined ? body.allows_twins : false,
        twin_price: body.twin_price || null,
        twin_duration_minutes: body.twin_duration_minutes || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    // Handle policy fields if provided
    if (body.policy_fields && body.policy_fields.length > 0) {
      const policyFieldsData = body.policy_fields.map((field: ServicePolicyField, index: number) => ({
        service_id: data.id,
        field_type: field.field_type,
        title: field.title,
        description: field.description || null,
        is_required: field.is_required,
        field_order: index,
      }));

      const { error: policyFieldsError } = await supabase
        .from('service_policy_fields')
        .insert(policyFieldsData);

      if (policyFieldsError) {
        console.error('Policy fields error:', policyFieldsError);
        // Don't fail the entire request, just log the error
      } else {
        // Get the inserted policy fields to get their IDs
        const { data: insertedFields } = await supabase
          .from('service_policy_fields')
          .select('id, field_order')
          .eq('service_id', data.id)
          .order('field_order');

        // Handle choices for multi-choice fields
        for (const field of body.policy_fields) {
          if (field.field_type === 'multi_choice' && field.choices && field.choices.length > 0) {
            const fieldId = insertedFields?.find(f => f.field_order === body.policy_fields!.indexOf(field))?.id;
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

    // Handle staff assignments if provided
    if (body.staff_ids && body.staff_ids.length > 0) {
      const staffAssignments = body.staff_ids.map((staff_id: string) => ({
        staff_id,
        service_id: data.id,
        is_qualified: true,
        qualification_date: new Date().toISOString().split('T')[0],
      }));

      const { error: staffError } = await supabase
        .from('staff_services')
        .insert(staffAssignments);

      if (staffError) {
        console.error('Staff assignments error:', staffError);
        // Don't fail the entire request, just log the error
      }
    }

    return NextResponse.json({
      success: true,
      data: mapServiceRecord(data),
    }, { status: 201 });
  } catch (error) {
    console.error('Services POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
