import { Button, Section, Text } from '@react-email/components';
import * as React from 'react';
import { actionBox, button, EmailShell, text } from './shared';

interface ReviewRequestEmailProps {
    clientName: string;
    serviceName?: string;
    reviewLink: string;
    customBody?: string;
}

export const ReviewRequestEmail = ({
    clientName = 'Valued Client',
    serviceName,
    reviewLink = 'https://goudecho.nl',
    customBody,
}: ReviewRequestEmailProps) => (
    <EmailShell preview="Wil je je ervaring met Goud Echo delen?" heading="Hoe was je ervaring?">
        {customBody ? (
            <Text style={{ ...text, whiteSpace: 'pre-line' }}>{customBody}</Text>
        ) : (
            <>
                <Text style={text}>Hoi {clientName},</Text>
                <Text style={text}>
                    Bedankt voor je bezoek{serviceName ? ` voor ${serviceName}` : ''}. We zouden het waarderen als je je ervaring met ons deelt.
                </Text>
            </>
        )}
        <Section style={actionBox}>
            <Button href={reviewLink} style={button}>Laat een review achter</Button>
        </Section>
    </EmailShell>
);

export default ReviewRequestEmail;
