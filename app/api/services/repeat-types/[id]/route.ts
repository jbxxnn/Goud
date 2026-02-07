import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/db/server-supabase';
import { z } from 'zod';

const repeatTypeUpdateSchema = z.object({
    label: z.string().min(1).optional(),
    duration_minutes: z.number().int().positive().optional(),
    price_eur_cents: z.number().int().nonnegative().optional(),
    active: z.boolean().optional(),
});

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Validate body
        const body = await request.json();
        const validation = repeatTypeUpdateSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { success: false, error: validation.error.issues[0].message },
                { status: 400 }
            );
        }

        const updates = validation.data;
        const supabase = getServiceSupabase();

        const { data, error } = await supabase
            .from('service_repeat_types')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating repeat type:', error);
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('Unexpected error updating repeat type:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
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
        const supabase = getServiceSupabase();

        // Check if used in booking_continuations first?
        // FK constraint will prevent delete if used, which is good.
        // Or we should soft delete. For now, hard delete is OK unless used.

        const { error } = await supabase
            .from('service_repeat_types')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting repeat type:', error);
            // If error is code 23503 (foreign_key_violation), return helpful message
            if (error.code === '23503') {
                return NextResponse.json(
                    { success: false, error: 'Cannot delete: This repeat type is already used by existing bookings or tokens.' },
                    { status: 400 }
                );
            }
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Unexpected error deleting repeat type:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
