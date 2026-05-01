import { Section, Text } from '@react-email/components';
import * as React from 'react';
import { box, EmailShell, paragraph, text } from './shared';

interface PaymentReceiptEmailProps {
    clientName: string;
    serviceName: string;
    amount: string;
    bookingId: string;
    paymentId?: string;
    customBody?: string;
}

export const PaymentReceiptEmail = ({
    clientName = 'Valued Client',
    serviceName = 'Prenatal Ultrasound',
    amount = 'EUR 0,00',
    bookingId = '12345',
    paymentId,
    customBody,
}: PaymentReceiptEmailProps) => (
    <EmailShell preview="Je betaling is ontvangen" heading="Betaling ontvangen">
        {customBody ? (
            <Text style={{ ...text, whiteSpace: 'pre-line' }}>{customBody}</Text>
        ) : (
            <>
                <Text style={text}>Hoi {clientName},</Text>
                <Text style={text}>
                    We hebben je betaling voor <strong>{serviceName}</strong> ontvangen. Dank je wel.
                </Text>
            </>
        )}
        <Section style={box}>
            <Text style={paragraph}><strong>Bedrag:</strong> {amount}</Text>
            <Text style={paragraph}><strong>Boekingsreferentie:</strong> {bookingId}</Text>
            {paymentId && <Text style={paragraph}><strong>Betalingsreferentie:</strong> {paymentId}</Text>}
        </Section>
    </EmailShell>
);

export default PaymentReceiptEmail;
