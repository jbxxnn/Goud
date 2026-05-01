import {
    Body,
    Container,
    Head,
    Heading,
    Html,
    Img,
    Preview,
    Section,
    Text,
} from '@react-email/components';
import * as React from 'react';

type EmailShellProps = {
    preview: string;
    heading: string;
    children: React.ReactNode;
};

export function EmailShell({ preview, heading, children }: EmailShellProps) {
    return (
        <Html>
            <Head />
            <Preview>{preview}</Preview>
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
                    <Heading style={h1}>{heading}</Heading>
                    {children}
                    <Section style={footer}>
                        <Text style={footerText}>Goud echo en prenatale screening</Text>
                    </Section>
                </Container>
                <Container style={footerContainer}>
                    <Text style={footerText}>Goud echo en prenatale screening</Text>
                </Container>
            </Body>
        </Html>
    );
}

export const main = {
    backgroundColor: '#F6EAE4',
    fontFamily:
        '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

export const header = {
    padding: '20px 10px',
    margin: '0 auto',
    marginTop: '64px',
    backgroundColor: '#e0c5b2',
    borderTopLeftRadius: '6px',
    borderTopRightRadius: '6px',
};

export const container = {
    backgroundColor: '#ffffff',
    margin: '0 auto',
    padding: '20px 20px 48px',
    marginBottom: '0',
    marginTop: '0',
    borderBottomLeftRadius: '6px',
    borderBottomRightRadius: '6px',
};

export const footerContainer = {
    margin: '0 auto',
    marginBottom: '64px',
    marginTop: '0',
};

export const h1 = {
    color: '#333',
    fontSize: '24px',
    fontWeight: 'bold',
    textAlign: 'center' as const,
    margin: '30px 0',
};

export const h3 = {
    color: '#333',
    fontSize: '18px',
    fontWeight: 'bold',
    margin: '20px 0 10px',
};

export const text = {
    color: '#333',
    fontSize: '16px',
    lineHeight: '24px',
    textAlign: 'left' as const,
};

export const paragraph = {
    color: '#333',
    fontSize: '16px',
    lineHeight: '24px',
    textAlign: 'left' as const,
    margin: '5px 0',
};

export const smallText = {
    color: '#777',
    fontSize: '14px',
    lineHeight: '20px',
    marginTop: '12px',
};

export const link = {
    color: '#C27A3A',
    textDecoration: 'underline',
};

export const button = {
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

export const box = {
    padding: '24px',
    backgroundColor: '#f9f9f9',
    borderRadius: '4px',
    margin: '24px 0',
};

export const actionBox = {
    padding: '24px',
    textAlign: 'center' as const,
    margin: '24px 0',
};

export const footer = {
    padding: '0 24px',
    marginTop: '40px',
    textAlign: 'center' as const,
};

export const footerText = {
    color: '#8898aa',
    fontSize: '12px',
    lineHeight: '16px',
    textAlign: 'center' as const,
    margin: '5px 0',
};
