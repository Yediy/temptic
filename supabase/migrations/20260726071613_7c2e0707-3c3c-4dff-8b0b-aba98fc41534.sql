-- IWOS 4.6 — Payroll & Billing OP (additive)

-- Reusable enum-like check helper via text status columns.

-- 1) Worker pay rates
CREATE TABLE public.pb_worker_pay_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL,
  worker_id UUID NOT NULL,
  rate_type TEXT NOT NULL CHECK (rate_type IN ('regular','overtime','double_time','holiday','shift_diff','bonus','per_diem','mileage')),
  amount NUMERIC(12,4) NOT NULL DEFAULT 0,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.pb_worker_pay_rates (agency_id, worker_id, rate_type);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pb_worker_pay_rates TO authenticated;
GRANT ALL ON public.pb_worker_pay_rates TO service_role;
ALTER TABLE public.pb_worker_pay_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pb_pay_rates_read" ON public.pb_worker_pay_rates FOR SELECT TO authenticated
  USING (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid()));
CREATE POLICY "pb_pay_rates_write" ON public.pb_worker_pay_rates FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'agency_admin'::app_role) OR private.has_role(auth.uid(),'payroll'::app_role) OR private.has_role(auth.uid(),'super_admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(),'agency_admin'::app_role) OR private.has_role(auth.uid(),'payroll'::app_role) OR private.has_role(auth.uid(),'super_admin'::app_role));
CREATE TRIGGER pb_pay_rates_upd BEFORE UPDATE ON public.pb_worker_pay_rates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Client bill rates
CREATE TABLE public.pb_client_bill_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL,
  client_id UUID NOT NULL,
  role_title TEXT,
  rate_type TEXT NOT NULL CHECK (rate_type IN ('regular','overtime','double_time','holiday','shift_diff','travel','expense')),
  amount NUMERIC(12,4) NOT NULL DEFAULT 0,
  markup_pct NUMERIC(6,3) NOT NULL DEFAULT 0,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.pb_client_bill_rates (agency_id, client_id, rate_type);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pb_client_bill_rates TO authenticated;
GRANT ALL ON public.pb_client_bill_rates TO service_role;
ALTER TABLE public.pb_client_bill_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pb_bill_rates_read" ON public.pb_client_bill_rates FOR SELECT TO authenticated
  USING (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid()));
CREATE POLICY "pb_bill_rates_write" ON public.pb_client_bill_rates FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'agency_admin'::app_role) OR private.has_role(auth.uid(),'payroll'::app_role) OR private.has_role(auth.uid(),'super_admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(),'agency_admin'::app_role) OR private.has_role(auth.uid(),'payroll'::app_role) OR private.has_role(auth.uid(),'super_admin'::app_role));
CREATE TRIGGER pb_bill_rates_upd BEFORE UPDATE ON public.pb_client_bill_rates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Commission rules
CREATE TABLE public.pb_commission_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL,
  recruiter_id UUID,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('placement','margin','referral','override','split')),
  name TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pb_commission_rules TO authenticated;
GRANT ALL ON public.pb_commission_rules TO service_role;
ALTER TABLE public.pb_commission_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pb_commission_rules_read" ON public.pb_commission_rules FOR SELECT TO authenticated
  USING (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid()));
