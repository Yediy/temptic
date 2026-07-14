
-- pay_profiles
CREATE TABLE IF NOT EXISTS public.pay_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  name text NOT NULL,
  base_rate numeric(10,2),
  ot_multiplier numeric(4,2) NOT NULL DEFAULT 1.5,
  dt_multiplier numeric(4,2) NOT NULL DEFAULT 2.0,
  weekly_ot_threshold numeric(6,2) NOT NULL DEFAULT 40,
  daily_ot_threshold numeric(6,2),
  burden_percent numeric(6,3) NOT NULL DEFAULT 0,
  differential_rules jsonb NOT NULL DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pay_profiles TO authenticated;
GRANT ALL ON public.pay_profiles TO service_role;
ALTER TABLE public.pay_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pay_profiles read" ON public.pay_profiles FOR SELECT TO authenticated
  USING (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid()));
CREATE POLICY "pay_profiles write" ON public.pay_profiles FOR ALL TO authenticated
  USING (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid())
         AND private.has_role(auth.uid(), 'agency_admin'::app_role))
  WITH CHECK (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid())
              AND private.has_role(auth.uid(), 'agency_admin'::app_role));
CREATE TRIGGER pay_profiles_updated_at BEFORE UPDATE ON public.pay_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- bill_profiles
CREATE TABLE IF NOT EXISTS public.bill_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  markup_percent numeric(6,3) NOT NULL DEFAULT 0,
  flat_bill_rate numeric(10,2),
  ot_bill_multiplier numeric(4,2) NOT NULL DEFAULT 1.5,
  dt_bill_multiplier numeric(4,2) NOT NULL DEFAULT 2.0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bill_profiles TO authenticated;
GRANT ALL ON public.bill_profiles TO service_role;
ALTER TABLE public.bill_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bill_profiles read" ON public.bill_profiles FOR SELECT TO authenticated
  USING (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid()));
CREATE POLICY "bill_profiles write" ON public.bill_profiles FOR ALL TO authenticated
  USING (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid())
         AND private.has_role(auth.uid(), 'agency_admin'::app_role))
  WITH CHECK (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid())
              AND private.has_role(auth.uid(), 'agency_admin'::app_role));
CREATE TRIGGER bill_profiles_updated_at BEFORE UPDATE ON public.bill_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- saved_reports
CREATE TABLE IF NOT EXISTS public.saved_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  module text NOT NULL,
  query_spec jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_shared boolean NOT NULL DEFAULT false,
  last_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_reports TO authenticated;
GRANT ALL ON public.saved_reports TO service_role;
ALTER TABLE public.saved_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "saved_reports read" ON public.saved_reports FOR SELECT TO authenticated
  USING (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid())
         AND (is_shared OR created_by = auth.uid()));
CREATE POLICY "saved_reports write" ON public.saved_reports FOR ALL TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid()
              AND agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid()));
CREATE TRIGGER saved_reports_updated_at BEFORE UPDATE ON public.saved_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- network_partnerships
CREATE TABLE IF NOT EXISTS public.network_partnerships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requesting_agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  partner_agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','declined','revoked')),
  shared_talent boolean NOT NULL DEFAULT false,
  shared_job_orders boolean NOT NULL DEFAULT false,
  notes text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  activated_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (requesting_agency_id, partner_agency_id),
  CHECK (requesting_agency_id <> partner_agency_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.network_partnerships TO authenticated;
GRANT ALL ON public.network_partnerships TO service_role;
ALTER TABLE public.network_partnerships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "network read" ON public.network_partnerships FOR SELECT TO authenticated
  USING (
    requesting_agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid())
    OR partner_agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid())
  );
CREATE POLICY "network insert own" ON public.network_partnerships FOR INSERT TO authenticated
  WITH CHECK (
    requesting_agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid())
    AND private.has_role(auth.uid(), 'agency_admin'::app_role)
  );
CREATE POLICY "network update either side" ON public.network_partnerships FOR UPDATE TO authenticated
  USING (
    (requesting_agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid())
     OR partner_agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid()))
    AND private.has_role(auth.uid(), 'agency_admin'::app_role)
  );
CREATE TRIGGER network_partnerships_updated_at BEFORE UPDATE ON public.network_partnerships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ai_runs
CREATE TABLE IF NOT EXISTS public.ai_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  kind text NOT NULL,
  input_ref text,
  input_summary text,
  output_summary text,
  model text,
  tokens_input integer,
  tokens_output integer,
  status text NOT NULL DEFAULT 'succeeded' CHECK (status IN ('succeeded','failed','partial')),
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ai_runs TO authenticated;
GRANT ALL ON public.ai_runs TO service_role;
ALTER TABLE public.ai_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_runs read" ON public.ai_runs FOR SELECT TO authenticated
  USING (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS ai_runs_agency_created_idx ON public.ai_runs (agency_id, created_at DESC);
CREATE INDEX IF NOT EXISTS pay_profiles_agency_idx ON public.pay_profiles (agency_id);
CREATE INDEX IF NOT EXISTS bill_profiles_agency_idx ON public.bill_profiles (agency_id);
CREATE INDEX IF NOT EXISTS saved_reports_agency_idx ON public.saved_reports (agency_id);
CREATE INDEX IF NOT EXISTS network_partnerships_req_idx ON public.network_partnerships (requesting_agency_id);
CREATE INDEX IF NOT EXISTS network_partnerships_part_idx ON public.network_partnerships (partner_agency_id);
