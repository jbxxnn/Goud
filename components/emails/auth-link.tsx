import { Button, Link, Section, Text } from '@react-email/components';
import * as React from 'react';
import { actionBox, button, EmailShell, link, smallText, text } from './shared';

interface AuthLinkEmailProps {
    clientName?: string;
    actionLink: string;
    actionLabel: string;
    heading: string;
    preview: string;
    customBody?: string;
}

export const AuthLinkEmail = ({
    clientName = 'Valued Client',
    actionLink = 'https://goudecho.nl',
    actionLabel = 'Ga verder',
    heading,
    preview,
    customBody,
}: AuthLinkEmailProps) => (
    <EmailShell preview={preview} heading={heading}>
        {customBody ? (
            <Text style={{ ...text, whiteSpace: 'pre-line' }}>{customBody}</Text>
        ) : (
            <>
                <Text style={text}>Hoi {clientName},</Text>
                <Text style={text}>Gebruik de knop hieronder om veilig verder te gaan.</Text>
            </>
        )}
        <Section style={actionBox}>
            <Button href={actionLink} style={button}>{actionLabel}</Button>
        </Section>
        <Text style={smallText}>
            Werkt de knop niet? Kopieer deze link in je browser: <Link href={actionLink} style={link}>{actionLink}</Link>
        </Text>
    </EmailShell>
);

export default AuthLinkEmail;
