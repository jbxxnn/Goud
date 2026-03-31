import { Resend } from 'resend';
import { BrevoClient } from '@getbrevo/brevo';
import { BookingConfirmationEmail } from '@/components/emails/booking-confirmation';
import { BookingReminderEmail } from '@/components/emails/booking-reminder';
import { BookingRescheduledEmail } from '@/components/emails/booking-rescheduled';
import { BookingCancellationEmail } from '@/components/emails/booking-cancellation';
import { render } from '@react-email/render';
import { EmailTemplateService } from '@/lib/services/email-template-service';
import { replaceTemplateVariables } from '@/lib/utils';

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Initialize Brevo
const brevo = new BrevoClient({
    apiKey: process.env.BREVO_API_KEY || '',
});

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

/**
 * Generic email sending function with Brevo as primary and Resend as fallback.
 */
async function sendEmailWithFallback({
    to,
    subject,
    html,
    text,
}: {
    to: string | string[];
    subject: string;
    html: string;
    text?: string;
}) {
    const recipients = Array.isArray(to) ? to : [to];
    const fromEmail = process.env.BREVO_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || 'bookings@goudecho.nl';
    const fromName = 'Goud Echo';

    // 1. Try Brevo First
    if (process.env.BREVO_API_KEY) {
        try {
            const response = await brevo.transactionalEmails.sendTransacEmail({
                subject,
                sender: { name: fromName, email: fromEmail },
                to: recipients.map(email => ({ email })),
                htmlContent: html,
                textContent: text,
            });
            console.log('Email sent successfully via Brevo:', response);
            return { provider: 'brevo', data: response };
        } catch (error) {
            console.error('Brevo send failed, falling back to Resend:', error);
        }
    }

    // 2. Fallback to Resend
    if (process.env.RESEND_API_KEY) {
        try {
            const data = await resend.emails.send({
                from: `${fromName} <${fromEmail}>`,
                to: recipients,
                subject: subject,
                html: html,
                text: text,
            });
            console.log('Email sent successfully via Resend fallback:', data);
            return { provider: 'resend', data };
        } catch (error) {
            console.error('Resend fallback also failed:', error);
            throw error;
        }
    }

    throw new Error('No email provider configured or both failed.');
}

export type BookingConfirmationDetails = {
    clientName: string;
    serviceName: string;
    date: string;
    time: string;
    locationName: string;
    price: string;
    bookingId: string;
    googleMapsLink?: string;
    notes?: string | null;
    addons?: { name: string; price: string }[];
    paymentLink?: string;
};

export async function sendBookingConfirmationEmail(
    to: string | string[],
    details: BookingConfirmationDetails
) {
    const defaultSubject = `Afspraak voor ${details.serviceName} is bevestigd.`;
    const { subject, body } = await getTemplateContent('booking_confirmation', defaultSubject, details);
    const emailHtml = await render(BookingConfirmationEmail({ ...details, customBody: body, paymentLink: details.paymentLink }));

    return sendEmailWithFallback({
        to,
        subject,
        html: emailHtml,
    });
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
    to: string | string[],
    details: BookingReminderDetails
) {
    const defaultSubject = `Herinnering: Je afspraak morgen voor ${details.serviceName}`;
    const { subject, body } = await getTemplateContent('booking_reminder', defaultSubject, details);
    const emailHtml = await render(BookingReminderEmail({ ...details, customBody: body }));

    return sendEmailWithFallback({
        to,
        subject,
        html: emailHtml,
    });
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
    to: string | string[],
    details: BookingRescheduledDetails
) {
    const defaultSubject = `Wijziging van je afspraak bij Goud Echo: ${details.newDate}`;
    const { subject, body } = await getTemplateContent('booking_rescheduled', defaultSubject, details);
    const emailHtml = await render(BookingRescheduledEmail({ ...details, customBody: body }));

    return sendEmailWithFallback({
        to,
        subject,
        html: emailHtml,
    });
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
    to: string | string[],
    details: BookingCancellationDetails
) {
    const defaultSubject = `Annulering van je afspraak bij Goud Echo: ${details.date}`;
    const { subject, body } = await getTemplateContent('booking_cancellation', defaultSubject, details);
    const emailHtml = await render(BookingCancellationEmail({ ...details, customBody: body }));

    return sendEmailWithFallback({
        to,
        subject,
        html: emailHtml,
    });
}

export type RepeatBookingDetails = {
    clientName: string;
    serviceName: string;
    link: string;
};

export async function sendRepeatBookingEmail(
    to: string | string[],
    details: RepeatBookingDetails
) {
    const { RepeatBookingEmail } = await import('@/components/emails/repeat-booking');
    const defaultSubject = `Plan je vervolgafspraak bij Goud Echo`;
    const { subject, body } = await getTemplateContent('repeat_booking', defaultSubject, details);
    const emailHtml = await render(RepeatBookingEmail({ ...details, customBody: body }));

    return sendEmailWithFallback({
        to,
        subject,
        html: emailHtml,
    });
}
