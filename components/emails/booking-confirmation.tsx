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
// import { Header } from 'react-aria-components';

interface BookingConfirmationEmailProps {
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
}

export const BookingConfirmationEmail = ({
    clientName = 'Valued Client',
    serviceName = 'Prenatal Ultrasound',
    date = 'January 1, 2026',
    time = '10:00 AM',
    locationName = 'Goud Echo Clinic',
    price = '€50.00',
    bookingId = '12345',
    googleMapsLink,
    notes,
    addons = [],
}: BookingConfirmationEmailProps) => {
    const previewText = `Je afspraak is bevestigd. De details kunnen beneden bekeken worden.`;

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
                    <Heading style={h1}>Je echo afspraak is bevestigd</Heading>
                    <Text style={text}>
                        Hoi {clientName},
                    </Text>
                    <Text style={text}>
                        Bedankt voor je afspraak met <strong>{serviceName}</strong>.
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

                    {addons.length > 0 && (
                        <Section style={section}>
                            <Heading as="h3" style={h3}>Add-ons</Heading>
                            {addons.map((addon, index) => (
                                <Row key={index} style={{ marginBottom: '5px' }}>
                                    <Column><Text style={itemText}>{addon.name}</Text></Column>
                                    <Column align="right"><Text style={itemText}>{addon.price}</Text></Column>
                                </Row>
                            ))}
                            <Hr style={hr} />
                        </Section>
                    )}

                    <Section style={section}>
                        <Row style={{ marginBottom: '5px' }}>
                            <Column>
                                <Text style={paragraph}><strong>Totale prijs:</strong></Text>
                            </Column>
                            <Column align="right">
                                <Text style={paragraph}><strong>{price}</strong></Text>
                            </Column>
                        </Row>
                        <Text style={smallText}>Betaling is vereist op het moment van de afspraak.</Text>
                    </Section>

                    {notes && (
                        <Section style={section}>
                            <Heading as="h3" style={h3}>Uw notities</Heading>
                            <Text style={smallText}>{notes}</Text>
                        </Section>
                    )}

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

export default BookingConfirmationEmail;

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

const itemText = {
    color: '#555',
    fontSize: '15px',
    lineHeight: '22px',
    margin: '0',
}

const smallText = {
    color: '#777',
    fontSize: '14px',
    fontStyle: 'italic',
    marginTop: '5px',
}

const link = {
    color: '#C27A3A',
    textDecoration: 'underline',
    fontSize: '14px',
};

const section = {
    padding: '0 24px',
    margin: '10px 0',
}

const hr = {
    borderColor: '#e6ebf1',
    margin: '20px 0',
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
