
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.woic_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid NULL,
  display_name text NOT NULL DEFAULT '',
  primary_email text NULL,
  primary_phone text NULL,
  skills jsonb NOT NULL DEFAULT '[]'::jsonb,
  certifications jsonb NOT NULL DEFAULT '[]'::jsonb,
  licenses jsonb NOT NULL DEFAULT '[]'::jsonb,
  education jsonb NOT NULL DEFAULT '[]'::jsonb,
  employment_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  training_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  documents jsonb NOT NULL DEFAULT '[]'::jsonb,
  communication_prefs jsonb NOT NULL DEFAULT '{}'::jsonb,
  security_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  behavior_profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  knowledge_profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  reputation_score numeric NOT NULL DEFAULT 0,
  activity_score numeric NOT NULL DEFAULT 0,
  availability jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS woic_identities_auth_user_id_key
  ON public.woic_identities(auth_user_id) WHERE auth_user_id IS NOT NULL;
GRANT SELECT ON public.woic_identities TO authenticated;
GRANT ALL ON public.woic_identities TO service_role;
ALTER TABLE public.woic_identities ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.woic_identity_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_id uuid NOT NULL REFERENCES public.woic_identities(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL,
  kind text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (identity_id, agency_id, kind)
);
CREATE INDEX IF NOT EXISTS woic_idm_agency_idx ON public.woic_identity_memberships(agency_id);
GRANT SELECT ON public.woic_identity_memberships TO authenticated;
GRANT ALL ON public.woic_identity_memberships TO service_role;
ALTER TABLE public.woic_identity_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "identity readable via membership" ON public.woic_identities
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.woic_identity_memberships m
    WHERE m.identity_id = woic_identities.id
      AND m.agency_id IN (SELECT private.current_user_agency_ids())));
CREATE POLICY "membership readable in own agency" ON public.woic_identity_memberships
  FOR SELECT TO authenticated
  USING (agency_id IN (SELECT private.current_user_agency_ids()));

CREATE TABLE IF NOT EXISTS public.woic_knowledge_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  name text NOT NULL,
  slug text NOT NULL,
  parent_id uuid NULL REFERENCES public.woic_knowledge_categories(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agency_id, slug)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.woic_knowledge_categories TO authenticated;
GRANT ALL ON public.woic_knowledge_categories TO service_role;
ALTER TABLE public.woic_knowledge_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kcat readable" ON public.woic_knowledge_categories
  FOR SELECT TO authenticated USING (agency_id IN (SELECT private.current_user_agency_ids()));
CREATE POLICY "kcat writable admin" ON public.woic_knowledge_categories
  FOR ALL TO authenticated
  USING (agency_id IN (SELECT private.current_user_agency_ids()) AND private.has_role(auth.uid(), 'agency_admin'::public.app_role))
  WITH CHECK (agency_id IN (SELECT private.current_user_agency_ids()) AND private.has_role(auth.uid(), 'agency_admin'::public.app_role));

CREATE TABLE IF NOT EXISTS public.woic_knowledge_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  category_id uuid NULL REFERENCES public.woic_knowledge_categories(id) ON DELETE SET NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}',
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  version int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft',
  tsv tsvector,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS woic_karticles_tsv_idx ON public.woic_knowledge_articles USING gin(tsv);