CREATE POLICY "pb_commission_rules_write" ON public.pb_commission_rules FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'agency_admin'::app_role) OR private.has_role(auth.uid(),'super_admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(),'agency_admin'::app_role) OR private.has_role(auth.uid(),'super_admin'::app_role));
CREATE TRIGGER pb_commission_rules_upd BEFORE UPDATE ON public.pb_commission_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Payroll runs
CREATE TABLE public.pb_payroll_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL,
  name TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review','approved','paid','exception','void')),
  source_batch_id UUID,
  totals JSONB NOT NULL DEFAULT '{}'::jsonb,
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  paid_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.pb_payroll_runs (agency_id, period_end DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pb_payroll_runs TO authenticated;
GRANT ALL ON public.pb_payroll_runs TO service_role;
ALTER TABLE public.pb_payroll_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pb_payroll_runs_read" ON public.pb_payroll_runs FOR SELECT TO authenticated
  USING (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid()));
CREATE POLICY "pb_payroll_runs_write" ON public.pb_payroll_runs FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'agency_admin'::app_role) OR private.has_role(auth.uid(),'payroll'::app_role) OR private.has_role(auth.uid(),'super_admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(),'agency_admin'::app_role) OR private.has_role(auth.uid(),'payroll'::app_role) OR private.has_role(auth.uid(),'super_admin'::app_role));
CREATE TRIGGER pb_payroll_runs_upd BEFORE UPDATE ON public.pb_payroll_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Payroll items
CREATE TABLE public.pb_payroll_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.pb_payroll_runs(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL,
  worker_id UUID NOT NULL,
  ticket_id UUID,
  regular_hours NUMERIC(10,2) NOT NULL DEFAULT 0,
  ot_hours NUMERIC(10,2) NOT NULL DEFAULT 0,
  dt_hours NUMERIC(10,2) NOT NULL DEFAULT 0,
  holiday_hours NUMERIC(10,2) NOT NULL DEFAULT 0,
  shift_diff NUMERIC(12,2) NOT NULL DEFAULT 0,
  bonuses NUMERIC(12,2) NOT NULL DEFAULT 0,
  mileage NUMERIC(12,2) NOT NULL DEFAULT 0,
  per_diem NUMERIC(12,2) NOT NULL DEFAULT 0,
  expenses NUMERIC(12,2) NOT NULL DEFAULT 0,
  gross_pay NUMERIC(12,2) NOT NULL DEFAULT 0,
  taxes NUMERIC(12,2) NOT NULL DEFAULT 0,
  deductions NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_pay NUMERIC(12,2) NOT NULL DEFAULT 0,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.pb_payroll_items (run_id);
CREATE INDEX ON public.pb_payroll_items (agency_id, worker_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pb_payroll_items TO authenticated;
GRANT ALL ON public.pb_payroll_items TO service_role;
ALTER TABLE public.pb_payroll_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pb_payroll_items_read" ON public.pb_payroll_items FOR SELECT TO authenticated
  USING (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid()));
CREATE POLICY "pb_payroll_items_write" ON public.pb_payroll_items FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'agency_admin'::app_role) OR private.has_role(auth.uid(),'payroll'::app_role) OR private.has_role(auth.uid(),'super_admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(),'agency_admin'::app_role) OR private.has_role(auth.uid(),'payroll'::app_role) OR private.has_role(auth.uid(),'super_admin'::app_role));
CREATE TRIGGER pb_payroll_items_upd BEFORE UPDATE ON public.pb_payroll_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Protect approved payroll items from edit/delete
CREATE OR REPLACE FUNCTION public.pb_protect_approved_payroll_items() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _status TEXT;
BEGIN
  IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN RETURN COALESCE(NEW, OLD); END IF;
  SELECT status INTO _status FROM public.pb_payroll_runs WHERE id = COALESCE(NEW.run_id, OLD.run_id);
  IF _status IN ('approved','paid') THEN
    RAISE EXCEPTION 'Payroll items are immutable after approval';
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;
CREATE TRIGGER pb_payroll_items_immut BEFORE UPDATE OR DELETE ON public.pb_payroll_items
  FOR EACH ROW EXECUTE FUNCTION public.pb_protect_approved_payroll_items();

-- 6) Payroll exceptions
CREATE TABLE public.pb_payroll_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.pb_payroll_runs(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.pb_payroll_items(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL,
  category TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('info','warning','error','critical')),
  message TEXT NOT NULL,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.pb_payroll_exceptions (run_id, severity);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pb_payroll_exceptions TO authenticated;
GRANT ALL ON public.pb_payroll_exceptions TO service_role;
ALTER TABLE public.pb_payroll_exceptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pb_payroll_exc_read" ON public.pb_payroll_exceptions FOR SELECT TO authenticated
  USING (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid()));
CREATE POLICY "pb_payroll_exc_write" ON public.pb_payroll_exceptions FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'agency_admin'::app_role) OR private.has_role(auth.uid(),'payroll'::app_role) OR private.has_role(auth.uid(),'super_admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(),'agency_admin'::app_role) OR private.has_role(auth.uid(),'payroll'::app_role) OR private.has_role(auth.uid(),'super_admin'::app_role));
CREATE TRIGGER pb_payroll_exc_upd BEFORE UPDATE ON public.pb_payroll_exceptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7) Invoices
CREATE TABLE public.pb_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL,
  client_id UUID NOT NULL,
  number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review','approved','sent','paid','overdue','void')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax NUMERIC(14,2) NOT NULL DEFAULT 0,
  credits NUMERIC(14,2) NOT NULL DEFAULT 0,
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  source_batch_id UUID,
  sent_at TIMESTAMPTZ,
  due_at DATE,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (agency_id, number)
);
CREATE INDEX ON public.pb_invoices (agency_id, client_id, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pb_invoices TO authenticated;
GRANT ALL ON public.pb_invoices TO service_role;
ALTER TABLE public.pb_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pb_invoices_read" ON public.pb_invoices FOR SELECT TO authenticated
  USING (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid()));
