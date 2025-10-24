// Current user API route - GET (get current user), PUT (update current user)
import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/database/users';
import { UpdateUserRequest } from '@/lib/types/user';

export async function GET() {
  try {
    const result = await UserService.getCurrentUser();

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 401 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Current user GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body: UpdateUserRequest = await request.json();

    // Get current user first
    const currentUserResult = await UserService.getCurrentUser();
    if (!currentUserResult.success || !currentUserResult.data) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 401 }
      );
    }

    const result = await UserService.updateUser(currentUserResult.data.id, body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Current user PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