CREATE INDEX IF NOT EXISTS woic_karticles_agency_idx ON public.woic_knowledge_articles(agency_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.woic_knowledge_articles TO authenticated;
GRANT ALL ON public.woic_knowledge_articles TO service_role;
ALTER TABLE public.woic_knowledge_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "karticle readable" ON public.woic_knowledge_articles
  FOR SELECT TO authenticated USING (agency_id IN (SELECT private.current_user_agency_ids()));
CREATE POLICY "karticle writable admin" ON public.woic_knowledge_articles
  FOR ALL TO authenticated
  USING (agency_id IN (SELECT private.current_user_agency_ids()) AND private.has_role(auth.uid(), 'agency_admin'::public.app_role))
  WITH CHECK (agency_id IN (SELECT private.current_user_agency_ids()) AND private.has_role(auth.uid(), 'agency_admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.woic_knowledge_tsv() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.tsv := setweight(to_tsvector('simple', coalesce(NEW.title,'')), 'A')
          || setweight(to_tsvector('simple', coalesce(NEW.body,'')), 'B')
          || setweight(to_tsvector('simple', coalesce(array_to_string(NEW.tags,' '),'')), 'B');
  NEW.updated_at := now();
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS woic_knowledge_articles_tsv ON public.woic_knowledge_articles;
CREATE TRIGGER woic_knowledge_articles_tsv BEFORE INSERT OR UPDATE ON public.woic_knowledge_articles
  FOR EACH ROW EXECUTE FUNCTION public.woic_knowledge_tsv();

CREATE TABLE IF NOT EXISTS public.woic_knowledge_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.woic_knowledge_articles(id) ON DELETE CASCADE,
  version int NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  tags text[] NOT NULL DEFAULT '{}',
  edited_by uuid NULL,
  edited_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.woic_knowledge_versions TO authenticated;
GRANT ALL ON public.woic_knowledge_versions TO service_role;
ALTER TABLE public.woic_knowledge_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kversion readable" ON public.woic_knowledge_versions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.woic_knowledge_articles a WHERE a.id=woic_knowledge_versions.article_id
    AND a.agency_id IN (SELECT private.current_user_agency_ids())));

CREATE TABLE IF NOT EXISTS public.woic_knowledge_vectors (
  article_id uuid PRIMARY KEY REFERENCES public.woic_knowledge_articles(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL,
  embedding vector(1536) NOT NULL,
  model text NOT NULL DEFAULT 'openai/text-embedding-3-small',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS woic_kvec_hnsw ON public.woic_knowledge_vectors USING hnsw (embedding vector_cosine_ops);
GRANT SELECT ON public.woic_knowledge_vectors TO authenticated;
GRANT ALL ON public.woic_knowledge_vectors TO service_role;
ALTER TABLE public.woic_knowledge_vectors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kvec readable" ON public.woic_knowledge_vectors
  FOR SELECT TO authenticated USING (agency_id IN (SELECT private.current_user_agency_ids()));

CREATE TABLE IF NOT EXISTS public.woic_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  kind text NOT NULL,
  subject_entity text NULL,
  subject_id uuid NULL,
  confidence numeric NOT NULL DEFAULT 0,
  reasoning text NOT NULL DEFAULT '',
  alternative_options jsonb NOT NULL DEFAULT '[]'::jsonb,
  risk text NOT NULL DEFAULT 'low',
  impact text NOT NULL DEFAULT 'low',
  outcome text NULL,
  approver_id uuid NULL,
  source jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS woic_decisions_agency_idx ON public.woic_decisions(agency_id, created_at DESC);
GRANT SELECT, INSERT ON public.woic_decisions TO authenticated;
GRANT ALL ON public.woic_decisions TO service_role;
ALTER TABLE public.woic_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dec readable" ON public.woic_decisions
  FOR SELECT TO authenticated USING (agency_id IN (SELECT private.current_user_agency_ids()));
CREATE POLICY "dec insertable" ON public.woic_decisions
  FOR INSERT TO authenticated WITH CHECK (agency_id IN (SELECT private.current_user_agency_ids()));

CREATE TABLE IF NOT EXISTS public.woic_decision_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id uuid NOT NULL REFERENCES public.woic_decisions(id) ON DELETE CASCADE,
  kind text NOT NULL,
  ref_entity text NULL,
  ref_id uuid NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.woic_decision_evidence TO authenticated;
GRANT ALL ON public.woic_decision_evidence TO service_role;
ALTER TABLE public.woic_decision_evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ev readable" ON public.woic_decision_evidence FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.woic_decisions d WHERE d.id=woic_decision_evidence.decision_id
    AND d.agency_id IN (SELECT private.current_user_agency_ids())));
CREATE POLICY "ev insertable" ON public.woic_decision_evidence FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.woic_decisions d WHERE d.id=woic_decision_evidence.decision_id
    AND d.agency_id IN (SELECT private.current_user_agency_ids())));

