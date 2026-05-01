import { Resend } from 'resend';
import { BrevoClient } from '@getbrevo/brevo';
import { BookingConfirmationEmail } from '@/components/emails/booking-confirmation';
import { BookingReminderEmail } from '@/components/emails/booking-reminder';
import { BookingRescheduledEmail } from '@/components/emails/booking-rescheduled';
import { BookingCancellationEmail } from '@/components/emails/booking-cancellation';
import { PaymentLinkEmail } from '@/components/emails/payment-link';
import { PaymentReceiptEmail } from '@/components/emails/payment-receipt';
import { PaymentFailedEmail } from '@/components/emails/payment-failed';
import { AccountWelcomeEmail } from '@/components/emails/account-welcome';
import { AuthLinkEmail } from '@/components/emails/auth-link';
import { ReviewRequestEmail } from '@/components/emails/review-request';
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

        if (template && template.is_active === false) {
            return { subject: defaultSubject, body: undefined, isActive: false };
        }

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

        return { subject: finalSubject, body: finalBody, isActive: true };
    } catch (error) {
        console.warn(`Error fetching template for ${key}, using defaults.`, error);
        return { subject: defaultSubject, body: undefined, isActive: true };
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
    const { subject, body, isActive } = await getTemplateContent('booking_confirmation', defaultSubject, details);
    if (!isActive) return { skipped: true, reason: 'template_disabled', key: 'booking_confirmation' };
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
    const { subject, body, isActive } = await getTemplateContent('booking_reminder', defaultSubject, details);
    if (!isActive) return { skipped: true, reason: 'template_disabled', key: 'booking_reminder' };
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
    const { subject, body, isActive } = await getTemplateContent('booking_rescheduled', defaultSubject, details);
    if (!isActive) return { skipped: true, reason: 'template_disabled', key: 'booking_rescheduled' };
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
    const { subject, body, isActive } = await getTemplateContent('booking_cancellation', defaultSubject, details);
    if (!isActive) return { skipped: true, reason: 'template_disabled', key: 'booking_cancellation' };
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
    const { subject, body, isActive } = await getTemplateContent('repeat_booking', defaultSubject, details);
    if (!isActive) return { skipped: true, reason: 'template_disabled', key: 'repeat_booking' };
    const emailHtml = await render(RepeatBookingEmail({ ...details, customBody: body }));

    return sendEmailWithFallback({
        to,
        subject,
        html: emailHtml,
    });
}

export type PaymentLinkDetails = {
    clientName: string;
    serviceName: string;
    amount: string;
    paymentLink: string;
    bookingId: string;
};

export async function sendPaymentLinkEmail(
    to: string | string[],
    details: PaymentLinkDetails
) {
    const defaultSubject = `Betaallink voor je afspraak bij Goud Echo`;
    const { subject, body, isActive } = await getTemplateContent('payment_link', defaultSubject, details);
    if (!isActive) return { skipped: true, reason: 'template_disabled', key: 'payment_link' };
    const emailHtml = await render(PaymentLinkEmail({ ...details, customBody: body }));

    return sendEmailWithFallback({
        to,
        subject,
        html: emailHtml,
    });
}

export type PaymentReceiptDetails = {
    clientName: string;
    serviceName: string;
    amount: string;
    bookingId: string;
    paymentId?: string;
};

export async function sendPaymentReceiptEmail(
    to: string | string[],
    details: PaymentReceiptDetails
) {
    const defaultSubject = `Betaling ontvangen voor je afspraak bij Goud Echo`;
    const { subject, body, isActive } = await getTemplateContent('payment_receipt', defaultSubject, details);
    if (!isActive) return { skipped: true, reason: 'template_disabled', key: 'payment_receipt' };
    const emailHtml = await render(PaymentReceiptEmail({ ...details, customBody: body }));

    return sendEmailWithFallback({
        to,
        subject,
        html: emailHtml,
    });
}

export type PaymentFailedDetails = {
    clientName: string;
    serviceName: string;
    amount: string;
    paymentLink?: string;
    bookingId: string;
    reason?: string;
};

export async function sendPaymentFailedEmail(
    to: string | string[],
    details: PaymentFailedDetails
) {
    const defaultSubject = `Betaling niet voltooid voor je afspraak bij Goud Echo`;
    const { subject, body, isActive } = await getTemplateContent('payment_failed', defaultSubject, details);
    if (!isActive) return { skipped: true, reason: 'template_disabled', key: 'payment_failed' };
    const emailHtml = await render(PaymentFailedEmail({ ...details, customBody: body }));

    return sendEmailWithFallback({
        to,
        subject,
        html: emailHtml,
    });
}

export type AccountWelcomeDetails = {
    clientName: string;
    dashboardLink: string;
};

export async function sendAccountWelcomeEmail(
    to: string | string[],
    details: AccountWelcomeDetails
) {
    const defaultSubject = `Welkom bij Goud Echo`;
    const { subject, body, isActive } = await getTemplateContent('account_welcome', defaultSubject, details);
    if (!isActive) return { skipped: true, reason: 'template_disabled', key: 'account_welcome' };
    const emailHtml = await render(AccountWelcomeEmail({ ...details, customBody: body }));

    return sendEmailWithFallback({
        to,
        subject,
        html: emailHtml,
    });
}

export type AuthLinkDetails = {
    clientName?: string;
    actionLink: string;
};

export async function sendPasswordResetEmail(
    to: string | string[],
    details: AuthLinkDetails
) {
    const defaultSubject = `Stel je wachtwoord opnieuw in`;
    const { subject, body, isActive } = await getTemplateContent('password_reset', defaultSubject, details);
    if (!isActive) return { skipped: true, reason: 'template_disabled', key: 'password_reset' };
    const emailHtml = await render(AuthLinkEmail({
        ...details,
        actionLabel: 'Wachtwoord instellen',
        heading: 'Stel je wachtwoord opnieuw in',
        preview: 'Gebruik deze link om je wachtwoord opnieuw in te stellen',
        customBody: body,
    }));

    return sendEmailWithFallback({
        to,
        subject,
        html: emailHtml,
    });
}

export async function sendMagicLinkEmail(
    to: string | string[],
    details: AuthLinkDetails
) {
    const defaultSubject = `Log in bij Goud Echo`;
    const { subject, body, isActive } = await getTemplateContent('magic_link', defaultSubject, details);
    if (!isActive) return { skipped: true, reason: 'template_disabled', key: 'magic_link' };
    const emailHtml = await render(AuthLinkEmail({
        ...details,
        actionLabel: 'Log in',
        heading: 'Log in bij Goud Echo',
        preview: 'Gebruik deze link om in te loggen bij Goud Echo',
        customBody: body,
    }));

    return sendEmailWithFallback({
        to,
        subject,
        html: emailHtml,
    });
}

export type ReviewRequestDetails = {
    clientName: string;
    serviceName?: string;
    reviewLink: string;
};

export async function sendReviewRequestEmail(
    to: string | string[],
    details: ReviewRequestDetails
) {
    const defaultSubject = `Wil je je ervaring met Goud Echo delen?`;
    const { subject, body, isActive } = await getTemplateContent('review_request', defaultSubject, details);
    if (!isActive) return { skipped: true, reason: 'template_disabled', key: 'review_request' };
    const emailHtml = await render(ReviewRequestEmail({ ...details, customBody: body }));

    return sendEmailWithFallback({
        to,
        subject,
        html: emailHtml,
    });
}
