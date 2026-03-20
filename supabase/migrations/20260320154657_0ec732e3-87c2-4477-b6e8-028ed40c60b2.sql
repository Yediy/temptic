
-- =============================================
-- TEMP TIC: Core Database Schema
-- =============================================

-- 1. Role enum
CREATE TYPE public.app_role AS ENUM ('super_admin', 'agency_admin', 'dispatcher', 'payroll', 'viewer', 'client_user', 'worker_user');

-- 2. Ticket status enum
CREATE TYPE public.ticket_status AS ENUM ('draft', 'sent', 'viewed', 'signed', 'rejected', 'corrected', 'closed');

-- 3. Ticket type enum
CREATE TYPE public.ticket_type AS ENUM ('daily', 'weekly');

-- 4. PDF type enum
CREATE TYPE public.pdf_type AS ENUM ('draft', 'agency_copy', 'client_copy', 'worker_copy', 'rejected_copy', 'corrected_copy');

-- 5. Signer type enum
CREATE TYPE public.signer_type AS ENUM ('client', 'agency', 'worker');

-- =============================================
-- PROFILES (linked to auth.users)
-- =============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- USER ROLES (separate table per security rules)
-- =============================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- =============================================
-- AGENCIES
-- =============================================
CREATE TABLE public.agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  branch_name TEXT,
  phone TEXT,
  email TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- AGENCY MEMBERS (link users to agencies)
-- =============================================
CREATE TABLE public.agency_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'dispatcher',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agency_id, user_id)
);

-- =============================================
-- CLIENTS
-- =============================================
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  billing_name TEXT,
  billing_email TEXT,
  billing_phone TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- CLIENT SITES
-- =============================================
CREATE TABLE public.client_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  site_code TEXT,
  site_name TEXT,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  report_to_name TEXT,
  report_to_phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- CLIENT SIGNERS
