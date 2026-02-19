// Users API routes - GET (list users) and POST (create user)
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { UserService } from '@/lib/database/users';
import { CreateUserRequest } from '@/lib/types/user';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const role = searchParams.get('role') || undefined;
    const search = searchParams.get('search') || undefined;

    let result;
    if (search) {
      result = await UserService.searchUsers(search, role, page, limit);
    } else {
      result = await UserService.getUsers(page, limit, role);
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Users GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateUserRequest = await request.json();
    
    // Validate required fields
    if (!body.email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    if (!body.first_name || !body.last_name) {
      return NextResponse.json(
        { error: 'First name and last name are required' },
        { status: 400 }
      );
    }

    // Check authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // For now, return an error indicating user creation is not available
    // This prevents the foreign key constraint issue
    return NextResponse.json(
      { error: 'User creation is temporarily disabled. Please create users through the signup process.' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Users POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