CREATE TABLE IF NOT EXISTS public.woic_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  kind text NOT NULL,
  subject_entity text NULL,
  subject_id uuid NULL,
  target_entity text NULL,
  target_id uuid NULL,
  score numeric NOT NULL DEFAULT 0,
  reasoning text NOT NULL DEFAULT '',
  why jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS woic_recs_agency_idx ON public.woic_recommendations(agency_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.woic_recommendations TO authenticated;
GRANT ALL ON public.woic_recommendations TO service_role;
ALTER TABLE public.woic_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rec readable" ON public.woic_recommendations
  FOR SELECT TO authenticated USING (agency_id IN (SELECT private.current_user_agency_ids()));
CREATE POLICY "rec writable" ON public.woic_recommendations
  FOR ALL TO authenticated
  USING (agency_id IN (SELECT private.current_user_agency_ids()))
  WITH CHECK (agency_id IN (SELECT private.current_user_agency_ids()));

CREATE TABLE IF NOT EXISTS public.woic_prediction_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NULL,
  name text NOT NULL,
  version text NOT NULL DEFAULT '1',
  feature_set jsonb NOT NULL DEFAULT '[]'::jsonb,
  endpoint text NULL,
  status text NOT NULL DEFAULT 'active',
  description text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name, version)
);
GRANT SELECT ON public.woic_prediction_models TO authenticated;
GRANT ALL ON public.woic_prediction_models TO service_role;
ALTER TABLE public.woic_prediction_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pm readable" ON public.woic_prediction_models
  FOR SELECT TO authenticated USING (agency_id IS NULL OR agency_id IN (SELECT private.current_user_agency_ids()));

CREATE TABLE IF NOT EXISTS public.woic_prediction_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  model_id uuid NOT NULL REFERENCES public.woic_prediction_models(id) ON DELETE CASCADE,
  subject_entity text NOT NULL,
  subject_id uuid NOT NULL,
  prediction jsonb NOT NULL,
  confidence numeric NOT NULL DEFAULT 0,
  features_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  produced_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS woic_pred_agency_idx ON public.woic_prediction_results(agency_id, produced_at DESC);
GRANT SELECT, INSERT ON public.woic_prediction_results TO authenticated;
GRANT ALL ON public.woic_prediction_results TO service_role;
ALTER TABLE public.woic_prediction_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pr readable" ON public.woic_prediction_results
  FOR SELECT TO authenticated USING (agency_id IN (SELECT private.current_user_agency_ids()));
CREATE POLICY "pr insertable" ON public.woic_prediction_results
  FOR INSERT TO authenticated WITH CHECK (agency_id IN (SELECT private.current_user_agency_ids()));

CREATE TABLE IF NOT EXISTS public.woic_compliance_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NULL,
  kind text NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  description text NULL,
  cadence text NOT NULL DEFAULT 'once',
  custom_days int NULL,
  grace_days int NOT NULL DEFAULT 0,
  applies_to jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agency_id, code)
);
GRANT SELECT ON public.woic_compliance_rules TO authenticated;
GRANT ALL ON public.woic_compliance_rules TO service_role;
ALTER TABLE public.woic_compliance_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cr readable" ON public.woic_compliance_rules
  FOR SELECT TO authenticated USING (agency_id IS NULL OR agency_id IN (SELECT private.current_user_agency_ids()));

CREATE TABLE IF NOT EXISTS public.woic_compliance_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  identity_id uuid NULL REFERENCES public.woic_identities(id) ON DELETE SET NULL,
  rule_id uuid NOT NULL REFERENCES public.woic_compliance_rules(id) ON DELETE CASCADE,
  status text NOT NULL,
  effective_at timestamptz NULL,
  expires_at timestamptz NULL,
  next_action_at timestamptz NULL,
  evidence_url text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS woic_ce_agency_idx ON public.woic_compliance_events(agency_id, status);
GRANT SELECT, INSERT, UPDATE ON public.woic_compliance_events TO authenticated;
GRANT ALL ON public.woic_compliance_events TO service_role;
ALTER TABLE public.woic_compliance_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ce readable" ON public.woic_compliance_events
  FOR SELECT TO authenticated USING (agency_id IN (SELECT private.current_user_agency_ids()));
CREATE POLICY "ce writable admin" ON public.woic_compliance_events
  FOR ALL TO authenticated
  USING (agency_id IN (SELECT private.current_user_agency_ids()) AND private.has_role(auth.uid(), 'agency_admin'::public.app_role))
  WITH CHECK (agency_id IN (SELECT private.current_user_agency_ids()) AND private.has_role(auth.uid(), 'agency_admin'::public.app_role));

