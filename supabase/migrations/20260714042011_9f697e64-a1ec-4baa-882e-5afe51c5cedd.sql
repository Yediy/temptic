DO $$ BEGIN CREATE TYPE public.job_order_status AS ENUM ('draft','open','on_hold','filled','cancelled','closed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.application_status AS ENUM ('new','screening','submitted','interview','offer','placed','rejected','withdrawn'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.decision_type AS ENUM ('advance','reject','hold','submit_to_client','client_accept','client_reject','offer_extend','offer_accept','offer_decline','placement'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.screening_status AS ENUM ('pending','invited','in_progress','completed','cancelled','error'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.adverse_action_stage AS ENUM ('pre_adverse_sent','waiting_period','final_adverse_sent','withdrawn'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.job_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  site_id uuid REFERENCES public.client_sites(id) ON DELETE SET NULL,
  title text NOT NULL, description text,
  status public.job_order_status NOT NULL DEFAULT 'draft',
  positions_needed int NOT NULL DEFAULT 1, positions_filled int NOT NULL DEFAULT 0,
  pay_rate numeric, bill_rate numeric, starts_on date, ends_on date,
  location text, industry text, created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_orders TO authenticated;
GRANT ALL ON public.job_orders TO service_role;
ALTER TABLE public.job_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agency members manage job orders" ON public.job_orders FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agency_members am WHERE am.agency_id = job_orders.agency_id AND am.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.agency_members am WHERE am.agency_id = job_orders.agency_id AND am.user_id = auth.uid()));
CREATE TRIGGER trg_job_orders_updated BEFORE UPDATE ON public.job_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.job_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_order_id uuid NOT NULL REFERENCES public.job_orders(id) ON DELETE CASCADE,
  kind text NOT NULL, label text NOT NULL, is_required boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_requirements TO authenticated;
GRANT ALL ON public.job_requirements TO service_role;
ALTER TABLE public.job_requirements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agency members manage job requirements" ON public.job_requirements FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.job_orders jo JOIN public.agency_members am ON am.agency_id = jo.agency_id WHERE jo.id = job_requirements.job_order_id AND am.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.job_orders jo JOIN public.agency_members am ON am.agency_id = jo.agency_id WHERE jo.id = job_requirements.job_order_id AND am.user_id = auth.uid()));

CREATE TABLE public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  job_order_id uuid NOT NULL REFERENCES public.job_orders(id) ON DELETE CASCADE,
  worker_id uuid NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  status public.application_status NOT NULL DEFAULT 'new', source text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_order_id, worker_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.applications TO authenticated;
GRANT ALL ON public.applications TO service_role;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agency members manage applications" ON public.applications FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agency_members am WHERE am.agency_id = applications.agency_id AND am.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.agency_members am WHERE am.agency_id = applications.agency_id AND am.user_id = auth.uid()));
CREATE TRIGGER trg_applications_updated BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.candidate_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  submitted_by uuid, submitted_at timestamptz NOT NULL DEFAULT now(),
  submitted_pay_rate numeric, submitted_bill_rate numeric, notes text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidate_submissions TO authenticated;
GRANT ALL ON public.candidate_submissions TO service_role;
ALTER TABLE public.candidate_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agency members manage submissions" ON public.candidate_submissions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.applications a JOIN public.agency_members am ON am.agency_id = a.agency_id WHERE a.id = candidate_submissions.application_id AND am.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.applications a JOIN public.agency_members am ON am.agency_id = a.agency_id WHERE a.id = candidate_submissions.application_id AND am.user_id = auth.uid()));

CREATE TABLE public.interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  scheduled_at timestamptz, duration_minutes int, mode text, location text, outcome text, notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interviews TO authenticated;
GRANT ALL ON public.interviews TO service_role;
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agency members manage interviews" ON public.interviews FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.applications a JOIN public.agency_members am ON am.agency_id = a.agency_id WHERE a.id = interviews.application_id AND am.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.applications a JOIN public.agency_members am ON am.agency_id = a.agency_id WHERE a.id = interviews.application_id AND am.user_id = auth.uid()));

CREATE TABLE public.offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  offered_at timestamptz NOT NULL DEFAULT now(),
  pay_rate numeric, bill_rate numeric, start_date date,
  status text NOT NULL DEFAULT 'extended', responded_at timestamptz, notes text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.offers TO authenticated;
GRANT ALL ON public.offers TO service_role;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agency members manage offers" ON public.offers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.applications a JOIN public.agency_members am ON am.agency_id = a.agency_id WHERE a.id = offers.application_id AND am.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.applications a JOIN public.agency_members am ON am.agency_id = a.agency_id WHERE a.id = offers.application_id AND am.user_id = auth.uid()));

CREATE TABLE public.placements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  worker_id uuid NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  job_order_id uuid NOT NULL REFERENCES public.job_orders(id) ON DELETE CASCADE,
  starts_on date NOT NULL, ends_on date, pay_rate numeric, bill_rate numeric,
  status text NOT NULL DEFAULT 'active', created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.placements TO authenticated;
GRANT ALL ON public.placements TO service_role;
ALTER TABLE public.placements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agency members manage placements" ON public.placements FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agency_members am WHERE am.agency_id = placements.agency_id AND am.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.agency_members am WHERE am.agency_id = placements.agency_id AND am.user_id = auth.uid()));

CREATE TABLE public.assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  placement_id uuid REFERENCES public.placements(id) ON DELETE SET NULL,
  worker_id uuid NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  site_id uuid REFERENCES public.client_sites(id) ON DELETE SET NULL,
  ticket_id uuid REFERENCES public.tickets(id) ON DELETE SET NULL,
  starts_on date NOT NULL, ends_on date,
  status text NOT NULL DEFAULT 'active', created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assignments TO authenticated;
GRANT ALL ON public.assignments TO service_role;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agency members manage assignments" ON public.assignments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agency_members am WHERE am.agency_id = assignments.agency_id AND am.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.agency_members am WHERE am.agency_id = assignments.agency_id AND am.user_id = auth.uid()));

CREATE TABLE public.shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  assignment_id uuid REFERENCES public.assignments(id) ON DELETE SET NULL,
  worker_id uuid REFERENCES public.workers(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  site_id uuid REFERENCES public.client_sites(id) ON DELETE SET NULL,
  ticket_id uuid REFERENCES public.tickets(id) ON DELETE SET NULL,
  shift_date date NOT NULL, start_time time, end_time time,
  status text NOT NULL DEFAULT 'scheduled', created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shifts TO authenticated;
GRANT ALL ON public.shifts TO service_role;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agency members manage shifts" ON public.shifts FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agency_members am WHERE am.agency_id = shifts.agency_id AND am.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.agency_members am WHERE am.agency_id = shifts.agency_id AND am.user_id = auth.uid()));

CREATE TABLE public.candidate_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  decision public.decision_type NOT NULL,
  reason_code text, notes text,
  ai_viewed boolean NOT NULL DEFAULT false, ai_followed boolean NOT NULL DEFAULT false, ai_rationale text,
  decided_by uuid, decided_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.candidate_decisions TO authenticated;
GRANT ALL ON public.candidate_decisions TO service_role;
ALTER TABLE public.candidate_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agency members read decisions" ON public.candidate_decisions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.applications a JOIN public.agency_members am ON am.agency_id = a.agency_id WHERE a.id = candidate_decisions.application_id AND am.user_id = auth.uid()));
CREATE POLICY "agency members insert decisions" ON public.candidate_decisions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.applications a JOIN public.agency_members am ON am.agency_id = a.agency_id WHERE a.id = candidate_decisions.application_id AND am.user_id = auth.uid()) AND decided_by = auth.uid());

