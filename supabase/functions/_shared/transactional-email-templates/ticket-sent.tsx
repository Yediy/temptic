/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Temp Tic'

interface TicketSentProps {
  ticketNumber?: string
  workerName?: string
  workDate?: string
  siteName?: string
  signUrl?: string
}

const TicketSentEmail = ({ ticketNumber, workerName, workDate, siteName, signUrl }: TicketSentProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New ticket {ticketNumber} requires your signature — {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Ticket Ready for Signature</Heading>
        <Text style={text}>
          A new work ticket has been submitted and requires your review and signature.
        </Text>
        <Text style={detail}><strong>Ticket #:</strong> {ticketNumber ?? '—'}</Text>
        <Text style={detail}><strong>Worker:</strong> {workerName ?? '—'}</Text>
        <Text style={detail}><strong>Date:</strong> {workDate ?? '—'}</Text>
        <Text style={detail}><strong>Site:</strong> {siteName ?? '—'}</Text>
        <Hr style={hr} />
        {signUrl && (
          <Button style={button} href={signUrl}>
            Review & Sign Ticket
          </Button>
        )}
        <Text style={footer}>
          This is an automated notification from {SITE_NAME}. Please review and sign at your earliest convenience.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: TicketSentEmail,
  subject: (data: Record<string, any>) => `Ticket ${data.ticketNumber ?? ''} — Signature Required`,
  displayName: 'Ticket sent for signature',
  previewData: { ticketNumber: 'TT-2026-000042', workerName: 'John Doe', workDate: '2026-03-23', siteName: 'Main Office', signUrl: 'https://temptic.lovable.app/client/ticket/123' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '24px 28px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1e293b', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.6', margin: '0 0 20px' }
const detail = { fontSize: '14px', color: '#334155', lineHeight: '1.8', margin: '0' }
const hr = { borderColor: '#e2e8f0', margin: '20px 0' }
const button = { backgroundColor: '#1e3a5f', color: '#ffffff', fontSize: '14px', borderRadius: '8px', padding: '12px 24px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#94a3b8', margin: '24px 0 0' }
