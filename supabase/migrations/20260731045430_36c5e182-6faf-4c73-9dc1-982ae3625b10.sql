
-- ============ WOIC Cognitive Core (Phase 5.0) ============
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Cognitive request audit log
CREATE TABLE public.woic_cognitive_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL,
  user_id UUID,
  service TEXT NOT NULL,
  operation TEXT NOT NULL,
  input JSONB NOT NULL DEFAULT '{}'::jsonb,
  output JSONB,
  status TEXT NOT NULL DEFAULT 'ok',
  error TEXT,
  latency_ms INTEGER,
  model TEXT,
  cached BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.woic_cognitive_requests TO authenticated;
GRANT ALL ON public.woic_cognitive_requests TO service_role;
ALTER TABLE public.woic_cognitive_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read cognitive requests" ON public.woic_cognitive_requests
  FOR SELECT TO authenticated USING (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid() AND is_active));
CREATE INDEX idx_woic_cog_req_agency ON public.woic_cognitive_requests(agency_id, created_at DESC);

-- 2. Reasoning traces
CREATE TABLE public.woic_reasoning_traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL,
  user_id UUID,
  domain TEXT NOT NULL,
  question TEXT NOT NULL,
  conclusion TEXT,
  confidence NUMERIC,
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  alternatives JSONB NOT NULL DEFAULT '[]'::jsonb,
  risk JSONB NOT NULL DEFAULT '{}'::jsonb,
  explanation TEXT,
  subject_entity TEXT,
  subject_id UUID,
  status TEXT NOT NULL DEFAULT 'complete',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.woic_reasoning_traces TO authenticated;
GRANT ALL ON public.woic_reasoning_traces TO service_role;
ALTER TABLE public.woic_reasoning_traces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read reasoning" ON public.woic_reasoning_traces
  FOR SELECT TO authenticated USING (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid() AND is_active));
CREATE INDEX idx_woic_reasoning_agency ON public.woic_reasoning_traces(agency_id, created_at DESC);

CREATE TABLE public.woic_reasoning_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id UUID NOT NULL REFERENCES public.woic_reasoning_traces(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL,
  step_no INTEGER NOT NULL,
  kind TEXT NOT NULL,
  content TEXT,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.woic_reasoning_steps TO authenticated;
GRANT ALL ON public.woic_reasoning_steps TO service_role;
ALTER TABLE public.woic_reasoning_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read reasoning steps" ON public.woic_reasoning_steps
  FOR SELECT TO authenticated USING (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid() AND is_active));
CREATE INDEX idx_woic_reasoning_steps_trace ON public.woic_reasoning_steps(trace_id, step_no);

-- 3. Semantic memory
CREATE TABLE public.woic_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL,
  scope TEXT NOT NULL DEFAULT 'organizational',
  kind TEXT NOT NULL DEFAULT 'fact',
  title TEXT,
  content TEXT NOT NULL,
  source_entity TEXT,
  source_id UUID,
  tags TEXT[] NOT NULL DEFAULT '{}',
  importance NUMERIC NOT NULL DEFAULT 0.5,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  embedding vector(1536),
  expires_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.woic_memory TO authenticated;
GRANT ALL ON public.woic_memory TO service_role;
ALTER TABLE public.woic_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read memory" ON public.woic_memory
  FOR SELECT TO authenticated USING (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid() AND is_active));
CREATE INDEX idx_woic_memory_agency ON public.woic_memory(agency_id, created_at DESC);
CREATE INDEX idx_woic_memory_scope ON public.woic_memory(agency_id, scope, kind);

CREATE OR REPLACE FUNCTION public.woic_match_memory(
  _agency_id UUID, _embedding vector(1536), _match_count INTEGER DEFAULT 10, _scope TEXT DEFAULT NULL
)
RETURNS TABLE (id UUID, title TEXT, content TEXT, scope TEXT, kind TEXT, importance NUMERIC, similarity DOUBLE PRECISION)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.id, m.title, m.content, m.scope, m.kind, m.importance,
         1 - (m.embedding <=> _embedding) AS similarity
  FROM public.woic_memory m
  WHERE m.agency_id = _agency_id
    AND m.embedding IS NOT NULL
    AND (_scope IS NULL OR m.scope = _scope)
    AND (m.expires_at IS NULL OR m.expires_at > now())
  ORDER BY m.embedding <=> _embedding
  LIMIT GREATEST(1, LEAST(_match_count, 50));
