
-- Recruit OS additive schema (Build 4.0)

-- 1. Candidate scores
CREATE TABLE public.recruit_candidate_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  worker_id uuid NOT NULL,
  reliability_score numeric(5,2) DEFAULT 0,
  reputation_score numeric(5,2) DEFAULT 0,
  performance_score numeric(5,2) DEFAULT 0,
  factors jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_computed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agency_id, worker_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recruit_candidate_scores TO authenticated;
GRANT ALL ON public.recruit_candidate_scores TO service_role;
ALTER TABLE public.recruit_candidate_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recruit_scores_agency_read" ON public.recruit_candidate_scores FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agency_members am WHERE am.agency_id = recruit_candidate_scores.agency_id AND am.user_id = auth.uid()));
CREATE POLICY "recruit_scores_agency_write" ON public.recruit_candidate_scores FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agency_members am WHERE am.agency_id = recruit_candidate_scores.agency_id AND am.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.agency_members am WHERE am.agency_id = recruit_candidate_scores.agency_id AND am.user_id = auth.uid()));
CREATE TRIGGER trg_recruit_scores_updated BEFORE UPDATE ON public.recruit_candidate_scores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Talent preferences
CREATE TABLE public.recruit_talent_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  worker_id uuid NOT NULL,
  preferred_roles text[] NOT NULL DEFAULT '{}',
  preferred_locations text[] NOT NULL DEFAULT '{}',
  min_pay_rate numeric(10,2),
  max_travel_miles integer,
  availability jsonb NOT NULL DEFAULT '{}'::jsonb,
  remote_ok boolean NOT NULL DEFAULT false,
  marketplace_opt_in boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agency_id, worker_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recruit_talent_preferences TO authenticated;
GRANT ALL ON public.recruit_talent_preferences TO service_role;
ALTER TABLE public.recruit_talent_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recruit_prefs_agency" ON public.recruit_talent_preferences FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agency_members am WHERE am.agency_id = recruit_talent_preferences.agency_id AND am.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.agency_members am WHERE am.agency_id = recruit_talent_preferences.agency_id AND am.user_id = auth.uid()));
CREATE TRIGGER trg_recruit_prefs_updated BEFORE UPDATE ON public.recruit_talent_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Marketplace opportunities
CREATE TABLE public.recruit_marketplace_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  job_order_id uuid,
  kind text NOT NULL CHECK (kind IN ('job','training','certification','advancement')),
  visibility text NOT NULL DEFAULT 'invited' CHECK (visibility IN ('public','invited','network')),
  title text NOT NULL,
  description text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  published_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recruit_marketplace_opportunities TO authenticated;
GRANT ALL ON public.recruit_marketplace_opportunities TO service_role;
ALTER TABLE public.recruit_marketplace_opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recruit_mkt_agency" ON public.recruit_marketplace_opportunities FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agency_members am WHERE am.agency_id = recruit_marketplace_opportunities.agency_id AND am.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.agency_members am WHERE am.agency_id = recruit_marketplace_opportunities.agency_id AND am.user_id = auth.uid()));
CREATE POLICY "recruit_mkt_worker_visible" ON public.recruit_marketplace_opportunities FOR SELECT TO authenticated
  USING (
    visibility IN ('public','network')
    AND published_at IS NOT NULL
    AND (expires_at IS NULL OR expires_at > now())
    AND EXISTS (SELECT 1 FROM public.workers w WHERE w.user_id = auth.uid() AND w.agency_id = recruit_marketplace_opportunities.agency_id)
  );
