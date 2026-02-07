import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/db/server-supabase';
import { z } from 'zod';

// Schema for validation
const repeatTypeSchema = z.object({
    label: z.string().min(1, 'Label is required'),
    duration_minutes: z.number().int().positive('Duration must be positive'),
    price_eur_cents: z.number().int().nonnegative('Price cannot be negative'),
    active: z.boolean().optional(),
});

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const serviceId = id;

        if (!serviceId) {
            return NextResponse.json(
                { success: false, error: 'Service ID is required' },
                { status: 400 }
            );
        }

        const supabase = getServiceSupabase();
        const { data, error } = await supabase
            .from('service_repeat_types')
            .select('*')
            .eq('service_id', serviceId)
            .order('duration_minutes', { ascending: true });

        if (error) {
            console.error('Error fetching repeat types:', error);
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('Unexpected error fetching repeat types:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
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
        const serviceId = id;

        // Check authentication (admin only)
        const supabase = getServiceSupabase();

        // Validate body
        const body = await request.json();
        const validation = repeatTypeSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { success: false, error: validation.error.issues[0].message },
                { status: 400 }
            );
        }

        const { label, duration_minutes, price_eur_cents, active } = validation.data;

        const { data, error } = await supabase
            .from('service_repeat_types')
            .insert({
                service_id: serviceId,
                label,
                duration_minutes,
                price_eur_cents,
                active: active ?? true,
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating repeat type:', error);
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('Unexpected error creating repeat type:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
