import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Temp Tic"

interface ClientInviteProps {
  agencyName?: string
  clientCompany?: string
  signerName?: string
  inviteUrl?: string
}

const ClientInviteEmail = ({
  agencyName = 'Your Agency',
  clientCompany = 'Your Company',
  signerName = '',
  inviteUrl = '#',
}: ClientInviteProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You've been invited to sign tickets for {clientCompany}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Heading style={logo}>{SITE_NAME}</Heading>
        </Section>

        <Heading style={h1}>
          {signerName ? `Hello ${signerName},` : 'Hello,'}
        </Heading>

        <Text style={text}>
          You've been invited by <strong>{agencyName}</strong> to sign labor tickets
          for <strong>{clientCompany}</strong> through the {SITE_NAME} client portal.
        </Text>

        <Text style={text}>
          Click the button below to create your account and get started. The link
          is valid for 7 days.
        </Text>

        <Section style={buttonSection}>
          <Button style={button} href={inviteUrl}>
            Accept Invitation
          </Button>
        </Section>

        <Text style={smallText}>
          If you didn't expect this invitation, you can safely ignore this email.
        </Text>

        <Text style={footer}>
          — The {SITE_NAME} Team
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ClientInviteEmail,
  subject: (data: Record<string, any>) =>
    `You're invited to sign tickets for ${data?.clientCompany || 'a client'}`,
  displayName: 'Client portal invitation',
  previewData: {
    agencyName: 'Prostaffing',
    clientCompany: 'Test Construction Co',
    signerName: 'John Smith',
    inviteUrl: 'https://temptic.lovable.app/client/onboarding/abc123',
  },
} satisfies TemplateEntry

// Brand: primary #2b3e5c (hsl 215 50% 23%), accent #e8960a (hsl 35 95% 55%)
const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '0', maxWidth: '560px', margin: '0 auto' }
const headerSection = {
  backgroundColor: '#2b3e5c',
  padding: '24px 32px',
  borderRadius: '8px 8px 0 0',
}
const logo = {
  color: '#ffffff',
  fontSize: '22px',
  fontWeight: '700' as const,
  margin: '0',
  letterSpacing: '-0.5px',
}
const h1 = {
  fontSize: '20px',
  fontWeight: '600' as const,
  color: '#1a2332',
  margin: '32px 32px 16px',
}
const text = {
  fontSize: '15px',
  color: '#55575d',
  lineHeight: '1.6',
  margin: '0 32px 16px',
}
const buttonSection = { textAlign: 'center' as const, margin: '24px 32px' }
const button = {
  backgroundColor: '#e8960a',
  color: '#1a2332',
  fontWeight: '600' as const,
  fontSize: '15px',
  padding: '12px 32px',
  borderRadius: '6px',
  textDecoration: 'none',
  display: 'inline-block',
}
const smallText = {
  fontSize: '13px',
  color: '#999999',
  lineHeight: '1.5',
  margin: '16px 32px',
}
const footer = {
  fontSize: '13px',
  color: '#999999',
  margin: '24px 32px 32px',
}