CREATE TABLE IF NOT EXISTS public.woic_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  subject text NOT NULL DEFAULT '',
  channels text[] NOT NULL DEFAULT '{}',
  participants jsonb NOT NULL DEFAULT '[]'::jsonb,
  entity_type text NULL,
  entity_id uuid NULL,
  summary text NULL,
  unanswered boolean NOT NULL DEFAULT false,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS woic_conv_agency_idx ON public.woic_conversations(agency_id, last_activity_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.woic_conversations TO authenticated;
GRANT ALL ON public.woic_conversations TO service_role;
ALTER TABLE public.woic_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co readable" ON public.woic_conversations
  FOR SELECT TO authenticated USING (agency_id IN (SELECT private.current_user_agency_ids()));
CREATE POLICY "co writable" ON public.woic_conversations
  FOR ALL TO authenticated
  USING (agency_id IN (SELECT private.current_user_agency_ids()))
  WITH CHECK (agency_id IN (SELECT private.current_user_agency_ids()));

CREATE TABLE IF NOT EXISTS public.woic_conversation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.woic_conversations(id) ON DELETE CASCADE,
  channel text NOT NULL,
  direction text NOT NULL,
  sender text NULL,
  body text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.woic_conversation_messages TO authenticated;
GRANT ALL ON public.woic_conversation_messages TO service_role;
ALTER TABLE public.woic_conversation_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cm readable" ON public.woic_conversation_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.woic_conversations c WHERE c.id=woic_conversation_messages.conversation_id
    AND c.agency_id IN (SELECT private.current_user_agency_ids())));
CREATE POLICY "cm insertable" ON public.woic_conversation_messages FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.woic_conversations c WHERE c.id=woic_conversation_messages.conversation_id
    AND c.agency_id IN (SELECT private.current_user_agency_ids())));

CREATE TABLE IF NOT EXISTS public.woic_learning_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  kind text NOT NULL,
  subject_entity text NULL,
  subject_id uuid NULL,
  prediction_id uuid NULL,
  outcome jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS woic_learn_agency_idx ON public.woic_learning_history(agency_id, created_at DESC);
GRANT SELECT, INSERT ON public.woic_learning_history TO authenticated;
GRANT ALL ON public.woic_learning_history TO service_role;
ALTER TABLE public.woic_learning_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lh readable" ON public.woic_learning_history
  FOR SELECT TO authenticated USING (agency_id IN (SELECT private.current_user_agency_ids()));
CREATE POLICY "lh insertable" ON public.woic_learning_history
  FOR INSERT TO authenticated WITH CHECK (agency_id IN (SELECT private.current_user_agency_ids()));

CREATE TABLE IF NOT EXISTS public.woic_context_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agency_id uuid NOT NULL,
  current_worker_id uuid NULL,
  current_client_id uuid NULL,
  current_job_id uuid NULL,
  current_workflow text NULL,
  compliance_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  recent_activity jsonb NOT NULL DEFAULT '[]'::jsonb,
  active_role text NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, agency_id)
);
GRANT SELECT, INSERT, UPDATE ON public.woic_context_sessions TO authenticated;
GRANT ALL ON public.woic_context_sessions TO service_role;
ALTER TABLE public.woic_context_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ctx own" ON public.woic_context_sessions
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.woic_org_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  kind text NOT NULL,
  key text NOT NULL,
  value jsonb NOT NULL,
  weight numeric NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agency_id, kind, key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.woic_org_memory TO authenticated;
GRANT ALL ON public.woic_org_memory TO service_role;
ALTER TABLE public.woic_org_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "om readable" ON public.woic_org_memory
  FOR SELECT TO authenticated USING (agency_id IN (SELECT private.current_user_agency_ids()));
CREATE POLICY "om writable admin" ON public.woic_org_memory
  FOR ALL TO authenticated
  USING (agency_id IN (SELECT private.current_user_agency_ids()) AND private.has_role(auth.uid(),'agency_admin'::public.app_role))
  WITH CHECK (agency_id IN (SELECT private.current_user_agency_ids()) AND private.has_role(auth.uid(),'agency_admin'::public.app_role));

CREATE TABLE IF NOT EXISTS public.woic_service_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  version text NOT NULL DEFAULT '1',
  endpoint text NULL,
  status text NOT NULL DEFAULT 'active',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.woic_service_registry TO authenticated;
