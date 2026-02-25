
import { Booking } from '@/lib/types/booking';
import { IEvent } from '@/calendar/interfaces';
import { differenceInDays, parseISO, format } from 'date-fns';

export function bookingToCalendarEvent(booking: Booking): IEvent {
    // Determine color based on booking status
    let color: IEvent['color'] = 'blue';

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

    // Use location color if available
    if (booking.locations?.color) {
        color = booking.locations.color as IEvent['color'];
    }

    // Format title: Customer Name - Service Name
    const customerName = booking.users
        ? booking.users.first_name
            ? `${booking.users.first_name} ${booking.users.last_name || ''}`.trim()
            : booking.users.email
        : 'Unknown Customer';

    const serviceName = booking.services?.name || 'Unknown Service';
    const serviceCode = booking.services?.service_code || serviceName;
    const title = `${serviceCode} - ${customerName}`;

    // Format times for description
    const startTime = format(parseISO(booking.start_time), 'HH:mm');
    const endTime = format(parseISO(booking.end_time), 'HH:mm');

    // Create description
    const description = `
    Time: ${startTime} - ${endTime}
    Service: ${serviceName}
    Customer: ${customerName}
    Location: ${booking.locations?.name || 'Unknown Location'}
    Staff: ${booking.staff ? `${booking.staff.first_name} ${booking.staff.last_name}` : 'Unassigned'}
    
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
        location: booking.locations ? {
            id: booking.locations.id,
            name: booking.locations.name
        } : undefined,
    } as IEvent;
}
