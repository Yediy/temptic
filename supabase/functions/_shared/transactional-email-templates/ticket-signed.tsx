/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Temp Tic'

interface TicketSignedProps {
  ticketNumber?: string
  workerName?: string
  signerName?: string
  signedAt?: string
}

const TicketSignedEmail = ({ ticketNumber, workerName, signerName, signedAt }: TicketSignedProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Ticket {ticketNumber} has been signed — {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>✅ Ticket Signed</Heading>
        <Text style={text}>
          A ticket has been approved and signed by the client.
        </Text>
        <Text style={detail}><strong>Ticket #:</strong> {ticketNumber ?? '—'}</Text>
        <Text style={detail}><strong>Worker:</strong> {workerName ?? '—'}</Text>
        <Text style={detail}><strong>Signed by:</strong> {signerName ?? '—'}</Text>
        <Text style={detail}><strong>Signed at:</strong> {signedAt ?? '—'}</Text>
        <Hr style={hr} />
        <Text style={footer}>
          PDF copies have been generated. You can view and download them from your {SITE_NAME} dashboard.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: TicketSignedEmail,
  subject: (data: Record<string, any>) => `Ticket ${data.ticketNumber ?? ''} — Signed`,
  displayName: 'Ticket signed notification',
  previewData: { ticketNumber: 'TT-2026-000042', workerName: 'John Doe', signerName: 'Jane Smith', signedAt: '2026-03-23 14:30' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '24px 28px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1e293b', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.6', margin: '0 0 20px' }
const detail = { fontSize: '14px', color: '#334155', lineHeight: '1.8', margin: '0' }
const hr = { borderColor: '#e2e8f0', margin: '20px 0' }
const footer = { fontSize: '12px', color: '#94a3b8', margin: '24px 0 0' }
