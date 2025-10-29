import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface CalendarSetting {
  id: string;
  setting_key: string;
  setting_value: string | number | boolean | { [key: string]: unknown } | unknown[];
  description: string | null;
  created_at: string;
  updated_at: string;
}

export async function GET() {
  try {
    const supabase = await createClient();

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user data to check if admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userData || userData.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Fetch all calendar settings
    const { data, error } = await supabase
      .from('calendar_settings')
      .select('*')
      .order('setting_key');

    if (error) {
      console.error('Error fetching calendar settings:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch calendar settings' },
        { status: 500 }
      );
    }

    // Convert settings array to object format for easier access
    const settingsObject = data.reduce((acc, setting) => {
      acc[setting.setting_key] = setting.setting_value;
      return acc;
    }, {} as Record<string, CalendarSetting['setting_value']>);

    return NextResponse.json({
      success: true,
      data: settingsObject,
      raw: data
    });

  } catch (error) {
    console.error('Error in GET /api/calendar-settings:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user data to check if admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userData || userData.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { badge_variant, visible_hours, working_hours } = body;

    // Execute updates
    const updatePromises: Promise<{ data: CalendarSetting[] | null; error: unknown }>[] = [];

    if (badge_variant !== undefined) {
      updatePromises.push(
        supabase
          .from('calendar_settings')
          .update({ setting_value: badge_variant })
          .eq('setting_key', 'badge_variant')
          .select()
          .then(res => res)
      );
    }

    if (visible_hours !== undefined) {
      updatePromises.push(
        supabase
          .from('calendar_settings')
          .update({ setting_value: visible_hours })
          .eq('setting_key', 'visible_hours')
          .select()
          .then(res => res)
      );
    }

    if (working_hours !== undefined) {
      updatePromises.push(
        supabase
          .from('calendar_settings')
          .update({ setting_value: working_hours })
          .eq('setting_key', 'working_hours')
          .select()
          .then(res => res)
      );
    }

    if (updatePromises.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No settings provided to update' },
        { status: 400 }
      );
    }

    // Execute all updates
    const results = await Promise.all(updatePromises);

    // Check if any update failed
    const hasError = results.some(result => result.error);
    if (hasError) {
      console.error('Error updating calendar settings:', results);
      return NextResponse.json(
        { success: false, error: 'Failed to update calendar settings' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Calendar settings updated successfully'
    });

  } catch (error) {
    console.error('Error in PUT /api/calendar-settings:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
