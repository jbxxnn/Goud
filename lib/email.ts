import { Resend } from 'resend';
import { BookingConfirmationEmail } from '@/components/emails/booking-confirmation';
import { BookingReminderEmail } from '@/components/emails/booking-reminder';
import { BookingRescheduledEmail } from '@/components/emails/booking-rescheduled';
import { BookingCancellationEmail } from '@/components/emails/booking-cancellation';
import { render } from '@react-email/render';
import { EmailTemplateService } from '@/lib/services/email-template-service';
import { replaceTemplateVariables } from '@/lib/utils';

const resend = new Resend(process.env.RESEND_API_KEY);

// Helper to fetch template content
async function getTemplateContent(
    key: string,
    defaultSubject: string,
    variables: Record<string, any>
) {
    try {
        const template = await EmailTemplateService.getTemplate(key);

        let subject = defaultSubject;
        let body: string | undefined = undefined;

        if (template) {
            // If template has a custom subject, use it
            if (template.subject) subject = template.subject;
            if (template.body) body = template.body;
        }

        // Replace variables in subject and body
        const finalSubject = replaceTemplateVariables(subject, variables);
        const finalBody = body ? replaceTemplateVariables(body, variables) : undefined;

        return { subject: finalSubject, body: finalBody };
    } catch (error) {
        console.warn(`Error fetching template for ${key}, using defaults.`, error);
        return { subject: defaultSubject, body: undefined };
    }
}

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

    const defaultSubject = `Afspraak voor ${details.serviceName} is bevestigd.`;
    const { subject, body } = await getTemplateContent('booking_confirmation', defaultSubject, details);

    const emailHtml = await render(BookingConfirmationEmail({ ...details, customBody: body }));

    try {
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'bookings@goudecho.nl';

        const data = await resend.emails.send({
            from: `Goud Echo <${fromEmail}>`,
            to: [to],
            subject: subject,
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

    const defaultSubject = `Herinnering: Je afspraak morgen voor ${details.serviceName}`;
    const { subject, body } = await getTemplateContent('booking_reminder', defaultSubject, details);

    const emailHtml = await render(BookingReminderEmail({ ...details, customBody: body }));

    try {
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'bookings@goudecho.nl';

        const data = await resend.emails.send({
            from: `Goud Echo <${fromEmail}>`,
            to: [to],
            subject: subject,
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

    const defaultSubject = `Wijziging van je afspraak bij Goud Echo: ${details.newDate}`;
    const { subject, body } = await getTemplateContent('booking_rescheduled', defaultSubject, details);

    const emailHtml = await render(BookingRescheduledEmail({ ...details, customBody: body }));

    try {
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'bookings@goudecho.nl';

        const data = await resend.emails.send({
            from: `Goud Echo <${fromEmail}>`,
            to: [to],
            subject: subject,
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

    const defaultSubject = `Annulering van je afspraak bij Goud Echo: ${details.date}`;
    const { subject, body } = await getTemplateContent('booking_cancellation', defaultSubject, details);

    const emailHtml = await render(BookingCancellationEmail({ ...details, customBody: body }));

    try {
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'bookings@goudecho.nl';

        const data = await resend.emails.send({
            from: `Goud Echo <${fromEmail}>`,
            to: [to],
            subject: subject,
            html: emailHtml,
        });

        console.log('Cancellation email sent successfully:', data);
        return data;
    } catch (error) {
        console.error('Error sending cancellation email:', error);
        throw error;
    }
}

export type RepeatBookingDetails = {
    clientName: string;
    serviceName: string;
    link: string;
};

export async function sendRepeatBookingEmail(
    to: string,
    details: RepeatBookingDetails
) {
    if (!process.env.RESEND_API_KEY) {
        console.error('RESEND_API_KEY is not set');
        return;
    }

    const { RepeatBookingEmail } = await import('@/components/emails/repeat-booking');

    const defaultSubject = `Plan je vervolgafspraak bij Goud Echo`;
    // We can use a template key if we want to support dynamic subjects/body later
    const { subject, body } = await getTemplateContent('repeat_booking', defaultSubject, details);

    const emailHtml = await render(RepeatBookingEmail({ ...details, customBody: body }));

    try {
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'bookings@goudecho.nl';

        const data = await resend.emails.send({
            from: `Goud Echo <${fromEmail}>`,
            to: [to],
            subject: subject,
            html: emailHtml,
        });

        console.log('Repeat booking email sent successfully:', data);
        return data;
    } catch (error) {
        console.error('Error sending repeat booking email:', error);
        throw error;
    }
}
