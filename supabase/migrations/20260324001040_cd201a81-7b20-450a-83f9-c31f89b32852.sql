
-- ============================================
-- 1. ticket_counters table
-- ============================================
CREATE TABLE IF NOT EXISTS public.ticket_counters (
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  current_year integer NOT NULL DEFAULT EXTRACT(YEAR FROM now())::integer,
  last_number integer NOT NULL DEFAULT 0,
  PRIMARY KEY (agency_id, current_year)
);

ALTER TABLE public.ticket_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency reads own counters"
ON public.ticket_counters FOR SELECT TO authenticated
USING (agency_id = get_user_agency_id(auth.uid()));

CREATE POLICY "Agency updates own counters"
ON public.ticket_counters FOR UPDATE TO authenticated
USING (agency_id = get_user_agency_id(auth.uid()));

-- ============================================
-- 2. notifications table
-- ============================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  ticket_id uuid REFERENCES public.tickets(id) ON DELETE SET NULL,
  recipient_type text NOT NULL,
  recipient_id uuid,
  recipient_email text,
  template_key text NOT NULL,
  subject text,
  status text NOT NULL DEFAULT 'queued',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency reads own notifications"
ON public.notifications FOR SELECT TO authenticated
USING (agency_id = get_user_agency_id(auth.uid()));

CREATE POLICY "Agency inserts own notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (agency_id = get_user_agency_id(auth.uid()));

-- ============================================
-- 3. Helper SQL functions
-- ============================================

-- current_user_has_role: wraps has_role with auth.uid()
CREATE OR REPLACE FUNCTION public.current_user_has_role(_role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), _role)
$$;

-- current_user_agency_ids: returns all agency_ids for current user
CREATE OR REPLACE FUNCTION public.current_user_agency_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT agency_id FROM public.agency_members
  WHERE user_id = auth.uid() AND is_active = true
$$;

-- current_user_client_ids: returns all client_ids for current user
CREATE OR REPLACE FUNCTION public.current_user_client_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT client_id FROM public.client_signers
  WHERE user_id = auth.uid() AND is_active = true
$$;

-- current_user_worker_ids: returns all worker record ids for current user
CREATE OR REPLACE FUNCTION public.current_user_worker_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id FROM public.workers
  WHERE user_id = auth.uid() AND is_active = true
$$;

-- next_ticket_number: atomically increment and return formatted ticket number
CREATE OR REPLACE FUNCTION public.next_ticket_number(_agency_id uuid)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _year integer := EXTRACT(YEAR FROM now())::integer;
  _next integer;
BEGIN
  INSERT INTO public.ticket_counters (agency_id, current_year, last_number)
  VALUES (_agency_id, _year, 1)
  ON CONFLICT (agency_id, current_year)
  DO UPDATE SET last_number = ticket_counters.last_number + 1
  RETURNING last_number INTO _next;

  RETURN 'TT-' || _year::text || '-' || LPAD(_next::text, 6, '0');
END;
$$;

-- ============================================
-- 4. Performance indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_tickets_agency_id ON public.tickets(agency_id);
CREATE INDEX IF NOT EXISTS idx_tickets_client_id ON public.tickets(client_id);
CREATE INDEX IF NOT EXISTS idx_tickets_worker_id ON public.tickets(worker_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON public.tickets(created_at);
CREATE INDEX IF NOT EXISTS idx_clients_agency_id ON public.clients(agency_id);
CREATE INDEX IF NOT EXISTS idx_workers_agency_id ON public.workers(agency_id);
CREATE INDEX IF NOT EXISTS idx_pdf_documents_ticket_id ON public.pdf_documents(ticket_id);
CREATE INDEX IF NOT EXISTS idx_pdf_documents_pdf_type ON public.pdf_documents(pdf_type);
CREATE INDEX IF NOT EXISTS idx_notifications_agency_id ON public.notifications(agency_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON public.notifications(status);
CREATE INDEX IF NOT EXISTS idx_ticket_days_ticket_id ON public.ticket_days(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_signatures_ticket_id ON public.ticket_signatures(ticket_id);
CREATE INDEX IF NOT EXISTS idx_download_logs_ticket_id ON public.download_logs(ticket_id);
