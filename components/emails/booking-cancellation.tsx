import {
    Body,
    Container,
    Head,
    Heading,
    Html,
    Preview,
    Section,
    Text,
    Hr,
    Row,
    Column,
    Link,
    Img,
} from '@react-email/components';
import * as React from 'react';

interface BookingCancellationEmailProps {
    clientName: string;
    serviceName: string;
    date: string;
    time: string;
    locationName: string;
    bookingId: string;
}

export const BookingCancellationEmail = ({
    clientName = 'Valued Client',
    serviceName = 'Prenatal Ultrasound',
    date = 'January 1, 2026',
    time = '10:00 AM',
    locationName = 'Goud Echo Clinic',
    bookingId = '12345',
}: BookingCancellationEmailProps) => {
    const previewText = `Je afspraak voor ${serviceName} is geannuleerd.`;

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
                    <Heading style={h1}>Afspraak Geannuleerd</Heading>
                    <Text style={text}>
                        Hoi {clientName},
                    </Text>
                    <Text style={text}>
                        Hierbij bevestigen we dat je afspraak voor <strong>{serviceName}</strong> op <strong>{date} om {time}</strong> is geannuleerd.
                    </Text>

                    <Section style={box}>
                        <Text style={paragraph}>
                            <strong>Locatie:</strong> {locationName}
                        </Text>
                        <Text style={paragraph}>
                            <strong>Referentie:</strong> {bookingId}
                        </Text>
                    </Section>

                    <Section style={section}>
                        <Text style={h3}>Nieuwe afspraak maken?</Text>
                        <Text style={smallText}>Wil je op een ander moment langskomen? Je kunt eenvoudig een nieuwe afspraak maken via onze website.</Text>
                        <Link style={linkButton} href="https://goudecho.nl/dashboard/">Nieuwe afspraak maken</Link>
                    </Section>

                    <Section style={footer}>
                        <Text style={footerText}>
                            Booking Reference: {bookingId}
                        </Text>
                        <Text style={footerText}>
                            Als je deze annulering niet hebt aangevraagd, neem dan direct contact met ons op.
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

export default BookingCancellationEmail;

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
    backgroundColor: '#f9f9f9',
    borderRadius: '4px',
    margin: '24px 0',
};

const h1 = {
    color: '#333',
    fontSize: '24px',
    fontWeight: 'bold',
    textAlign: 'center' as const,
    margin: '30px 0',
};

const h3 = {
    color: '#333',
    fontSize: '18px',
    fontWeight: 'bold',
    margin: '20px 0 10px',
};

const text = {
    color: '#333',
    fontSize: '16px',
    lineHeight: '24px',
    textAlign: 'left' as const,
};

const paragraph = {
    color: '#333',
    fontSize: '16px',
    lineHeight: '24px',
    textAlign: 'left' as const,
    margin: '5px 0',
};

const smallText = {
    color: '#777',
    fontSize: '14px',
    fontStyle: 'italic',
    marginTop: '5px',
}

const linkButton = {
    backgroundColor: '#C27A3A',
    borderRadius: '4px',
    color: '#ffffff',
    display: 'inline-block',
    fontSize: '14px',
    fontWeight: 'bold',
    lineHeight: '40px',
    textAlign: 'center' as const,
    textDecoration: 'none',
    width: '200px',
    marginTop: '10px',
};

const section = {
    padding: '0 24px',
    margin: '10px 0',
    textAlign: 'center' as const,
}

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