$$;
REVOKE ALL ON FUNCTION public.woic_match_memory(UUID, vector, INTEGER, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.woic_match_memory(UUID, vector, INTEGER, TEXT) TO service_role;

-- 4. Knowledge graph
CREATE TABLE public.woic_graph_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  entity_key TEXT NOT NULL,
  label TEXT NOT NULL,
  ref_entity TEXT,
  ref_id UUID,
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  weight NUMERIC NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (agency_id, entity_type, entity_key)
);
GRANT SELECT ON public.woic_graph_entities TO authenticated;
GRANT ALL ON public.woic_graph_entities TO service_role;
ALTER TABLE public.woic_graph_entities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read graph entities" ON public.woic_graph_entities
  FOR SELECT TO authenticated USING (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid() AND is_active));

CREATE TABLE public.woic_graph_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL,
  from_id UUID NOT NULL REFERENCES public.woic_graph_entities(id) ON DELETE CASCADE,
  to_id UUID NOT NULL REFERENCES public.woic_graph_entities(id) ON DELETE CASCADE,
  relation TEXT NOT NULL,
  weight NUMERIC NOT NULL DEFAULT 1,
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (agency_id, from_id, to_id, relation)
);
GRANT SELECT ON public.woic_graph_edges TO authenticated;
GRANT ALL ON public.woic_graph_edges TO service_role;
ALTER TABLE public.woic_graph_edges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read graph edges" ON public.woic_graph_edges
  FOR SELECT TO authenticated USING (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid() AND is_active));

-- 5. Generated communications
CREATE TABLE public.woic_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL,
  channel TEXT NOT NULL,
  audience TEXT NOT NULL,
  tone TEXT,
  language TEXT NOT NULL DEFAULT 'en',
  subject TEXT,
  body TEXT NOT NULL,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.woic_communications TO authenticated;
GRANT ALL ON public.woic_communications TO service_role;
ALTER TABLE public.woic_communications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read communications" ON public.woic_communications
  FOR SELECT TO authenticated USING (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid() AND is_active));

-- 6. Executive briefs
CREATE TABLE public.woic_executive_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL,
  kind TEXT NOT NULL,
  period_start DATE,
  period_end DATE,
  title TEXT NOT NULL,
  summary TEXT,
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.woic_executive_briefs TO authenticated;
GRANT ALL ON public.woic_executive_briefs TO service_role;
ALTER TABLE public.woic_executive_briefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read briefs" ON public.woic_executive_briefs
  FOR SELECT TO authenticated USING (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid() AND is_active));

-- 7. Security intelligence signals
CREATE TABLE public.woic_security_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL,
  kind TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'low',
  title TEXT NOT NULL,
  detail TEXT,
  subject_entity TEXT,
  subject_id UUID,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'open',
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
GRANT SELECT ON public.woic_security_signals TO authenticated;
GRANT ALL ON public.woic_security_signals TO service_role;
ALTER TABLE public.woic_security_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read security signals" ON public.woic_security_signals
  FOR SELECT TO authenticated USING (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid() AND is_active));
CREATE INDEX idx_woic_sec_signals_agency ON public.woic_security_signals(agency_id, detected_at DESC);

-- 8. Simulations
CREATE TABLE public.woic_simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL,
  scenario TEXT NOT NULL,
  inputs JSONB NOT NULL DEFAULT '{}'::jsonb,
  results JSONB NOT NULL DEFAULT '{}'::jsonb,
  recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence NUMERIC,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.woic_simulations TO authenticated;
GRANT ALL ON public.woic_simulations TO service_role;
ALTER TABLE public.woic_simulations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read simulations" ON public.woic_simulations
  FOR SELECT TO authenticated USING (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid() AND is_active));

-- 9. Learning feedback
CREATE TABLE public.woic_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL,
  user_id UUID,
  target_kind TEXT NOT NULL,
  target_id UUID,
  signal TEXT NOT NULL,
  correction TEXT,
  weight NUMERIC NOT NULL DEFAULT 1,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.woic_feedback TO authenticated;
GRANT ALL ON public.woic_feedback TO service_role;
ALTER TABLE public.woic_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read feedback" ON public.woic_feedback
  FOR SELECT TO authenticated USING (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid() AND is_active));

-- 10. Cognitive cache (service-role only)
CREATE TABLE public.woic_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL,
  cache_key TEXT NOT NULL,
  value JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (agency_id, cache_key)
);
GRANT ALL ON public.woic_cache TO service_role;
ALTER TABLE public.woic_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no direct cache access" ON public.woic_cache FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- updated_at triggers
CREATE TRIGGER trg_woic_memory_updated BEFORE UPDATE ON public.woic_memory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_woic_reasoning_updated BEFORE UPDATE ON public.woic_reasoning_traces
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_woic_graph_entities_updated BEFORE UPDATE ON public.woic_graph_entities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
