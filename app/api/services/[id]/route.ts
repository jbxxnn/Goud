// Services API routes - GET (get service), PUT (update service), DELETE (delete service)
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { UpdateServiceRequest, ServicePolicyField, ServicePolicyFieldChoice } from '@/lib/types/service';

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

    // Map the data to match the Service interface
    const policyFields = (data.service_policy_fields || []).map((field: ServicePolicyField & { service_policy_field_choices: ServicePolicyFieldChoice[] }) => ({
      ...field,
      choices: field.service_policy_field_choices || [] as ServicePolicyFieldChoice[]
    }));

    // Fetch staff assignments for this service
    const { data: staffAssignments } = await supabase
      .from('staff_services')
      .select('staff_id')
      .eq('service_id', id);

    const staff_ids = staffAssignments?.map(sa => sa.staff_id) || [];
    
    const mappedData = {
      ...data,
      policy_fields: policyFields,
      staff_ids
    };

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

    const { data, error } = await supabase
      .from('services')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
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
    if (body.policy_fields !== undefined) {
      // Delete existing policy fields
      await supabase
        .from('service_policy_fields')
        .delete()
        .eq('service_id', id);

      // Insert new policy fields if any
      if (body.policy_fields.length > 0) {
        const policyFieldsData = body.policy_fields.map((field: ServicePolicyField, index: number) => ({
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
          for (const field of body.policy_fields) {
            if (field.field_type === 'multi_choice' && field.choices && field.choices.length > 0) {
              const fieldId = insertedFields?.find(f => f.field_order === body.policy_fields?.indexOf(field))?.id;
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
    if (body.staff_ids !== undefined) {
      // Delete existing staff assignments
      await supabase
        .from('staff_services')
        .delete()
        .eq('service_id', id);

      // Insert new staff assignments if any
      if (body.staff_ids.length > 0) {
        const staffAssignments = body.staff_ids.map((staff_id: string) => ({
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
      data
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
