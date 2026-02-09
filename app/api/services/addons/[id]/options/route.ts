// Service addon options API routes
import { NextRequest, NextResponse } from 'next/server';
import { ServiceAddonService } from '@/lib/database/services';
import { CreateServiceAddonOptionRequest, UpdateServiceAddonOptionRequest } from '@/lib/types/service';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: addonId } = await params;
        const body: Omit<CreateServiceAddonOptionRequest, 'addon_id'> = await request.json();

        if (!addonId) {
            return NextResponse.json(
                { error: 'Add-on ID is required' },
                { status: 400 }
            );
        }

        const optionData: CreateServiceAddonOptionRequest = {
            ...body,
            addon_id: addonId,
        };

        const result = await ServiceAddonService.createAddonOption(optionData);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error },
                { status: 400 }
            );
        }

        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        console.error('Service add-on option POST error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}