CREATE TABLE public.screening_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  name text NOT NULL, adapter_key text NOT NULL DEFAULT 'mock',
  config jsonb NOT NULL DEFAULT '{}'::jsonb, is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.screening_providers TO authenticated;
GRANT ALL ON public.screening_providers TO service_role;
ALTER TABLE public.screening_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agency members manage screening providers" ON public.screening_providers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agency_members am WHERE am.agency_id = screening_providers.agency_id AND am.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.agency_members am WHERE am.agency_id = screening_providers.agency_id AND am.user_id = auth.uid()));

CREATE TABLE public.screening_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.screening_providers(id) ON DELETE CASCADE,
  name text NOT NULL, external_key text, price_cents int, includes text[],
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.screening_packages TO authenticated;
GRANT ALL ON public.screening_packages TO service_role;
ALTER TABLE public.screening_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agency members manage packages" ON public.screening_packages FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.screening_providers p JOIN public.agency_members am ON am.agency_id = p.agency_id WHERE p.id = screening_packages.provider_id AND am.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.screening_providers p JOIN public.agency_members am ON am.agency_id = p.agency_id WHERE p.id = screening_packages.provider_id AND am.user_id = auth.uid()));

CREATE TABLE public.screening_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  worker_id uuid NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  application_id uuid REFERENCES public.applications(id) ON DELETE SET NULL,
  provider_id uuid REFERENCES public.screening_providers(id) ON DELETE SET NULL,
  package_id uuid REFERENCES public.screening_packages(id) ON DELETE SET NULL,
  provider text NOT NULL DEFAULT 'mock', external_id text,
  status public.screening_status NOT NULL DEFAULT 'pending',
  ordered_by uuid, ordered_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.screening_orders TO authenticated;
