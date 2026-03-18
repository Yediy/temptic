// Mock data for Temp Tic MVP

export type TicketStatus = 'draft' | 'sent' | 'viewed' | 'signed' | 'rejected' | 'corrected' | 'closed';
export type TicketType = 'daily' | 'weekly';

export interface Agency {
  id: string;
  name: string;
  branch_name: string;
  phone: string;
  email: string;
  city: string;
  state: string;
}

export interface Client {
  id: string;
  company_name: string;
  billing_email: string;
  billing_phone: string;
  sites_count: number;
  open_tickets: number;
  is_active: boolean;
}

export interface ClientSite {
  id: string;
  client_id: string;
  site_code: string;
  site_name: string;
  address: string;
  city: string;
  state: string;
  report_to_name: string;
  report_to_phone: string;
}

export interface Worker {
  id: string;
  worker_code: string;
  first_name: string;
  last_name: string;
  trade: string;
  classification: string;
  phone: string;
  is_active: boolean;
  osha_cert: boolean;
}

export interface Ticket {
  id: string;
  ticket_number: string;
  ticket_type: TicketType;
  status: TicketStatus;
  client_name: string;
  site_name: string;
  worker_name: string;
  job_title: string;
  work_date: string;
  total_hours: number;
  created_at: string;
}

export const mockAgency: Agency = {
  id: '1',
  name: 'ProStaff Industrial',
  branch_name: 'Houston South',
  phone: '(713) 555-0142',
  email: 'dispatch@prostaff.com',
  city: 'Houston',
  state: 'TX',
};

export const mockClients: Client[] = [
  { id: '1', company_name: 'Turner Construction', billing_email: 'ap@turner.com', billing_phone: '(713) 555-0201', sites_count: 3, open_tickets: 5, is_active: true },
  { id: '2', company_name: 'Bechtel Group', billing_email: 'invoices@bechtel.com', billing_phone: '(713) 555-0302', sites_count: 2, open_tickets: 2, is_active: true },
  { id: '3', company_name: 'Kiewit Corp', billing_email: 'billing@kiewit.com', billing_phone: '(713) 555-0403', sites_count: 1, open_tickets: 0, is_active: true },
  { id: '4', company_name: 'Fluor Corporation', billing_email: 'ap@fluor.com', billing_phone: '(713) 555-0504', sites_count: 4, open_tickets: 8, is_active: true },
  { id: '5', company_name: 'Jacobs Engineering', billing_email: 'pay@jacobs.com', billing_phone: '(713) 555-0605', sites_count: 1, open_tickets: 1, is_active: false },
];

export const mockSites: ClientSite[] = [
  { id: '1', client_id: '1', site_code: 'TC-HOU-01', site_name: 'Downtown Tower Project', address: '1200 Main St', city: 'Houston', state: 'TX', report_to_name: 'Mike Sullivan', report_to_phone: '(713) 555-1001' },
  { id: '2', client_id: '1', site_code: 'TC-HOU-02', site_name: 'Galleria Expansion', address: '5085 Westheimer Rd', city: 'Houston', state: 'TX', report_to_name: 'Sarah Chen', report_to_phone: '(713) 555-1002' },
  { id: '3', client_id: '2', site_code: 'BG-BAY-01', site_name: 'Baytown Refinery', address: '4800 Decker Dr', city: 'Baytown', state: 'TX', report_to_name: 'James Ward', report_to_phone: '(281) 555-2001' },
];

