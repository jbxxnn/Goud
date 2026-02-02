import { Resend } from 'resend';
import { BookingConfirmationEmail } from '@/components/emails/booking-confirmation';
import { BookingReminderEmail } from '@/components/emails/booking-reminder';
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