GRANT ALL ON public.screening_orders TO service_role;
ALTER TABLE public.screening_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agency members manage screening orders" ON public.screening_orders FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agency_members am WHERE am.agency_id = screening_orders.agency_id AND am.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.agency_members am WHERE am.agency_id = screening_orders.agency_id AND am.user_id = auth.uid()));

CREATE TABLE public.screening_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.screening_orders(id) ON DELETE SET NULL,
  consent_type text NOT NULL, signed_at timestamptz,
  ip_address inet, user_agent text, document_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.screening_consents TO authenticated;
GRANT ALL ON public.screening_consents TO service_role;
ALTER TABLE public.screening_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agency read consents via order" ON public.screening_consents FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.screening_orders o JOIN public.agency_members am ON am.agency_id = o.agency_id WHERE o.id = screening_consents.order_id AND am.user_id = auth.uid()));

CREATE TABLE public.screening_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.screening_orders(id) ON DELETE CASCADE,
  received_at timestamptz NOT NULL DEFAULT now(),
  result text, summary jsonb NOT NULL DEFAULT '{}'::jsonb, document_url text
);
GRANT SELECT ON public.screening_reports TO authenticated;
GRANT ALL ON public.screening_reports TO service_role;
ALTER TABLE public.screening_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agency read reports via order" ON public.screening_reports FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.screening_orders o JOIN public.agency_members am ON am.agency_id = o.agency_id WHERE o.id = screening_reports.order_id AND am.user_id = auth.uid()));

CREATE TABLE public.screening_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL, external_id text, event_type text,
  payload jsonb NOT NULL, signature_valid boolean,
  received_at timestamptz NOT NULL DEFAULT now(), processed_at timestamptz
);
GRANT ALL ON public.screening_webhook_events TO service_role;
ALTER TABLE public.screening_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.adverse_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  worker_id uuid NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.screening_orders(id) ON DELETE SET NULL,
  stage public.adverse_action_stage NOT NULL, reason text,
  pre_adverse_sent_at timestamptz, final_adverse_sent_at timestamptz,
  created_by uuid, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.adverse_actions TO authenticated;
GRANT ALL ON public.adverse_actions TO service_role;
ALTER TABLE public.adverse_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agency members manage adverse actions" ON public.adverse_actions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agency_members am WHERE am.agency_id = adverse_actions.agency_id AND am.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.agency_members am WHERE am.agency_id = adverse_actions.agency_id AND am.user_id = auth.uid()));

CREATE OR REPLACE VIEW public.blind_candidate_view
WITH (security_invoker = true) AS
SELECT
  w.id AS worker_id, w.agency_id,
  wp.years_experience, wp.general_location, wp.travel_radius_miles,
  wp.trade_specialties, wp.preferred_industries, wp.preferred_job_types, wp.shift_preferences,
  wp.desired_pay_min, wp.desired_pay_max, wp.completion_score,
  (SELECT array_agg(ws.skill_id) FROM public.worker_skills ws WHERE ws.worker_id = w.id) AS skill_ids,
  (SELECT count(*)::int FROM public.worker_credentials wc WHERE wc.worker_id = w.id AND wc.status = 'verified') AS verified_credential_count,
  (SELECT count(*)::int FROM public.training_certificates tc WHERE tc.worker_id = w.id) AS certificate_count
FROM public.workers w
LEFT JOIN public.worker_profiles wp ON wp.worker_id = w.id;
GRANT SELECT ON public.blind_candidate_view TO authenticated;

CREATE INDEX IF NOT EXISTS idx_job_orders_agency ON public.job_orders(agency_id);
CREATE INDEX IF NOT EXISTS idx_applications_job ON public.applications(job_order_id);
CREATE INDEX IF NOT EXISTS idx_applications_worker ON public.applications(worker_id);
CREATE INDEX IF NOT EXISTS idx_shifts_agency_date ON public.shifts(agency_id, shift_date);
CREATE INDEX IF NOT EXISTS idx_screening_orders_worker ON public.screening_orders(worker_id);
CREATE INDEX IF NOT EXISTS idx_adverse_worker ON public.adverse_actions(worker_id);
