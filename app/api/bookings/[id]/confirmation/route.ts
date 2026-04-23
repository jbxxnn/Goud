import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/db/server-supabase';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = getServiceSupabase();

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_number,
        start_time,
        end_time,
        status,
        payment_status,
        payment_link,
        price_eur_cents,
        service_id,
        policy_answers,
        is_twin,
        parent_booking_id,
        services:services!service_id (
          id,
          name,
          duration,
          custom_price_label,
          custom_price_description
        ),
        locations:locations!location_id (
          id,
          name
        ),
        staff:staff!staff_id (
          id,
          first_name,
          last_name
        )
      `)
      .eq('id', id)
      .maybeSingle();

    if (error || !data) {
      if (error) console.error('Error fetching booking confirmation:', error);
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { data: addonsData } = await supabase
      .from('booking_addons')
      .select('booking_id, addon_id, quantity, price_eur_cents, option_id')
      .eq('booking_id', id);

    let addons: any[] = [];
    if (addonsData && addonsData.length > 0) {
      const addonIds = [...new Set(addonsData.map((a: any) => a.addon_id).filter(Boolean))];
      const optionIds = [...new Set(addonsData.map((a: any) => a.option_id).filter(Boolean))];

      let serviceAddons: any[] = [];
      let serviceOptions: any[] = [];

      if (addonIds.length > 0) {
        const { data: saData } = await supabase
          .from('service_addons')
          .select('id, name, description, price')
          .in('id', addonIds);
        serviceAddons = saData || [];
      }

      if (optionIds.length > 0) {
        const { data: soData } = await supabase
          .from('service_addon_options')
          .select('id, name')
          .in('id', optionIds);
        serviceOptions = soData || [];
      }

      addons = addonsData.map((addon) => {
        const serviceAddon = serviceAddons.find((item) => item.id === addon.addon_id);
        const option = serviceOptions.find((item) => item.id === addon.option_id);

        return {
          id: serviceAddon?.id || addon.booking_id || '',
          name: option ? `${serviceAddon?.name} - ${option.name}` : (serviceAddon?.name || 'Add-on'),
          description: serviceAddon?.description || null,
          quantity: addon.quantity || 1,
          price_eur_cents: addon.price_eur_cents || Math.round((serviceAddon?.price || 0) * 100),
          option_id: addon.option_id,
        };
      });
    }

    return NextResponse.json({
      booking: {
        ...data,
        addons,
        isRepeat: !!data.parent_booking_id,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}
