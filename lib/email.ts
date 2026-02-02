import { Resend } from 'resend';
import { BookingConfirmationEmail } from '@/components/emails/booking-confirmation';
import { BookingReminderEmail } from '@/components/emails/booking-reminder';
import { BookingRescheduledEmail } from '@/components/emails/booking-rescheduled';
import { BookingCancellationEmail } from '@/components/emails/booking-cancellation';
import { render } from '@react-email/render';

const resend = new Resend(process.env.RESEND_API_KEY);

export type BookingConfirmationDetails = {
    clientName: string;
    serviceName: string;
    date: string; // Formatted date string
    time: string; // Formatted time string
    locationName: string;
    price: string;
    bookingId: string;
    googleMapsLink?: string;
    notes?: string | null;
    addons?: { name: string; price: string }[];
};

export async function sendBookingConfirmationEmail(
    to: string,
    details: BookingConfirmationDetails
) {
    if (!process.env.RESEND_API_KEY) {
        console.error('RESEND_API_KEY is not set');
        return;
    }

    const emailHtml = await render(BookingConfirmationEmail({ ...details }));

    try {
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'bookings@goudecho.nl';

        const data = await resend.emails.send({
            from: `Goud Echo <${fromEmail}>`,
            to: [to],
            subject: `Afspraak voor ${details.serviceName} is bevestigd.`,
            html: emailHtml,
        });

        console.log('Email sent successfully:', data);
        return data;
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
}

export type BookingReminderDetails = {
    clientName: string;
    serviceName: string;
    date: string;
    time: string;
    locationName: string;
    bookingId: string;
    googleMapsLink?: string;
};

export async function sendBookingReminderEmail(
    to: string,
    details: BookingReminderDetails
) {
    if (!process.env.RESEND_API_KEY) {
        console.error('RESEND_API_KEY is not set');
        return;
    }

    const emailHtml = await render(BookingReminderEmail({ ...details }));

    try {
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'bookings@goudecho.nl';

        const data = await resend.emails.send({
            from: `Goud Echo <${fromEmail}>`,
            to: [to],
            subject: `Herinnering: Je afspraak morgen voor ${details.serviceName}`,
            html: emailHtml,
        });

        console.log('Reminder email sent successfully:', data);
        return data;
    } catch (error) {
        console.error('Error sending reminder email:', error);
        throw error;
    }
}

export type BookingRescheduledDetails = {
    clientName: string;
    serviceName: string;
    oldDate?: string;
    oldTime?: string;
    newDate: string;
    newTime: string;
    locationName: string;
    bookingId: string;
    googleMapsLink?: string;
};

export async function sendBookingRescheduledEmail(
    to: string,
    details: BookingRescheduledDetails
) {
    if (!process.env.RESEND_API_KEY) {
        console.error('RESEND_API_KEY is not set');
        return;
    }

    const emailHtml = await render(BookingRescheduledEmail({ ...details }));

    try {
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'bookings@goudecho.nl';

        const data = await resend.emails.send({
            from: `Goud Echo <${fromEmail}>`,
            to: [to],
            // Subject can be customized further if needed
            subject: `Wijziging van je afspraak bij Goud Echo: ${details.newDate}`,
            html: emailHtml,
        });

        console.log('Reschedule email sent successfully:', data);
        return data;
    } catch (error) {
        console.error('Error sending reschedule email:', error);
        throw error;
    }
}

export type BookingCancellationDetails = {
    clientName: string;
    serviceName: string;
    date: string;
    time: string;
    locationName: string;
    bookingId: string;
};

export async function sendBookingCancellationEmail(
    to: string,
    details: BookingCancellationDetails
) {
    if (!process.env.RESEND_API_KEY) {
        console.error('RESEND_API_KEY is not set');
        return;
    }

    const emailHtml = await render(BookingCancellationEmail({ ...details }));

    try {
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'bookings@goudecho.nl';

        const data = await resend.emails.send({
            from: `Goud Echo <${fromEmail}>`,
            to: [to],
            // Subject can be customized further if needed
            subject: `Annulering van je afspraak bij Goud Echo: ${details.date}`,
            html: emailHtml,
        });

        console.log('Cancellation email sent successfully:', data);
        return data;
    } catch (error) {
        console.error('Error sending cancellation email:', error);
        throw error;
    }
}
