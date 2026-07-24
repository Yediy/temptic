
CREATE TABLE public.worker_twins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  passport_id uuid REFERENCES public.workforce_passports(id) ON DELETE SET NULL,
  career_health numeric,
  performance_trend jsonb NOT NULL DEFAULT '[]'::jsonb,
  learning_progress numeric,
  growth_score numeric,
  future_potential numeric,
  risk_indicators jsonb NOT NULL DEFAULT '{}'::jsonb,
  career_forecast jsonb NOT NULL DEFAULT '{}'::jsonb,
  current_capabilities jsonb NOT NULL DEFAULT '[]'::jsonb,
  model_version text,
  last_learned_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (worker_id)
);
GRANT SELECT, INSERT, UPDATE ON public.worker_twins TO authenticated;
GRANT ALL ON public.worker_twins TO service_role;
ALTER TABLE public.worker_twins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "twin_agency_read" ON public.worker_twins FOR SELECT TO authenticated
  USING (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "twin_worker_self_read" ON public.worker_twins FOR SELECT TO authenticated
  USING (worker_id IN (SELECT id FROM public.workers WHERE user_id = auth.uid()));
CREATE POLICY "twin_agency_admin_write" ON public.worker_twins FOR ALL TO authenticated
  USING (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid() AND is_active = true) AND private.has_role(auth.uid(), 'agency_admin'::public.app_role))
  WITH CHECK (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid() AND is_active = true) AND private.has_role(auth.uid(), 'agency_admin'::public.app_role));
CREATE TRIGGER trg_worker_twins_updated BEFORE UPDATE ON public.worker_twins FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_worker_twins_agency ON public.worker_twins(agency_id);

CREATE TABLE public.twin_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE,
  name text NOT NULL,
  version text NOT NULL,
  purpose text,
  feature_set jsonb NOT NULL DEFAULT '[]'::jsonb,
  endpoint text,
  status text NOT NULL DEFAULT 'active',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.twin_models TO authenticated;
GRANT ALL ON public.twin_models TO service_role;
ALTER TABLE public.twin_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "twin_models_read" ON public.twin_models FOR SELECT TO authenticated
  USING (agency_id IS NULL OR agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid() AND is_active = true));
CREATE TRIGGER trg_twin_models_updated BEFORE UPDATE ON public.twin_models FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.twin_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  twin_id uuid NOT NULL REFERENCES public.worker_twins(id) ON DELETE CASCADE,
  worker_id uuid NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  model_id uuid REFERENCES public.twin_models(id) ON DELETE SET NULL,
  kind text NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence numeric,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  reasoning text,
  horizon text,
  produced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.twin_predictions TO authenticated;
