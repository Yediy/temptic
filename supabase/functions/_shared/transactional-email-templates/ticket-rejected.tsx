/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Temp Tic'

interface TicketRejectedProps {
  ticketNumber?: string
  workerName?: string
  rejectedBy?: string
  reason?: string
}

const TicketRejectedEmail = ({ ticketNumber, workerName, rejectedBy, reason }: TicketRejectedProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Ticket {ticketNumber} was rejected — {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>❌ Ticket Rejected</Heading>
        <Text style={text}>
          A ticket has been rejected by the client and may need corrections.
        </Text>
        <Text style={detail}><strong>Ticket #:</strong> {ticketNumber ?? '—'}</Text>
        <Text style={detail}><strong>Worker:</strong> {workerName ?? '—'}</Text>
        <Text style={detail}><strong>Rejected by:</strong> {rejectedBy ?? '—'}</Text>
        <Hr style={hr} />
        <Text style={reasonStyle}><strong>Reason:</strong> {reason ?? 'No reason provided'}</Text>
        <Hr style={hr} />
        <Text style={footer}>
          Please review the rejection reason and edit the ticket in your {SITE_NAME} dashboard.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: TicketRejectedEmail,
  subject: (data: Record<string, any>) => `Ticket ${data.ticketNumber ?? ''} — Rejected`,
  displayName: 'Ticket rejected notification',
  previewData: { ticketNumber: 'TT-2026-000042', workerName: 'John Doe', rejectedBy: 'Jane Smith', reason: 'Hours are incorrect — worker left at 3pm not 5pm.' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '24px 28px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1e293b', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.6', margin: '0 0 20px' }
const detail = { fontSize: '14px', color: '#334155', lineHeight: '1.8', margin: '0' }
const reasonStyle = { fontSize: '14px', color: '#dc2626', lineHeight: '1.6', margin: '0 0 10px', padding: '12px', backgroundColor: '#fef2f2', borderRadius: '6px' }
const hr = { borderColor: '#e2e8f0', margin: '20px 0' }
const footer = { fontSize: '12px', color: '#94a3b8', margin: '24px 0 0' }