-- =============================================
CREATE TABLE public.client_signers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.client_sites(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  title TEXT,
  initials TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- WORKERS
-- =============================================
CREATE TABLE public.workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  worker_code TEXT UNIQUE,
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  trade TEXT,
  classification TEXT,
  osha_cert BOOLEAN NOT NULL DEFAULT false,
  nccer_cert BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- TICKETS
-- =============================================
CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.client_sites(id) ON DELETE SET NULL,
  worker_id UUID NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  ticket_number TEXT NOT NULL UNIQUE,
  order_id TEXT,
  ticket_type public.ticket_type NOT NULL DEFAULT 'daily',
  status public.ticket_status NOT NULL DEFAULT 'draft',

  work_date DATE,
  week_start_date DATE,
  week_end_date DATE,

  -- Snapshots (frozen at creation)
  client_company_name_snapshot TEXT NOT NULL,
  site_code_snapshot TEXT,
  site_name_snapshot TEXT,
  site_address_snapshot TEXT,
  report_to_name_snapshot TEXT,
  report_to_phone_snapshot TEXT,
  worker_name_snapshot TEXT NOT NULL,

  job_title TEXT,
  equipment_required TEXT,
  equipment_provided BOOLEAN NOT NULL DEFAULT false,
  start_time TIME,

  lunch_required BOOLEAN NOT NULL DEFAULT false,
  transportation_provided BOOLEAN NOT NULL DEFAULT false,
  hard_hat_required BOOLEAN NOT NULL DEFAULT false,
  boots_required BOOLEAN NOT NULL DEFAULT false,
  gloves_required BOOLEAN NOT NULL DEFAULT false,
  glasses_required BOOLEAN NOT NULL DEFAULT false,
  vest_required BOOLEAN NOT NULL DEFAULT false,

  total_hours NUMERIC(6,2),
  client_initials TEXT,

  supervisor_name TEXT,
  supervisor_title TEXT,
  signed_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,

  future_order_date DATE,
  future_order_time TIME,
  future_order_worker_count INTEGER,
  future_order_same_workers BOOLEAN NOT NULL DEFAULT false,

  notes TEXT,
  rejection_reason TEXT,
  version_number INTEGER NOT NULL DEFAULT 1,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- TICKET DAYS (for weekly + daily detail)
-- =============================================
CREATE TABLE public.ticket_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  day_date DATE NOT NULL,
  day_name TEXT,
  start_time TIME,
  lunch_start TIME,
  lunch_end TIME,
  end_time TIME,
  regular_hours NUMERIC(6,2) NOT NULL DEFAULT 0,
  overtime_hours NUMERIC(6,2) NOT NULL DEFAULT 0,
  total_hours NUMERIC(6,2) NOT NULL DEFAULT 0,
  client_approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- TICKET SIGNATURES
-- =============================================
CREATE TABLE public.ticket_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  signer_type public.signer_type NOT NULL,
  signer_name TEXT NOT NULL,
  signer_title TEXT,
  signer_initials TEXT,
  signer_email TEXT,
  signer_phone TEXT,
  signature_image_url TEXT,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- PDF DOCUMENTS
-- =============================================
CREATE TABLE public.pdf_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  pdf_type public.pdf_type NOT NULL,
  version_number INTEGER NOT NULL DEFAULT 1,
  file_name TEXT NOT NULL,
  storage_url TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  generated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- =============================================
-- DOWNLOAD LOGS
-- =============================================
CREATE TABLE public.download_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  pdf_document_id UUID REFERENCES public.pdf_documents(id) ON DELETE SET NULL,
  downloaded_by_role TEXT NOT NULL,
  downloaded_by_id UUID,
  ip_address TEXT,
  user_agent TEXT,
  downloaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- AUDIT LOGS
-- =============================================
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE,
  actor_type TEXT NOT NULL,
  actor_id UUID,
  action TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- TICKET TEMPLATES
-- =============================================
CREATE TABLE public.ticket_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  template_scope public.ticket_type NOT NULL DEFAULT 'daily',
  template_type TEXT NOT NULL DEFAULT 'universal',
  source_file_url TEXT,
  preview_image_url TEXT,
  html_markup TEXT,
  css_markup TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- TEMPLATE FIELD MAPPINGS
-- =============================================
CREATE TABLE public.template_field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.ticket_templates(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL DEFAULT 1,
  field_key TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text',
  x NUMERIC(10,2) NOT NULL DEFAULT 0,
  y NUMERIC(10,2) NOT NULL DEFAULT 0,
  width NUMERIC(10,2),
  height NUMERIC(10,2),
  font_size NUMERIC(6,2),
  font_family TEXT DEFAULT 'Helvetica',
  is_required BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- AGENCY SETTINGS
-- =============================================
CREATE TABLE public.agency_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL UNIQUE REFERENCES public.agencies(id) ON DELETE CASCADE,
  default_ticket_type public.ticket_type NOT NULL DEFAULT 'daily',
  default_start_time TIME DEFAULT '07:00',
  default_template_id UUID REFERENCES public.ticket_templates(id) ON DELETE SET NULL,
  worker_sees_client_name BOOLEAN NOT NULL DEFAULT true,
  worker_sees_site_name BOOLEAN NOT NULL DEFAULT true,
  signature_request_email_text TEXT,
  reminder_hours INTEGER NOT NULL DEFAULT 24,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_tickets_agency_id ON public.tickets(agency_id);
CREATE INDEX idx_tickets_client_id ON public.tickets(client_id);
CREATE INDEX idx_tickets_worker_id ON public.tickets(worker_id);
CREATE INDEX idx_tickets_status ON public.tickets(status);
CREATE INDEX idx_tickets_work_date ON public.tickets(work_date);
CREATE INDEX idx_tickets_ticket_number ON public.tickets(ticket_number);
CREATE INDEX idx_ticket_days_ticket_id ON public.ticket_days(ticket_id);
CREATE INDEX idx_pdf_documents_ticket_id ON public.pdf_documents(ticket_id);
CREATE INDEX idx_audit_logs_ticket_id ON public.audit_logs(ticket_id);
CREATE INDEX idx_download_logs_ticket_id ON public.download_logs(ticket_id);
CREATE INDEX idx_agency_members_user_id ON public.agency_members(user_id);
CREATE INDEX idx_agency_members_agency_id ON public.agency_members(agency_id);
CREATE INDEX idx_client_signers_client_id ON public.client_signers(client_id);
CREATE INDEX idx_workers_agency_id ON public.workers(agency_id);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);

-- =============================================
-- SECURITY DEFINER FUNCTIONS
-- =============================================

-- Check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Get user's agency_id
CREATE OR REPLACE FUNCTION public.get_user_agency_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT agency_id FROM public.agency_members
  WHERE user_id = _user_id AND is_active = true
  LIMIT 1
$$;

-- Get user's client_id (for client users)
CREATE OR REPLACE FUNCTION public.get_user_client_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT client_id FROM public.client_signers
  WHERE user_id = _user_id AND is_active = true
  LIMIT 1
$$;

-- Get user's worker record id
CREATE OR REPLACE FUNCTION public.get_user_worker_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.workers
  WHERE user_id = _user_id AND is_active = true
  LIMIT 1
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  );
  RETURN NEW;
END;
$$;

