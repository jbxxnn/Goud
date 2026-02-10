import {
    Body,
    Container,
    Head,
    Heading,
    Html,
    Preview,
    Section,
    Text,
    Button,
    Img,
    Link,
} from '@react-email/components';
import * as React from 'react';

interface RepeatBookingEmailProps {
    clientName: string;
    serviceName: string;
    link: string;
    customBody?: string;
}

export const RepeatBookingEmail = ({
    clientName = 'Valued Client',
    serviceName = 'Follow-up Ultrasound',
    link = 'https://goudecho.nl/booking/repeat?token=123',
    customBody,
}: RepeatBookingEmailProps) => {
    const previewText = `Je vervolgafspraak staat klaar om geboekt te worden.`;

    return (
        <Html>
            <Head />
            <Preview>{previewText}</Preview>
            <Body style={main}>
                <Container style={header}>
                    <Img
                        src="https://goudecho.nl/wp-content/uploads/2025/03/Goudecho.png"
                        alt="Goud Echo"
                        width="150"
                        style={{ margin: '0 auto', display: 'block' }}
                    />
                </Container>
                <Container style={container}>
                    <Heading style={h1}>Plan je vervolgafspraak</Heading>

                    {customBody ? (
                        <Text style={{ ...text, whiteSpace: 'pre-line' }}>{customBody}</Text>
                    ) : (
                        <>
                            <Text style={text}>
                                Hoi {clientName},
                            </Text>
                            <Text style={text}>
                                We hebben een vervolgafspraak voor je klaargezet voor: <strong>{serviceName}</strong>.
                            </Text>
                            <Text style={text}>
                                Klik op de onderstaande knop om een datum en tijd te kiezen die jou het beste uitkomen.
                            </Text>
                        </>
                    )}

                    <Section style={box}>
                        <Button style={button} href={link}>
                            Afspraak inplannen
                        </Button>
                    </Section>

                    <Text style={smallText}>
                        Of kopieer en plak deze link in je browser:
                        <br />
                        <Link href={link} style={linkText}>{link}</Link>
                    </Text>

                    <Section style={footer}>
                        <Text style={footerText}>
                            Heb je vragen? Neem gerust contact met ons op.
                        </Text>
                    </Section>
                </Container>
                <Container style={footerContainer}>
                    <Text style={footerText}>Goud echo en prenatale screening</Text>
                </Container>
            </Body>
        </Html>
    );
};

export default RepeatBookingEmail;

const main = {
    backgroundColor: '#F6EAE4',
    fontFamily:
        '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const header = {
    padding: '20px 10px',
    margin: '0 auto',
    marginTop: '64px',
    backgroundColor: '#e0c5b2',
    borderTopLeftRadius: '6px',
    borderTopRightRadius: '6px',
};

const container = {
    backgroundColor: '#ffffff',
    margin: '0 auto',
    padding: '20px 20px 48px',
    marginBottom: '0',
    marginTop: '0',
    borderBottomLeftRadius: '6px',
    borderBottomRightRadius: '6px',
};

const footerContainer = {
    margin: '0 auto',
    marginBottom: '64px',
    marginTop: '0',
};

const box = {
    padding: '24px',
    textAlign: 'center' as const,
    margin: '24px 0',
};

const h1 = {
    color: '#333',
    fontSize: '24px',
    fontWeight: 'bold',
    textAlign: 'center' as const,
    margin: '30px 0',
};

const text = {
    color: '#333',
    fontSize: '16px',
    lineHeight: '24px',
    textAlign: 'left' as const,
};

const smallText = {
    color: '#777',
    fontSize: '14px',
    marginTop: '20px',
    textAlign: 'center' as const,
    wordBreak: 'break-all' as const,
};

const linkText = {
    color: '#C27A3A',
    textDecoration: 'underline',
};

const button = {
    backgroundColor: '#C27A3A',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '16px',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'inline-block',
    padding: '12px 24px',
    fontWeight: 'bold',
};

const footer = {
    padding: '0 24px',
    marginTop: '40px',
    textAlign: 'center' as const,
}

const footerText = {
    color: '#8898aa',
    fontSize: '12px',
    lineHeight: '16px',
    textAlign: 'center' as const,
    margin: '5px 0',
}
