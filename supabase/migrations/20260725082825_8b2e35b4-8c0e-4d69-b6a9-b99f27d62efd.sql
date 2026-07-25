
-- ============================================================
-- IWOS 4.5 — Digital Time Ticket OS (additive)
-- ============================================================

-- Status enum
DO $$ BEGIN
  CREATE TYPE public.tto_ticket_status AS ENUM (
    'open','in_progress','submitted','approved','rejected',
    'corrected','payroll_ready','billing_ready','closed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.tto_punch_kind AS ENUM (
    'clock_in','clock_out','break_start','break_end'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.tto_punch_source AS ENUM (
    'mobile','portal','qr','nfc','supervisor','system'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- tto_time_tickets ----------
CREATE TABLE public.tto_time_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL,
  worker_id UUID NOT NULL,
  client_id UUID,
  site_id UUID,
  assignment_id UUID,
  shift_id UUID,
  work_date DATE NOT NULL,
  scheduled_start TIMESTAMPTZ,
  scheduled_end TIMESTAMPTZ,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  status public.tto_ticket_status NOT NULL DEFAULT 'open',
  regular_hours NUMERIC(8,2) DEFAULT 0,
  overtime_hours NUMERIC(8,2) DEFAULT 0,
  double_time_hours NUMERIC(8,2) DEFAULT 0,
  break_minutes INTEGER DEFAULT 0,
  travel_minutes INTEGER DEFAULT 0,
  mileage NUMERIC(10,2) DEFAULT 0,
  supervisor_notes TEXT,
  worker_notes TEXT,
  anomalies JSONB DEFAULT '[]'::jsonb,
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.tto_time_tickets TO authenticated;
GRANT ALL ON public.tto_time_tickets TO service_role;
ALTER TABLE public.tto_time_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tto_tickets_agency_read" ON public.tto_time_tickets FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(),'agency_admin'::public.app_role) OR private.has_role(auth.uid(),'recruiter'::public.app_role)
    OR worker_id IN (SELECT id FROM public.workers WHERE user_id = auth.uid())
    OR client_id IN (SELECT client_id FROM public.client_signers WHERE user_id = auth.uid()));
CREATE POLICY "tto_tickets_agency_write" ON public.tto_time_tickets FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(),'agency_admin'::public.app_role) OR private.has_role(auth.uid(),'recruiter'::public.app_role)
    OR worker_id IN (SELECT id FROM public.workers WHERE user_id = auth.uid()));
CREATE POLICY "tto_tickets_agency_update" ON public.tto_time_tickets FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(),'agency_admin'::public.app_role) OR private.has_role(auth.uid(),'recruiter'::public.app_role));
CREATE TRIGGER trg_tto_tickets_updated BEFORE UPDATE ON public.tto_time_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_tto_tickets_agency_status ON public.tto_time_tickets(agency_id, status);
CREATE INDEX idx_tto_tickets_worker_date ON public.tto_time_tickets(worker_id, work_date);

-- ---------- tto_time_entries (punches) ----------
CREATE TABLE public.tto_time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL,
  time_ticket_id UUID NOT NULL REFERENCES public.tto_time_tickets(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL,
  kind public.tto_punch_kind NOT NULL,
  source public.tto_punch_source NOT NULL DEFAULT 'mobile',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  accuracy_m NUMERIC(8,2),
  device_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.tto_time_entries TO authenticated;
GRANT ALL ON public.tto_time_entries TO service_role;
ALTER TABLE public.tto_time_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tto_entries_read" ON public.tto_time_entries FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(),'agency_admin'::public.app_role) OR private.has_role(auth.uid(),'recruiter'::public.app_role)
    OR worker_id IN (SELECT id FROM public.workers WHERE user_id = auth.uid()));
CREATE POLICY "tto_entries_insert" ON public.tto_time_entries FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(),'agency_admin'::public.app_role)
    OR worker_id IN (SELECT id FROM public.workers WHERE user_id = auth.uid()));
CREATE INDEX idx_tto_entries_ticket ON public.tto_time_entries(time_ticket_id, occurred_at);

-- ---------- tto_break_entries ----------
CREATE TABLE public.tto_break_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL,
  time_ticket_id UUID NOT NULL REFERENCES public.tto_time_tickets(id) ON DELETE CASCADE,
  break_start TIMESTAMPTZ NOT NULL,
  break_end TIMESTAMPTZ,
  minutes INTEGER,
  paid BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.tto_break_entries TO authenticated;