GRANT ALL ON public.twin_predictions TO service_role;
ALTER TABLE public.twin_predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "twin_pred_agency_read" ON public.twin_predictions FOR SELECT TO authenticated
  USING (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "twin_pred_worker_read" ON public.twin_predictions FOR SELECT TO authenticated
  USING (worker_id IN (SELECT id FROM public.workers WHERE user_id = auth.uid()));
CREATE INDEX idx_twin_predictions_twin ON public.twin_predictions(twin_id);
CREATE INDEX idx_twin_predictions_kind ON public.twin_predictions(agency_id, kind);

CREATE TABLE public.twin_learning_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  twin_id uuid NOT NULL REFERENCES public.worker_twins(id) ON DELETE CASCADE,
  worker_id uuid NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  source text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  impact jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.twin_learning_events TO authenticated;
GRANT ALL ON public.twin_learning_events TO service_role;
ALTER TABLE public.twin_learning_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "twin_learn_agency_read" ON public.twin_learning_events FOR SELECT TO authenticated
  USING (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "twin_learn_worker_read" ON public.twin_learning_events FOR SELECT TO authenticated
  USING (worker_id IN (SELECT id FROM public.workers WHERE user_id = auth.uid()));
CREATE INDEX idx_twin_learning_twin ON public.twin_learning_events(twin_id, occurred_at DESC);

CREATE TABLE public.twin_capabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  twin_id uuid NOT NULL REFERENCES public.worker_twins(id) ON DELETE CASCADE,
  worker_id uuid NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  kind text NOT NULL,
  label text NOT NULL,
  proficiency numeric,
  confidence numeric,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_evidenced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.twin_capabilities TO authenticated;
GRANT ALL ON public.twin_capabilities TO service_role;
ALTER TABLE public.twin_capabilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "twin_cap_agency_read" ON public.twin_capabilities FOR SELECT TO authenticated
  USING (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "twin_cap_worker_read" ON public.twin_capabilities FOR SELECT TO authenticated
  USING (worker_id IN (SELECT id FROM public.workers WHERE user_id = auth.uid()));
CREATE TRIGGER trg_twin_capabilities_updated BEFORE UPDATE ON public.twin_capabilities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_twin_capabilities_twin ON public.twin_capabilities(twin_id);

CREATE TABLE public.career_simulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  twin_id uuid NOT NULL REFERENCES public.worker_twins(id) ON DELETE CASCADE,
  worker_id uuid NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  scenario text NOT NULL,
  target_role text,
  estimated_salary jsonb NOT NULL DEFAULT '{}'::jsonb,
  timeline_months integer,
  skill_growth jsonb NOT NULL DEFAULT '[]'::jsonb,
  training_required jsonb NOT NULL DEFAULT '[]'::jsonb,
  outcomes jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.career_simulations TO authenticated;
GRANT ALL ON public.career_simulations TO service_role;
ALTER TABLE public.career_simulations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "career_sim_agency_read" ON public.career_simulations FOR SELECT TO authenticated
  USING (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "career_sim_worker_read" ON public.career_simulations FOR SELECT TO authenticated
  USING (worker_id IN (SELECT id FROM public.workers WHERE user_id = auth.uid()));

CREATE TABLE public.assignment_simulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  twin_id uuid NOT NULL REFERENCES public.worker_twins(id) ON DELETE CASCADE,
  worker_id uuid NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  job_id uuid,
  client_id uuid,
  performance_score numeric,
  attendance_score numeric,
  safety_score numeric,
  retention_score numeric,
  satisfaction_score numeric,
  success_probability numeric,
  reasoning text,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.assignment_simulations TO authenticated;
GRANT ALL ON public.assignment_simulations TO service_role;
ALTER TABLE public.assignment_simulations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "asg_sim_agency_read" ON public.assignment_simulations FOR SELECT TO authenticated
  USING (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid() AND is_active = true));

CREATE TABLE public.growth_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  twin_id uuid NOT NULL REFERENCES public.worker_twins(id) ON DELETE CASCADE,
  worker_id uuid NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  title text NOT NULL,
  goals jsonb NOT NULL DEFAULT '[]'::jsonb,
  training_recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  mentor_recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  assignment_recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  project_recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.growth_plans TO authenticated;
GRANT ALL ON public.growth_plans TO service_role;
ALTER TABLE public.growth_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "growth_agency_read" ON public.growth_plans FOR SELECT TO authenticated
  USING (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "growth_worker_read" ON public.growth_plans FOR SELECT TO authenticated
  USING (worker_id IN (SELECT id FROM public.workers WHERE user_id = auth.uid()));
CREATE POLICY "growth_agency_admin_write" ON public.growth_plans FOR ALL TO authenticated
  USING (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid() AND is_active = true) AND private.has_role(auth.uid(), 'agency_admin'::public.app_role))
  WITH CHECK (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid() AND is_active = true) AND private.has_role(auth.uid(), 'agency_admin'::public.app_role));
CREATE TRIGGER trg_growth_plans_updated BEFORE UPDATE ON public.growth_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.twin_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  twin_id uuid NOT NULL REFERENCES public.worker_twins(id) ON DELETE CASCADE,
  worker_id uuid NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text NOT NULL,
  body text,
  score numeric,
  confidence numeric,
  reasoning text,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'open',
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.twin_recommendations TO authenticated;
GRANT ALL ON public.twin_recommendations TO service_role;
ALTER TABLE public.twin_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "twin_reco_agency_read" ON public.twin_recommendations FOR SELECT TO authenticated
  USING (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "twin_reco_worker_read" ON public.twin_recommendations FOR SELECT TO authenticated
  USING (worker_id IN (SELECT id FROM public.workers WHERE user_id = auth.uid()));
CREATE TRIGGER trg_twin_reco_updated BEFORE UPDATE ON public.twin_recommendations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.twin_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  twin_id uuid NOT NULL REFERENCES public.worker_twins(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  related_entity text NOT NULL,
  related_id uuid,
  relationship text NOT NULL,
  strength numeric,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.twin_relationships TO authenticated;
GRANT ALL ON public.twin_relationships TO service_role;
ALTER TABLE public.twin_relationships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "twin_rel_agency_read" ON public.twin_relationships FOR SELECT TO authenticated
  USING (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid() AND is_active = true));

CREATE TABLE public.knowledge_graph_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  node_type text NOT NULL,
  ref_id uuid,
  label text NOT NULL,
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.knowledge_graph_nodes TO authenticated;
GRANT ALL ON public.knowledge_graph_nodes TO service_role;
ALTER TABLE public.knowledge_graph_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kg_nodes_agency_read" ON public.knowledge_graph_nodes FOR SELECT TO authenticated
  USING (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid() AND is_active = true));
CREATE TRIGGER trg_kg_nodes_updated BEFORE UPDATE ON public.knowledge_graph_nodes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_kg_nodes_agency_type ON public.knowledge_graph_nodes(agency_id, node_type);

CREATE TABLE public.knowledge_graph_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  from_node uuid NOT NULL REFERENCES public.knowledge_graph_nodes(id) ON DELETE CASCADE,
  to_node uuid NOT NULL REFERENCES public.knowledge_graph_nodes(id) ON DELETE CASCADE,
  relationship text NOT NULL,
  weight numeric,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.knowledge_graph_edges TO authenticated;
GRANT ALL ON public.knowledge_graph_edges TO service_role;
ALTER TABLE public.knowledge_graph_edges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kg_edges_agency_read" ON public.knowledge_graph_edges FOR SELECT TO authenticated
  USING (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid() AND is_active = true));
CREATE INDEX idx_kg_edges_from ON public.knowledge_graph_edges(from_node);
CREATE INDEX idx_kg_edges_to ON public.knowledge_graph_edges(to_node);
