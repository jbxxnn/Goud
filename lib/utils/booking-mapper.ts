
import { Booking } from '@/lib/types/booking';
import { IEvent } from '@/calendar/interfaces';
import { differenceInDays, parseISO } from 'date-fns';

import { mapLocationColorToCalendarColor } from '@/lib/utils/location-color-mapper';

export function bookingToCalendarEvent(booking: Booking): IEvent {
    // Determine color based on booking status
    let color: IEvent['color'] = 'blue';

    if (booking.locations?.color) {
        color = mapLocationColorToCalendarColor(booking.locations.color);
    } else {
        switch (booking.status) {
            case 'confirmed':
                color = 'green';
                break;
            case 'pending':
                color = 'yellow';
                break;
            case 'cancelled':
                color = 'red';
                break;
            case 'completed':
                color = 'purple';
                break;
            case 'ongoing':
                color = 'orange';
                break;
            default:
                color = 'blue';
        }
    }

    // Format title: Customer Name - Service Name
    const customerName = booking.users
        ? booking.users.first_name
            ? `${booking.users.first_name} ${booking.users.last_name || ''}`.trim()
            : booking.users.email
        : 'Unknown Customer';

    const serviceName = booking.services?.name || 'Unknown Service';
    const title = `${customerName} - ${serviceName}`;

    // Create description
    const description = `
    Status: ${booking.status}
    Service: ${serviceName}
    Customer: ${customerName}
    Location: ${booking.locations?.name || 'Unknown Location'}
    Staff: ${booking.staff ? `${booking.staff.first_name} ${booking.staff.last_name}` : 'Unassigned'}
    Price: €${(booking.price_eur_cents / 100).toFixed(2)}
  `.trim();

    // Create user object for the event (assigned staff)
    const user = {
        id: booking.staff_id || 'unassigned',
        name: booking.staff ? `${booking.staff.first_name} ${booking.staff.last_name}` : 'Unassigned',
        picturePath: null,
    };

    // Ensure dates are ISO strings
    // For single-day bookings that cross midnight or are technically short, 
    // the calendar component expects them to be handled correctly.

    return {
        id: booking.id,
        startDate: booking.start_time,
        endDate: booking.end_time,
        title,
        color,
        description,
        user,
    } as IEvent;
}