-- Trigger for auto profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- RLS POLICIES
-- =============================================

-- Profiles: users read/update own
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());

-- User roles: users read own
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Agencies: agency members can read their agency
CREATE POLICY "Agency members read agency" ON public.agencies FOR SELECT TO authenticated
  USING (id = public.get_user_agency_id(auth.uid()));
CREATE POLICY "Agency admins update agency" ON public.agencies FOR UPDATE TO authenticated
  USING (id = public.get_user_agency_id(auth.uid()) AND public.has_role(auth.uid(), 'agency_admin'));

-- Agency members: read own agency members
CREATE POLICY "Read own agency members" ON public.agency_members FOR SELECT TO authenticated
  USING (agency_id = public.get_user_agency_id(auth.uid()));

-- Clients: agency members read/write their clients
CREATE POLICY "Agency reads clients" ON public.clients FOR SELECT TO authenticated
  USING (agency_id = public.get_user_agency_id(auth.uid()));
CREATE POLICY "Agency inserts clients" ON public.clients FOR INSERT TO authenticated
  WITH CHECK (agency_id = public.get_user_agency_id(auth.uid()));
CREATE POLICY "Agency updates clients" ON public.clients FOR UPDATE TO authenticated
  USING (agency_id = public.get_user_agency_id(auth.uid()));
-- Client users read their own client
CREATE POLICY "Client reads own company" ON public.clients FOR SELECT TO authenticated
  USING (id = public.get_user_client_id(auth.uid()));

-- Client sites
CREATE POLICY "Agency reads sites" ON public.client_sites FOR SELECT TO authenticated
  USING (client_id IN (SELECT id FROM public.clients WHERE agency_id = public.get_user_agency_id(auth.uid())));
CREATE POLICY "Agency inserts sites" ON public.client_sites FOR INSERT TO authenticated
  WITH CHECK (client_id IN (SELECT id FROM public.clients WHERE agency_id = public.get_user_agency_id(auth.uid())));
CREATE POLICY "Agency updates sites" ON public.client_sites FOR UPDATE TO authenticated
  USING (client_id IN (SELECT id FROM public.clients WHERE agency_id = public.get_user_agency_id(auth.uid())));
-- Client users read their sites
CREATE POLICY "Client reads own sites" ON public.client_sites FOR SELECT TO authenticated
  USING (client_id = public.get_user_client_id(auth.uid()));

-- Client signers
CREATE POLICY "Agency reads signers" ON public.client_signers FOR SELECT TO authenticated
  USING (client_id IN (SELECT id FROM public.clients WHERE agency_id = public.get_user_agency_id(auth.uid())));
CREATE POLICY "Agency inserts signers" ON public.client_signers FOR INSERT TO authenticated
  WITH CHECK (client_id IN (SELECT id FROM public.clients WHERE agency_id = public.get_user_agency_id(auth.uid())));

-- Workers: agency reads own workers
CREATE POLICY "Agency reads workers" ON public.workers FOR SELECT TO authenticated
  USING (agency_id = public.get_user_agency_id(auth.uid()));
CREATE POLICY "Agency inserts workers" ON public.workers FOR INSERT TO authenticated
  WITH CHECK (agency_id = public.get_user_agency_id(auth.uid()));
CREATE POLICY "Agency updates workers" ON public.workers FOR UPDATE TO authenticated
  USING (agency_id = public.get_user_agency_id(auth.uid()));
-- Workers read own record
CREATE POLICY "Worker reads own record" ON public.workers FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Tickets: agency full access, client reads own, worker reads own
CREATE POLICY "Agency reads tickets" ON public.tickets FOR SELECT TO authenticated
  USING (agency_id = public.get_user_agency_id(auth.uid()));
CREATE POLICY "Agency inserts tickets" ON public.tickets FOR INSERT TO authenticated
  WITH CHECK (agency_id = public.get_user_agency_id(auth.uid()));
CREATE POLICY "Agency updates tickets" ON public.tickets FOR UPDATE TO authenticated
  USING (agency_id = public.get_user_agency_id(auth.uid()));
CREATE POLICY "Client reads own tickets" ON public.tickets FOR SELECT TO authenticated
  USING (client_id = public.get_user_client_id(auth.uid()));
CREATE POLICY "Worker reads own tickets" ON public.tickets FOR SELECT TO authenticated
  USING (worker_id = public.get_user_worker_id(auth.uid()));

-- Ticket days
CREATE POLICY "Agency reads ticket days" ON public.ticket_days FOR SELECT TO authenticated
  USING (ticket_id IN (SELECT id FROM public.tickets WHERE agency_id = public.get_user_agency_id(auth.uid())));
