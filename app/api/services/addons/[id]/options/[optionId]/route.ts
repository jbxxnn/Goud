// Service addon options API routes
import { NextRequest, NextResponse } from 'next/server';
import { ServiceAddonService } from '@/lib/database/services';
import { UpdateServiceAddonOptionRequest } from '@/lib/types/service';

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; optionId: string }> }
) {
    try {
        const { optionId } = await params;
        const body: UpdateServiceAddonOptionRequest = await request.json();

        if (!optionId) {
            return NextResponse.json(
                { error: 'Option ID is required' },
                { status: 400 }
            );
        }

        const result = await ServiceAddonService.updateAddonOption(optionId, body);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error },
                { status: 400 }
            );
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error('Service add-on option PUT error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; optionId: string }> }
) {
    try {
        const { optionId } = await params;

        if (!optionId) {
            return NextResponse.json(
                { error: 'Option ID is required' },
                { status: 400 }
            );
        }

        const result = await ServiceAddonService.deleteAddonOption(optionId);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error },
                { status: 400 }
            );
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error('Service add-on option DELETE error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
