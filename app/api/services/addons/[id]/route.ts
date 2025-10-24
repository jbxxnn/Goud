// Service add-on API routes - PUT (update add-on), DELETE (delete add-on)
import { NextRequest, NextResponse } from 'next/server';
import { ServiceAddonService } from '@/lib/database/services';
import { UpdateServiceAddonRequest } from '@/lib/types/service';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body: UpdateServiceAddonRequest = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Add-on ID is required' },
        { status: 400 }
      );
    }

    const result = await ServiceAddonService.updateAddon(id, body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Service add-on PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'Add-on ID is required' },
        { status: 400 }
      );
    }

    const result = await ServiceAddonService.deleteAddon(id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Service add-on DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
