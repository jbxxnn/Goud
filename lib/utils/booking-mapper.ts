
import { Booking } from '@/lib/types/booking';
import { IEvent } from '@/calendar/interfaces';
import { formatInTimeZone } from 'date-fns-tz';

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

    // Format times for description using Europe/Amsterdam
    const startLocalHhMm = formatInTimeZone(new Date(booking.start_time), 'Europe/Amsterdam', 'HH:mm');
    const endLocalHhMm = formatInTimeZone(new Date(booking.end_time), 'Europe/Amsterdam', 'HH:mm');

    // Create description
    const description = `
    Time: ${startLocalHhMm} - ${endLocalHhMm}
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

    // Extract strictly the YYYY-MM-DD from the UTC string
    const startYyyyMmDd = booking.start_time.substring(0, 10);
    const endYyyyMmDd = booking.end_time.substring(0, 10);

    // Create naive local date strings that the browser parses as local timeline.
    const visualStartString = `${startYyyyMmDd}T${startLocalHhMm}:00`;
    const visualEndString = booking.end_time > booking.start_time && endYyyyMmDd !== startYyyyMmDd 
      ? `${endYyyyMmDd}T${endLocalHhMm}:00`
      : `${startYyyyMmDd}T${endLocalHhMm}:00`;

    return {
        id: booking.id,
        startDate: visualStartString,
        endDate: visualEndString,
        title,
        color,
        description,
        user,
        location: booking.locations ? {
            id: booking.locations.id,
            name: booking.locations.name
        } : undefined,
        metadata: {
            _originalStartTime: booking.start_time,
            _originalEndTime: booking.end_time,
            booking_id: booking.id,
        }
    } as IEvent;
}