GRANT ALL ON public.tto_break_entries TO service_role;
ALTER TABLE public.tto_break_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tto_breaks_scope" ON public.tto_break_entries FOR ALL TO authenticated
  USING (time_ticket_id IN (SELECT id FROM public.tto_time_tickets t
    WHERE private.has_role(auth.uid(),'agency_admin'::public.app_role)
      OR t.worker_id IN (SELECT id FROM public.workers WHERE user_id = auth.uid())))
  WITH CHECK (time_ticket_id IN (SELECT id FROM public.tto_time_tickets t
    WHERE private.has_role(auth.uid(),'agency_admin'::public.app_role)
      OR t.worker_id IN (SELECT id FROM public.workers WHERE user_id = auth.uid())));

-- ---------- tto_shift_events ----------
CREATE TABLE public.tto_shift_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL,
  time_ticket_id UUID NOT NULL REFERENCES public.tto_time_tickets(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  detail JSONB DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tto_shift_events TO authenticated;
GRANT ALL ON public.tto_shift_events TO service_role;
ALTER TABLE public.tto_shift_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tto_shift_events_read" ON public.tto_shift_events FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(),'agency_admin'::public.app_role) OR private.has_role(auth.uid(),'recruiter'::public.app_role));

-- ---------- tto_ticket_approvals ----------
CREATE TABLE public.tto_ticket_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL,
  time_ticket_id UUID NOT NULL REFERENCES public.tto_time_tickets(id) ON DELETE CASCADE,
  approver_id UUID,
  approver_kind TEXT NOT NULL DEFAULT 'client',
  decision TEXT NOT NULL,
  comment TEXT,
  channel TEXT DEFAULT 'portal',
  decided_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.tto_ticket_approvals TO authenticated;
GRANT ALL ON public.tto_ticket_approvals TO service_role;
ALTER TABLE public.tto_ticket_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tto_approvals_read" ON public.tto_ticket_approvals FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(),'agency_admin'::public.app_role) OR private.has_role(auth.uid(),'recruiter'::public.app_role)
    OR time_ticket_id IN (SELECT id FROM public.tto_time_tickets t
      WHERE t.worker_id IN (SELECT id FROM public.workers WHERE user_id = auth.uid())
        OR t.client_id IN (SELECT client_id FROM public.client_signers WHERE user_id = auth.uid())));
CREATE POLICY "tto_approvals_insert" ON public.tto_ticket_approvals FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(),'agency_admin'::public.app_role)
    OR time_ticket_id IN (SELECT id FROM public.tto_time_tickets t
      WHERE t.client_id IN (SELECT client_id FROM public.client_signers WHERE user_id = auth.uid())));

-- ---------- tto_ticket_corrections ----------
CREATE TABLE public.tto_ticket_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL,
  time_ticket_id UUID NOT NULL REFERENCES public.tto_time_tickets(id) ON DELETE CASCADE,
  requested_by UUID,
  reason TEXT NOT NULL,
  proposed_changes JSONB DEFAULT '{}'::jsonb,
  evidence JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  resolution_note TEXT,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.tto_ticket_corrections TO authenticated;
GRANT ALL ON public.tto_ticket_corrections TO service_role;
ALTER TABLE public.tto_ticket_corrections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tto_corrections_read" ON public.tto_ticket_corrections FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(),'agency_admin'::public.app_role) OR private.has_role(auth.uid(),'recruiter'::public.app_role)
    OR requested_by = auth.uid());
CREATE POLICY "tto_corrections_insert" ON public.tto_ticket_corrections FOR INSERT TO authenticated
  WITH CHECK (requested_by = auth.uid() OR private.has_role(auth.uid(),'agency_admin'::public.app_role));
