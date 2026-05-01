import { Button, Link, Section, Text } from '@react-email/components';
import * as React from 'react';
import { actionBox, box, button, EmailShell, link, paragraph, smallText, text } from './shared';

interface PaymentFailedEmailProps {
    clientName: string;
    serviceName: string;
    amount: string;
    paymentLink?: string;
    bookingId: string;
    reason?: string;
    customBody?: string;
}

export const PaymentFailedEmail = ({
    clientName = 'Valued Client',
    serviceName = 'Prenatal Ultrasound',
    amount = 'EUR 0,00',
    paymentLink,
    bookingId = '12345',
    reason = 'De betaling is niet voltooid.',
    customBody,
}: PaymentFailedEmailProps) => (
    <EmailShell preview="Je betaling is niet voltooid" heading="Betaling niet voltooid">
        {customBody ? (
            <Text style={{ ...text, whiteSpace: 'pre-line' }}>{customBody}</Text>
        ) : (
            <>
                <Text style={text}>Hoi {clientName},</Text>
                <Text style={text}>
                    De betaling voor <strong>{serviceName}</strong> is niet voltooid. Je afspraak blijft zichtbaar in je account.
                </Text>
            </>
        )}
        <Section style={box}>
            <Text style={paragraph}><strong>Bedrag:</strong> {amount}</Text>
            <Text style={paragraph}><strong>Referentie:</strong> {bookingId}</Text>
            <Text style={paragraph}><strong>Status:</strong> {reason}</Text>
        </Section>
        {paymentLink && (
            <>
                <Section style={actionBox}>
                    <Button href={paymentLink} style={button}>Probeer opnieuw</Button>
                </Section>
                <Text style={smallText}>
                    Werkt de knop niet? Kopieer deze link in je browser: <Link href={paymentLink} style={link}>{paymentLink}</Link>
                </Text>
            </>
        )}
    </EmailShell>
);

export default PaymentFailedEmail;