export const mockWorkers: Worker[] = [
  { id: '1', worker_code: 'W-1001', first_name: 'Carlos', last_name: 'Mendez', trade: 'Electrician', classification: 'Journeyman', phone: '(713) 555-8001', is_active: true, osha_cert: true },
  { id: '2', worker_code: 'W-1002', first_name: 'David', last_name: 'Johnson', trade: 'Pipefitter', classification: 'Foreman', phone: '(713) 555-8002', is_active: true, osha_cert: true },
  { id: '3', worker_code: 'W-1003', first_name: 'Maria', last_name: 'Garcia', trade: 'Welder', classification: 'Journeyman', phone: '(713) 555-8003', is_active: true, osha_cert: true },
  { id: '4', worker_code: 'W-1004', first_name: 'Robert', last_name: 'Williams', trade: 'Carpenter', classification: 'Apprentice', phone: '(713) 555-8004', is_active: true, osha_cert: false },
  { id: '5', worker_code: 'W-1005', first_name: 'James', last_name: 'Brown', trade: 'Iron Worker', classification: 'Journeyman', phone: '(713) 555-8005', is_active: false, osha_cert: true },
  { id: '6', worker_code: 'W-1006', first_name: 'Ana', last_name: 'Martinez', trade: 'Electrician', classification: 'Master', phone: '(713) 555-8006', is_active: true, osha_cert: true },
];

export const mockTickets: Ticket[] = [
  { id: '1', ticket_number: 'TT-2026-000101', ticket_type: 'daily', status: 'signed', client_name: 'Turner Construction', site_name: 'Downtown Tower Project', worker_name: 'Carlos Mendez', job_title: 'Electrical Rough-In', work_date: '2026-03-17', total_hours: 8, created_at: '2026-03-17T06:00:00Z' },
  { id: '2', ticket_number: 'TT-2026-000102', ticket_type: 'daily', status: 'sent', client_name: 'Turner Construction', site_name: 'Galleria Expansion', worker_name: 'David Johnson', job_title: 'Pipe Installation', work_date: '2026-03-17', total_hours: 10, created_at: '2026-03-17T06:15:00Z' },
  { id: '3', ticket_number: 'TT-2026-000103', ticket_type: 'daily', status: 'rejected', client_name: 'Bechtel Group', site_name: 'Baytown Refinery', worker_name: 'Maria Garcia', job_title: 'TIG Welding', work_date: '2026-03-17', total_hours: 8, created_at: '2026-03-17T06:30:00Z' },
  { id: '4', ticket_number: 'TT-2026-000104', ticket_type: 'daily', status: 'draft', client_name: 'Fluor Corporation', site_name: 'Channel Facility', worker_name: 'Robert Williams', job_title: 'Framing', work_date: '2026-03-18', total_hours: 0, created_at: '2026-03-18T05:45:00Z' },
  { id: '5', ticket_number: 'TT-2026-000105', ticket_type: 'weekly', status: 'sent', client_name: 'Turner Construction', site_name: 'Downtown Tower Project', worker_name: 'Ana Martinez', job_title: 'Panel Wiring', work_date: '2026-03-10', total_hours: 42, created_at: '2026-03-14T07:00:00Z' },
  { id: '6', ticket_number: 'TT-2026-000106', ticket_type: 'daily', status: 'signed', client_name: 'Kiewit Corp', site_name: 'Bridge Retrofit', worker_name: 'James Brown', job_title: 'Steel Erection', work_date: '2026-03-16', total_hours: 8, created_at: '2026-03-16T06:00:00Z' },
  { id: '7', ticket_number: 'TT-2026-000107', ticket_type: 'daily', status: 'viewed', client_name: 'Bechtel Group', site_name: 'Baytown Refinery', worker_name: 'Carlos Mendez', job_title: 'Motor Hookup', work_date: '2026-03-18', total_hours: 8, created_at: '2026-03-18T06:00:00Z' },
];

export const dashboardStats = {
  drafts: mockTickets.filter(t => t.status === 'draft').length,
  sent: mockTickets.filter(t => t.status === 'sent').length,
  unsigned: mockTickets.filter(t => ['sent', 'viewed'].includes(t.status)).length,
  signed: mockTickets.filter(t => t.status === 'signed').length,
  rejected: mockTickets.filter(t => t.status === 'rejected').length,
  workersOut: 4,
  weeklyHours: 84,
};