CREATE POLICY "tto_corrections_update_admin" ON public.tto_ticket_corrections FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(),'agency_admin'::public.app_role));
CREATE TRIGGER trg_tto_corrections_updated BEFORE UPDATE ON public.tto_ticket_corrections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- tto_labor_costs ----------
CREATE TABLE public.tto_labor_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL,
  time_ticket_id UUID NOT NULL REFERENCES public.tto_time_tickets(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL,
  line_kind TEXT NOT NULL,
  hours NUMERIC(8,2) DEFAULT 0,
  rate NUMERIC(10,2) DEFAULT 0,
  amount NUMERIC(12,2) DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tto_labor_costs TO authenticated;
GRANT ALL ON public.tto_labor_costs TO service_role;
ALTER TABLE public.tto_labor_costs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tto_labor_read" ON public.tto_labor_costs FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(),'agency_admin'::public.app_role));

-- ---------- tto_billable_hours ----------
CREATE TABLE public.tto_billable_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL,
  time_ticket_id UUID NOT NULL REFERENCES public.tto_time_tickets(id) ON DELETE CASCADE,
  client_id UUID,
  line_kind TEXT NOT NULL,
  hours NUMERIC(8,2) DEFAULT 0,
  bill_rate NUMERIC(10,2) DEFAULT 0,
  amount NUMERIC(12,2) DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tto_billable_hours TO authenticated;
GRANT ALL ON public.tto_billable_hours TO service_role;
ALTER TABLE public.tto_billable_hours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tto_bill_read" ON public.tto_billable_hours FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(),'agency_admin'::public.app_role));

-- ---------- tto_payroll_batches ----------
CREATE TABLE public.tto_payroll_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL,
  name TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  totals JSONB DEFAULT '{}'::jsonb,
  ticket_ids UUID[] DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tto_payroll_batches TO authenticated;
GRANT ALL ON public.tto_payroll_batches TO service_role;
ALTER TABLE public.tto_payroll_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tto_payroll_read" ON public.tto_payroll_batches FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(),'agency_admin'::public.app_role));
CREATE TRIGGER trg_tto_payroll_updated BEFORE UPDATE ON public.tto_payroll_batches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- tto_billing_batches ----------
CREATE TABLE public.tto_billing_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL,
  client_id UUID,
  name TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  totals JSONB DEFAULT '{}'::jsonb,
  ticket_ids UUID[] DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tto_billing_batches TO authenticated;
GRANT ALL ON public.tto_billing_batches TO service_role;
ALTER TABLE public.tto_billing_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tto_billing_read" ON public.tto_billing_batches FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(),'agency_admin'::public.app_role));
CREATE TRIGGER trg_tto_billing_updated BEFORE UPDATE ON public.tto_billing_batches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- tto_audit_events (immutable) ----------
CREATE TABLE public.tto_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL,
  time_ticket_id UUID,
  actor_id UUID,
  actor_kind TEXT,
  action TEXT NOT NULL,
  original_value JSONB,
  updated_value JSONB,
  reason TEXT,
  device TEXT,
  ip_address TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.tto_audit_events TO authenticated;
GRANT ALL ON public.tto_audit_events TO service_role;
ALTER TABLE public.tto_audit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tto_audit_read" ON public.tto_audit_events FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(),'agency_admin'::public.app_role));
CREATE POLICY "tto_audit_insert" ON public.tto_audit_events FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid() OR private.has_role(auth.uid(),'agency_admin'::public.app_role));
-- No UPDATE / DELETE policies: append-only for authenticated.

-- ---------- tto_gps_events ----------
CREATE TABLE public.tto_gps_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL,
  time_ticket_id UUID REFERENCES public.tto_time_tickets(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL,
  latitude NUMERIC(9,6) NOT NULL,
  longitude NUMERIC(9,6) NOT NULL,
  accuracy_m NUMERIC(8,2),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.tto_gps_events TO authenticated;
GRANT ALL ON public.tto_gps_events TO service_role;
ALTER TABLE public.tto_gps_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tto_gps_scope" ON public.tto_gps_events FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'agency_admin'::public.app_role)
    OR worker_id IN (SELECT id FROM public.workers WHERE user_id = auth.uid()))
  WITH CHECK (private.has_role(auth.uid(),'agency_admin'::public.app_role)
    OR worker_id IN (SELECT id FROM public.workers WHERE user_id = auth.uid()));

-- ---------- tto_expense_entries ----------
CREATE TABLE public.tto_expense_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL,
  time_ticket_id UUID NOT NULL REFERENCES public.tto_time_tickets(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL,
  kind TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  quantity NUMERIC(10,2) DEFAULT 0,
  note TEXT,
  receipt_url TEXT,
  approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.tto_expense_entries TO authenticated;
GRANT ALL ON public.tto_expense_entries TO service_role;
ALTER TABLE public.tto_expense_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tto_expense_scope" ON public.tto_expense_entries FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'agency_admin'::public.app_role)
    OR worker_id IN (SELECT id FROM public.workers WHERE user_id = auth.uid()))
  WITH CHECK (private.has_role(auth.uid(),'agency_admin'::public.app_role)
    OR worker_id IN (SELECT id FROM public.workers WHERE user_id = auth.uid()));

-- Realtime for live labor dashboard
ALTER PUBLICATION supabase_realtime ADD TABLE public.tto_time_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tto_time_entries;
