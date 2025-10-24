// Test locations API to debug the issue
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Test basic connection
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data,
      message: 'Locations table is accessible'
    });
  } catch (error) {
    console.error('Test locations error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