CREATE POLICY "pb_invoices_write" ON public.pb_invoices FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'agency_admin'::app_role) OR private.has_role(auth.uid(),'payroll'::app_role) OR private.has_role(auth.uid(),'super_admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(),'agency_admin'::app_role) OR private.has_role(auth.uid(),'payroll'::app_role) OR private.has_role(auth.uid(),'super_admin'::app_role));
CREATE TRIGGER pb_invoices_upd BEFORE UPDATE ON public.pb_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8) Invoice items
CREATE TABLE public.pb_invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.pb_invoices(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL,
  ticket_id UUID,
  worker_id UUID,
  description TEXT NOT NULL,
  hours NUMERIC(10,2) NOT NULL DEFAULT 0,
  bill_rate NUMERIC(12,4) NOT NULL DEFAULT 0,
  markup NUMERIC(12,2) NOT NULL DEFAULT 0,
  travel NUMERIC(12,2) NOT NULL DEFAULT 0,
  expenses NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.pb_invoice_items (invoice_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pb_invoice_items TO authenticated;
GRANT ALL ON public.pb_invoice_items TO service_role;
ALTER TABLE public.pb_invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pb_invoice_items_read" ON public.pb_invoice_items FOR SELECT TO authenticated
  USING (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid()));
CREATE POLICY "pb_invoice_items_write" ON public.pb_invoice_items FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'agency_admin'::app_role) OR private.has_role(auth.uid(),'payroll'::app_role) OR private.has_role(auth.uid(),'super_admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(),'agency_admin'::app_role) OR private.has_role(auth.uid(),'payroll'::app_role) OR private.has_role(auth.uid(),'super_admin'::app_role));
CREATE TRIGGER pb_invoice_items_upd BEFORE UPDATE ON public.pb_invoice_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Protect sent/paid invoice items
CREATE OR REPLACE FUNCTION public.pb_protect_sent_invoice_items() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _status TEXT;
BEGIN
  IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN RETURN COALESCE(NEW, OLD); END IF;
  SELECT status INTO _status FROM public.pb_invoices WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
  IF _status IN ('sent','paid','void') THEN
    RAISE EXCEPTION 'Invoice items are immutable after send';
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;
CREATE TRIGGER pb_invoice_items_immut BEFORE UPDATE OR DELETE ON public.pb_invoice_items
  FOR EACH ROW EXECUTE FUNCTION public.pb_protect_sent_invoice_items();

-- 9) Invoice payments
CREATE TABLE public.pb_invoice_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.pb_invoices(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('ach','check','wire','stripe','plaid','manual','other')),
  reference TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  provider_event_id TEXT,
  recorded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pb_invoice_payments TO authenticated;
GRANT ALL ON public.pb_invoice_payments TO service_role;
ALTER TABLE public.pb_invoice_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pb_inv_pay_read" ON public.pb_invoice_payments FOR SELECT TO authenticated
  USING (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid()));