GRANT ALL ON public.woic_service_registry TO service_role;
ALTER TABLE public.woic_service_registry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sr readable" ON public.woic_service_registry FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.woic_api_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service text NOT NULL,
  action text NOT NULL,
  description text NOT NULL DEFAULT '',
  request_schema jsonb NOT NULL DEFAULT '{}'::jsonb,
  response_schema jsonb NOT NULL DEFAULT '{}'::jsonb,
  version text NOT NULL DEFAULT '1',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (service, action, version)
);
GRANT SELECT ON public.woic_api_registry TO authenticated;
GRANT ALL ON public.woic_api_registry TO service_role;
ALTER TABLE public.woic_api_registry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ar readable" ON public.woic_api_registry FOR SELECT TO authenticated USING (true);

INSERT INTO public.woic_service_registry (service, description, endpoint) VALUES
  ('identity','Identity Intelligence — global identity graph.','woic-api'),
  ('knowledge','Knowledge Intelligence — semantic + keyword search.','woic-api'),
  ('decision','Decision Intelligence — decisions with evidence.','woic-api'),
  ('recommendation','Recommendation Engine.','woic-recommend'),
  ('prediction','Predictive Intelligence.','woic-api'),
  ('compliance','Compliance Intelligence.','woic-compliance-scan'),
  ('learning','Learning Engine.','woic-api'),
  ('communication','Communication Intelligence.','woic-conversation-summarize'),
  ('workflow','Workflow Intelligence.','ttos-dispatch'),
  ('context','Context Engine.','woic-api')
ON CONFLICT (service) DO UPDATE SET description = EXCLUDED.description, endpoint = EXCLUDED.endpoint, updated_at = now();

INSERT INTO public.woic_api_registry (service, action, description) VALUES
  ('identity','list','List identities visible to caller'),
  ('identity','get','Get one identity by id'),
  ('knowledge','search','Hybrid semantic + keyword search'),
  ('knowledge','index','(Re)embed article for vector search'),
  ('decision','record','Record a new enterprise decision'),
  ('decision','list','List recent decisions'),
  ('recommendation','generate','Generate a recommendation'),
  ('recommendation','list','List recommendations'),
  ('prediction','predict','Run baseline predictor'),
  ('compliance','scan','Run compliance expiration scan'),
  ('learning','record','Record a learning outcome'),
  ('communication','summarize','Summarize conversation'),
  ('context','get','Get current user context'),
  ('context','set','Update current user context')
ON CONFLICT (service, action, version) DO NOTHING;

INSERT INTO public.woic_compliance_rules (agency_id, kind, code, name, description, cadence, grace_days) VALUES
  (NULL,'i9','I9','Form I-9 Employment Eligibility','US Form I-9 verification.','once',0),
  (NULL,'w4','W4','Form W-4 Withholding','US Form W-4.','once',0),
  (NULL,'w9','W9','Form W-9 (Contractor)','US Form W-9 for 1099 contractors.','once',0),
  (NULL,'background_check','BGC','Background Check','Standard background screen.','annual',30),
  (NULL,'drug_screen','DRUG','Drug Screen','Pre-employment drug screen.','annual',30),
  (NULL,'osha','OSHA10','OSHA 10-Hour','OSHA 10-hour safety training.','custom',0),
  (NULL,'hipaa','HIPAA','HIPAA Training','HIPAA privacy training.','annual',30),
  (NULL,'cdl','CDL','Commercial Driver License','CDL medical + license.','biennial',30),
  (NULL,'twic','TWIC','TWIC Card','Transportation Worker Identification Credential.','custom',60),
  (NULL,'policy','HANDBOOK','Employee Handbook Acknowledgment','Signed acknowledgment of policies.','annual',14)
ON CONFLICT (agency_id, code) DO NOTHING;

INSERT INTO public.woic_prediction_models (name, version, feature_set, description) VALUES
  ('assignment_acceptance_likelihood','1','["worker_activity_score","recent_placements","distance","pay_rate_vs_history","shift_time"]'::jsonb,'Baseline heuristic predictor of assignment acceptance.'),
  ('credential_expiry_risk','1','["days_to_expiry","renewal_history","grace_days"]'::jsonb,'Baseline heuristic for cert/license expiry risk.'),
  ('client_churn_risk','1','["days_since_last_ticket","open_disputes","volume_trend"]'::jsonb,'Baseline heuristic for client churn risk.')
ON CONFLICT (name, version) DO NOTHING;
