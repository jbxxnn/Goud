// Service add-ons API routes - GET (list add-ons), POST (create add-on)
import { NextRequest, NextResponse } from 'next/server';
import { ServiceAddonService } from '@/lib/database/services';
import { CreateServiceAddonRequest } from '@/lib/types/service';

export async function GET(
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

    // For admin dashboard, include inactive addons
    const includeInactive = true;
    const result = await ServiceAddonService.getAddonsByServiceId(id, includeInactive);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Service add-ons GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: Omit<CreateServiceAddonRequest, 'service_id'> = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Service ID is required' },
        { status: 400 }
      );
    }

    if (!body.name) {
      return NextResponse.json(
        { error: 'Add-on name is required' },
        { status: 400 }
      );
    }

    const addonData: CreateServiceAddonRequest = {
      ...body,
      service_id: id,
    };

    const result = await ServiceAddonService.createAddon(addonData);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Service add-on POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