CREATE POLICY "pb_inv_pay_write" ON public.pb_invoice_payments FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'agency_admin'::app_role) OR private.has_role(auth.uid(),'payroll'::app_role) OR private.has_role(auth.uid(),'super_admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(),'agency_admin'::app_role) OR private.has_role(auth.uid(),'payroll'::app_role) OR private.has_role(auth.uid(),'super_admin'::app_role));
CREATE TRIGGER pb_inv_pay_upd BEFORE UPDATE ON public.pb_invoice_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 10) Commission records
CREATE TABLE public.pb_commission_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL,
  recruiter_id UUID NOT NULL,
  rule_id UUID REFERENCES public.pb_commission_rules(id) ON DELETE SET NULL,
  placement_id UUID,
  worker_id UUID,
  invoice_id UUID REFERENCES public.pb_invoices(id) ON DELETE SET NULL,
  basis_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  rate NUMERIC(8,4) NOT NULL DEFAULT 0,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','paid','void')),
  paid_at TIMESTAMPTZ,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.pb_commission_records (agency_id, recruiter_id, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pb_commission_records TO authenticated;
GRANT ALL ON public.pb_commission_records TO service_role;
ALTER TABLE public.pb_commission_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pb_comm_rec_read" ON public.pb_commission_records FOR SELECT TO authenticated
  USING (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid()));
CREATE POLICY "pb_comm_rec_write" ON public.pb_commission_records FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'agency_admin'::app_role) OR private.has_role(auth.uid(),'payroll'::app_role) OR private.has_role(auth.uid(),'super_admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(),'agency_admin'::app_role) OR private.has_role(auth.uid(),'payroll'::app_role) OR private.has_role(auth.uid(),'super_admin'::app_role));
CREATE TRIGGER pb_comm_rec_upd BEFORE UPDATE ON public.pb_commission_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 11) Financial forecasts
CREATE TABLE public.pb_financial_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL,
  horizon_start DATE NOT NULL,
  horizon_end DATE NOT NULL,
  metric TEXT NOT NULL CHECK (metric IN ('payroll_cost','revenue','cash_flow','ar','profit')),
  value_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.pb_financial_forecasts (agency_id, metric, generated_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pb_financial_forecasts TO authenticated;
GRANT ALL ON public.pb_financial_forecasts TO service_role;
ALTER TABLE public.pb_financial_forecasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pb_forecast_read" ON public.pb_financial_forecasts FOR SELECT TO authenticated
  USING (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid()));
CREATE POLICY "pb_forecast_write" ON public.pb_financial_forecasts FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'agency_admin'::app_role) OR private.has_role(auth.uid(),'super_admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(),'agency_admin'::app_role) OR private.has_role(auth.uid(),'super_admin'::app_role));
CREATE TRIGGER pb_forecast_upd BEFORE UPDATE ON public.pb_financial_forecasts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 12) Margin analysis
CREATE TABLE public.pb_margin_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('client','worker','assignment','branch','agency')),
  scope_id UUID,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  revenue NUMERIC(14,2) NOT NULL DEFAULT 0,
  cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  gross_margin NUMERIC(14,2) NOT NULL DEFAULT 0,
  net_margin NUMERIC(14,2) NOT NULL DEFAULT 0,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.pb_margin_analysis (agency_id, scope, scope_id, period_end DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pb_margin_analysis TO authenticated;
GRANT ALL ON public.pb_margin_analysis TO service_role;
ALTER TABLE public.pb_margin_analysis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pb_margin_read" ON public.pb_margin_analysis FOR SELECT TO authenticated
  USING (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid()));
CREATE POLICY "pb_margin_write" ON public.pb_margin_analysis FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'agency_admin'::app_role) OR private.has_role(auth.uid(),'super_admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(),'agency_admin'::app_role) OR private.has_role(auth.uid(),'super_admin'::app_role));
CREATE TRIGGER pb_margin_upd BEFORE UPDATE ON public.pb_margin_analysis
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();