CREATE TRIGGER trg_recruit_mkt_updated BEFORE UPDATE ON public.recruit_marketplace_opportunities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Marketplace interest
CREATE TABLE public.recruit_marketplace_interest (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES public.recruit_marketplace_opportunities(id) ON DELETE CASCADE,
  worker_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'saved' CHECK (status IN ('saved','interested','applied','dismissed')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (opportunity_id, worker_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recruit_marketplace_interest TO authenticated;
GRANT ALL ON public.recruit_marketplace_interest TO service_role;
ALTER TABLE public.recruit_marketplace_interest ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recruit_interest_worker_self" ON public.recruit_marketplace_interest FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workers w WHERE w.id = recruit_marketplace_interest.worker_id AND w.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workers w WHERE w.id = recruit_marketplace_interest.worker_id AND w.user_id = auth.uid()));
CREATE POLICY "recruit_interest_agency_read" ON public.recruit_marketplace_interest FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.recruit_marketplace_opportunities o
    JOIN public.agency_members am ON am.agency_id = o.agency_id
    WHERE o.id = recruit_marketplace_interest.opportunity_id AND am.user_id = auth.uid()
  ));
CREATE TRIGGER trg_recruit_interest_updated BEFORE UPDATE ON public.recruit_marketplace_interest FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Pipelines
CREATE TABLE public.recruit_pipelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  name text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  job_order_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recruit_pipelines TO authenticated;
GRANT ALL ON public.recruit_pipelines TO service_role;
ALTER TABLE public.recruit_pipelines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recruit_pipelines_agency" ON public.recruit_pipelines FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agency_members am WHERE am.agency_id = recruit_pipelines.agency_id AND am.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.agency_members am WHERE am.agency_id = recruit_pipelines.agency_id AND am.user_id = auth.uid()));
CREATE TRIGGER trg_recruit_pipelines_updated BEFORE UPDATE ON public.recruit_pipelines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Pipeline stages
CREATE TABLE public.recruit_pipeline_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id uuid NOT NULL REFERENCES public.recruit_pipelines(id) ON DELETE CASCADE,
  key text NOT NULL,
  label text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  stage_type text NOT NULL DEFAULT 'sourcing' CHECK (stage_type IN ('sourcing','screening','interview','submission','offer','onboarding','active','closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pipeline_id, key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recruit_pipeline_stages TO authenticated;
GRANT ALL ON public.recruit_pipeline_stages TO service_role;
ALTER TABLE public.recruit_pipeline_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recruit_stages_agency" ON public.recruit_pipeline_stages FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.recruit_pipelines p JOIN public.agency_members am ON am.agency_id = p.agency_id
    WHERE p.id = recruit_pipeline_stages.pipeline_id AND am.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.recruit_pipelines p JOIN public.agency_members am ON am.agency_id = p.agency_id
    WHERE p.id = recruit_pipeline_stages.pipeline_id AND am.user_id = auth.uid()
  ));
CREATE TRIGGER trg_recruit_stages_updated BEFORE UPDATE ON public.recruit_pipeline_stages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Pipeline entries
CREATE TABLE public.recruit_pipeline_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  pipeline_id uuid NOT NULL REFERENCES public.recruit_pipelines(id) ON DELETE CASCADE,
  stage_id uuid NOT NULL REFERENCES public.recruit_pipeline_stages(id) ON DELETE RESTRICT,
  worker_id uuid NOT NULL,
  job_order_id uuid,
  submission_id uuid,
  assignment_id uuid,
  notes text,
  entered_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recruit_pipeline_entries TO authenticated;
GRANT ALL ON public.recruit_pipeline_entries TO service_role;
ALTER TABLE public.recruit_pipeline_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recruit_entries_agency" ON public.recruit_pipeline_entries FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agency_members am WHERE am.agency_id = recruit_pipeline_entries.agency_id AND am.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.agency_members am WHERE am.agency_id = recruit_pipeline_entries.agency_id AND am.user_id = auth.uid()));
CREATE TRIGGER trg_recruit_entries_updated BEFORE UPDATE ON public.recruit_pipeline_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Recruiter activity
CREATE TABLE public.recruit_recruiter_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  recruiter_id uuid NOT NULL,
  verb text NOT NULL CHECK (verb IN ('call','email','note','submit','interview','placement','message')),
  subject_entity text NOT NULL,
  subject_id uuid NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recruit_recruiter_activity TO authenticated;
GRANT ALL ON public.recruit_recruiter_activity TO service_role;
ALTER TABLE public.recruit_recruiter_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recruit_activity_agency" ON public.recruit_recruiter_activity FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agency_members am WHERE am.agency_id = recruit_recruiter_activity.agency_id AND am.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.agency_members am WHERE am.agency_id = recruit_recruiter_activity.agency_id AND am.user_id = auth.uid()));

-- 9. Client contacts (complements client_signers with CRM-style contacts)
CREATE TABLE public.recruit_client_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  client_id uuid NOT NULL,
  name text NOT NULL,
  title text,
  email text,
  phone text,
  is_primary boolean NOT NULL DEFAULT false,
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recruit_client_contacts TO authenticated;
GRANT ALL ON public.recruit_client_contacts TO service_role;
ALTER TABLE public.recruit_client_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recruit_contacts_agency" ON public.recruit_client_contacts FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agency_members am WHERE am.agency_id = recruit_client_contacts.agency_id AND am.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.agency_members am WHERE am.agency_id = recruit_client_contacts.agency_id AND am.user_id = auth.uid()));
CREATE TRIGGER trg_recruit_contacts_updated BEFORE UPDATE ON public.recruit_client_contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_recruit_scores_agency_worker ON public.recruit_candidate_scores(agency_id, worker_id);
CREATE INDEX idx_recruit_prefs_agency_worker ON public.recruit_talent_preferences(agency_id, worker_id);
CREATE INDEX idx_recruit_mkt_agency_pub ON public.recruit_marketplace_opportunities(agency_id, published_at DESC);
CREATE INDEX idx_recruit_interest_worker ON public.recruit_marketplace_interest(worker_id);
CREATE INDEX idx_recruit_entries_pipeline_stage ON public.recruit_pipeline_entries(pipeline_id, stage_id);
CREATE INDEX idx_recruit_entries_worker ON public.recruit_pipeline_entries(worker_id);
CREATE INDEX idx_recruit_activity_agency_created ON public.recruit_recruiter_activity(agency_id, created_at DESC);
CREATE INDEX idx_recruit_contacts_client ON public.recruit_client_contacts(client_id);
