/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as ticketSent } from './ticket-sent.tsx'
import { template as ticketSigned } from './ticket-signed.tsx'
import { template as ticketRejected } from './ticket-rejected.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'ticket-sent': ticketSent,
  'ticket-signed': ticketSigned,
  'ticket-rejected': ticketRejected,
}
