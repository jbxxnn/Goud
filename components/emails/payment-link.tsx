import { Button, Link, Section, Text } from '@react-email/components';
import * as React from 'react';
import { actionBox, box, button, EmailShell, link, paragraph, smallText, text } from './shared';

interface PaymentLinkEmailProps {
    clientName: string;
    serviceName: string;
    amount: string;
    paymentLink: string;
    bookingId: string;
    customBody?: string;
}

export const PaymentLinkEmail = ({
    clientName = 'Valued Client',
    serviceName = 'Prenatal Ultrasound',
    amount = 'EUR 0,00',
    paymentLink = 'https://goudecho.nl',
    bookingId = '12345',
    customBody,
}: PaymentLinkEmailProps) => (
    <EmailShell preview={`Betaallink voor je afspraak bij Goud Echo`} heading="Betaal je afspraak online">
        {customBody ? (
            <Text style={{ ...text, whiteSpace: 'pre-line' }}>{customBody}</Text>
        ) : (
            <>
                <Text style={text}>Hoi {clientName},</Text>
                <Text style={text}>
                    Je kunt je afspraak voor <strong>{serviceName}</strong> online betalen via de knop hieronder.
                </Text>
            </>
        )}
        <Section style={box}>
            <Text style={paragraph}><strong>Bedrag:</strong> {amount}</Text>
            <Text style={paragraph}><strong>Referentie:</strong> {bookingId}</Text>
        </Section>
        <Section style={actionBox}>
            <Button href={paymentLink} style={button}>Betaal nu</Button>
        </Section>
        <Text style={smallText}>
            Werkt de knop niet? Kopieer deze link in je browser: <Link href={paymentLink} style={link}>{paymentLink}</Link>
        </Text>
    </EmailShell>
);

export default PaymentLinkEmail;