CREATE POLICY "Agency inserts ticket days" ON public.ticket_days FOR INSERT TO authenticated
  WITH CHECK (ticket_id IN (SELECT id FROM public.tickets WHERE agency_id = public.get_user_agency_id(auth.uid())));
CREATE POLICY "Client reads own ticket days" ON public.ticket_days FOR SELECT TO authenticated
  USING (ticket_id IN (SELECT id FROM public.tickets WHERE client_id = public.get_user_client_id(auth.uid())));
CREATE POLICY "Worker reads own ticket days" ON public.ticket_days FOR SELECT TO authenticated
  USING (ticket_id IN (SELECT id FROM public.tickets WHERE worker_id = public.get_user_worker_id(auth.uid())));

-- Ticket signatures
CREATE POLICY "Agency reads signatures" ON public.ticket_signatures FOR SELECT TO authenticated
  USING (ticket_id IN (SELECT id FROM public.tickets WHERE agency_id = public.get_user_agency_id(auth.uid())));
CREATE POLICY "Client reads own signatures" ON public.ticket_signatures FOR SELECT TO authenticated
  USING (ticket_id IN (SELECT id FROM public.tickets WHERE client_id = public.get_user_client_id(auth.uid())));
CREATE POLICY "Client inserts signature" ON public.ticket_signatures FOR INSERT TO authenticated
  WITH CHECK (ticket_id IN (SELECT id FROM public.tickets WHERE client_id = public.get_user_client_id(auth.uid())));

-- PDF documents
CREATE POLICY "Agency reads pdfs" ON public.pdf_documents FOR SELECT TO authenticated
  USING (ticket_id IN (SELECT id FROM public.tickets WHERE agency_id = public.get_user_agency_id(auth.uid())));
CREATE POLICY "Client reads own pdfs" ON public.pdf_documents FOR SELECT TO authenticated
  USING (ticket_id IN (SELECT id FROM public.tickets WHERE client_id = public.get_user_client_id(auth.uid()))
    AND pdf_type IN ('client_copy', 'draft'));
CREATE POLICY "Worker reads own pdfs" ON public.pdf_documents FOR SELECT TO authenticated
  USING (ticket_id IN (SELECT id FROM public.tickets WHERE worker_id = public.get_user_worker_id(auth.uid()))
    AND pdf_type = 'worker_copy');

-- Download logs: agency reads all, others read own
CREATE POLICY "Agency reads download logs" ON public.download_logs FOR SELECT TO authenticated
  USING (ticket_id IN (SELECT id FROM public.tickets WHERE agency_id = public.get_user_agency_id(auth.uid())));
CREATE POLICY "Insert download logs" ON public.download_logs FOR INSERT TO authenticated
  WITH CHECK (true);

-- Audit logs: agency reads
CREATE POLICY "Agency reads audit logs" ON public.audit_logs FOR SELECT TO authenticated
  USING (ticket_id IN (SELECT id FROM public.tickets WHERE agency_id = public.get_user_agency_id(auth.uid())));
CREATE POLICY "Insert audit logs" ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (true);

-- Templates: agency manages own
CREATE POLICY "Agency reads templates" ON public.ticket_templates FOR SELECT TO authenticated
  USING (agency_id = public.get_user_agency_id(auth.uid()) OR agency_id IS NULL);
CREATE POLICY "Agency inserts templates" ON public.ticket_templates FOR INSERT TO authenticated
  WITH CHECK (agency_id = public.get_user_agency_id(auth.uid()));
CREATE POLICY "Agency updates templates" ON public.ticket_templates FOR UPDATE TO authenticated
  USING (agency_id = public.get_user_agency_id(auth.uid()));

-- Template field mappings
CREATE POLICY "Agency reads mappings" ON public.template_field_mappings FOR SELECT TO authenticated
  USING (template_id IN (SELECT id FROM public.ticket_templates WHERE agency_id = public.get_user_agency_id(auth.uid()) OR agency_id IS NULL));

-- Agency settings
CREATE POLICY "Agency reads own settings" ON public.agency_settings FOR SELECT TO authenticated
  USING (agency_id = public.get_user_agency_id(auth.uid()));
CREATE POLICY "Agency updates own settings" ON public.agency_settings FOR UPDATE TO authenticated
  USING (agency_id = public.get_user_agency_id(auth.uid()));
CREATE POLICY "Agency inserts own settings" ON public.agency_settings FOR INSERT TO authenticated
  WITH CHECK (agency_id = public.get_user_agency_id(auth.uid()));
