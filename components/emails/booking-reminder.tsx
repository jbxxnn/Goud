import {
    Body,
    Container,
    Head,
    Heading,
    Html,
    Img,
    Link,
    Preview,
    Section,
    Text,
    Row,
    Column
} from '@react-email/components';
import * as React from 'react';

interface BookingReminderEmailProps {
    clientName: string;
    serviceName: string;
    date: string;
    time: string;
    locationName: string;
    googleMapsLink?: string;
    bookingId: string;
}

export const BookingReminderEmail = ({
    clientName = 'Valued Client',
    serviceName = 'Prenatal Ultrasound',
    date = 'January 2, 2026',
    time = '10:00 AM',
    locationName = 'Goud Echo Clinic',
    googleMapsLink,
    bookingId = '12345',
}: BookingReminderEmailProps) => {
    const previewText = `Herinnering: Je afspraak voor ${serviceName} is morgen.`;

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
                    <Heading style={h1}>Herinnering: Afspraak morgen</Heading>
                    <Text style={text}>
                        Hoi {clientName},
                    </Text>
                    <Text style={text}>
                        Dit is een herinnering voor je afspraak voor <strong>{serviceName}</strong> morgen.
                    </Text>

                    <Section style={box}>
                        <Row>
                            <Column>
                                <Text style={paragraph}>
                                    <strong>Datum:</strong> {date}
                                </Text>
                                <Text style={paragraph}>
                                    <strong>Tijd:</strong> {time}
                                </Text>
                                <Text style={paragraph}>
                                    <strong>Locatie:</strong> {locationName}
                                </Text>
                                {googleMapsLink && (
                                    <Link href={googleMapsLink} style={link}>Route op Google Maps →</Link>
                                )}
                            </Column>
                        </Row>
                    </Section>

                    <Section>
                        <Text style={text}>We kijken ernaar uit je te zien!</Text>
                    </Section>

                    <Section>
                        <Text style={h3}>Afspraak wijzigen / annuleren?</Text>
                        <Text style={smallText}>Wijzigen van datum en/of tijd kan eenvoudig vanuit je account.</Text>
                        <Link style={link} href="https://goudecho.nl/dashboard/">Klik hier om naar je account te gaan.</Link>
                    </Section>

                    <Section style={footer}>
                        <Text style={footerText}>
                            Booking Reference: {bookingId}
                        </Text>
                        <Text style={footerText}>
                            Als je de afspraak wilt veranderen of annuleren, neem dan contact op met ons.
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

export default BookingReminderEmail;

const main = {
    backgroundColor: '#F6EAE4',
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
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
};

const link = {
    color: '#C27A3A',
    textDecoration: 'underline',
    fontSize: '14px',
};

const footer = {
    padding: '0 24px',
    marginTop: '40px',
    textAlign: 'center' as const,
};

const footerText = {
    color: '#8898aa',
    fontSize: '12px',
    lineHeight: '16px',
    textAlign: 'center' as const,
    margin: '5px 0',
};
