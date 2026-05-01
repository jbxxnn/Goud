import { Button, Section, Text } from '@react-email/components';
import * as React from 'react';
import { actionBox, button, EmailShell, text } from './shared';

interface AccountWelcomeEmailProps {
    clientName: string;
    dashboardLink: string;
    customBody?: string;
}

export const AccountWelcomeEmail = ({
    clientName = 'Valued Client',
    dashboardLink = 'https://goudecho.nl/dashboard',
    customBody,
}: AccountWelcomeEmailProps) => (
    <EmailShell preview="Welkom bij Goud Echo" heading="Welkom bij Goud Echo">
        {customBody ? (
            <Text style={{ ...text, whiteSpace: 'pre-line' }}>{customBody}</Text>
        ) : (
            <>
                <Text style={text}>Hoi {clientName},</Text>
                <Text style={text}>
                    Je account is aangemaakt. Vanuit je dashboard kun je afspraken bekijken, wijzigen en nieuwe afspraken plannen.
                </Text>
            </>
        )}
        <Section style={actionBox}>
            <Button href={dashboardLink} style={button}>Naar dashboard</Button>
        </Section>
    </EmailShell>
);

export default AccountWelcomeEmail;
