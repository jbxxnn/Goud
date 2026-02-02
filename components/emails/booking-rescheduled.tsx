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

interface BookingRescheduledEmailProps {
    clientName: string;
    serviceName: string;
    oldDate?: string;
    oldTime?: string;
    newDate: string;
    newTime: string;
    locationName: string;
    bookingId: string;
    googleMapsLink?: string;
}

export const BookingRescheduledEmail = ({
    clientName = 'Valued Client',
    serviceName = 'Prenatal Ultrasound',
    oldDate,
    oldTime,
    newDate = 'January 2, 2026',
    newTime = '14:00 PM',
    locationName = 'Goud Echo Clinic',
    bookingId = '12345',
    googleMapsLink,
}: BookingRescheduledEmailProps) => {
    const previewText = `Je afspraak is gewijzigd naar ${newDate} om ${newTime}.`;

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
                    <Heading style={h1}>Je afspraak is gewijzigd</Heading>
                    <Text style={text}>
                        Hoi {clientName},
                    </Text>
                    <Text style={text}>
                        Je afspraak voor <strong>{serviceName}</strong> is succesvol verzet.
                    </Text>

                    <Section style={box}>
                        {oldDate && oldTime && (
                            <Row style={{ marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '15px' }}>
                                <Column>
                                    <Text style={smallLabel}>Oude afspraak:</Text>
                                    <Text style={strikethroughText}>
                                        {oldDate} om {oldTime}
                                    </Text>
                                </Column>
                            </Row>
                        )}

                        <Row>
                            <Column>
                                <Text style={smallLabel}>Nieuwe afspraak:</Text>
                                <Text style={highlightParagraph}>
                                    <strong>Datum:</strong> {newDate}
                                </Text>
                                <Text style={highlightParagraph}>
                                    <strong>Tijd:</strong> {newTime}
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

                    <Section style={section}>
                        <Text style={h3}>Toch weer wijzigen?</Text>
                        <Text style={smallText}>Mocht deze tijd toch niet uitkomen, dan kun je de afspraak opnieuw wijzigen via je account.</Text>
                        <Link style={link} href="https://goudecho.nl/dashboard/">Naar mijn account</Link>
                    </Section>

                    <Section style={footer}>
                        <Text style={footerText}>
                            Booking Reference: {bookingId}
                        </Text>
                        <Text style={footerText}>
                            Als je vragen hebt over deze wijziging, neem dan contact op met ons.
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

export default BookingRescheduledEmail;

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

const highlightParagraph = {
    ...paragraph,
    color: '#C27A3A',
    fontSize: '18px',
}

const smallLabel = {
    color: '#777',
    fontSize: '12px',
    fontWeight: 'bold',
    textTransform: 'uppercase' as const,
    marginBottom: '5px',
    display: 'block',
};

const strikethroughText = {
    color: '#999',
    fontSize: '15px',
    textDecoration: 'line-through',
    margin: '0',
};

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
