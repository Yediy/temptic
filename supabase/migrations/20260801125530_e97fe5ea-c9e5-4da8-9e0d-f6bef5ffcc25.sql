
-- ============================================================
-- 1. SECURITY FIXES: agency scoping on TTO role-gated tables
-- ============================================================
DROP POLICY IF EXISTS tto_labor_read ON public.tto_labor_costs;
CREATE POLICY tto_labor_read ON public.tto_labor_costs FOR SELECT TO authenticated
USING (private.has_role(auth.uid(),'agency_admin') AND agency_id IN (SELECT private.current_user_agency_ids()));

DROP POLICY IF EXISTS tto_bill_read ON public.tto_billable_hours;
CREATE POLICY tto_bill_read ON public.tto_billable_hours FOR SELECT TO authenticated
USING (private.has_role(auth.uid(),'agency_admin') AND agency_id IN (SELECT private.current_user_agency_ids()));

DROP POLICY IF EXISTS tto_payroll_read ON public.tto_payroll_batches;
CREATE POLICY tto_payroll_read ON public.tto_payroll_batches FOR SELECT TO authenticated
USING (private.has_role(auth.uid(),'agency_admin') AND agency_id IN (SELECT private.current_user_agency_ids()));

DROP POLICY IF EXISTS tto_billing_read ON public.tto_billing_batches;
CREATE POLICY tto_billing_read ON public.tto_billing_batches FOR SELECT TO authenticated
USING (private.has_role(auth.uid(),'agency_admin') AND agency_id IN (SELECT private.current_user_agency_ids()));

DROP POLICY IF EXISTS tto_audit_read ON public.tto_audit_events;
CREATE POLICY tto_audit_read ON public.tto_audit_events FOR SELECT TO authenticated
USING (private.has_role(auth.uid(),'agency_admin') AND agency_id IN (SELECT private.current_user_agency_ids()));

DROP POLICY IF EXISTS tto_audit_insert ON public.tto_audit_events;
CREATE POLICY tto_audit_insert ON public.tto_audit_events FOR INSERT TO authenticated
WITH CHECK (agency_id IN (SELECT private.current_user_agency_ids())
  AND (actor_id = auth.uid() OR private.has_role(auth.uid(),'agency_admin')));

DROP POLICY IF EXISTS tto_shift_events_read ON public.tto_shift_events;
CREATE POLICY tto_shift_events_read ON public.tto_shift_events FOR SELECT TO authenticated
USING ((private.has_role(auth.uid(),'agency_admin') OR private.has_role(auth.uid(),'recruiter'))
  AND agency_id IN (SELECT private.current_user_agency_ids()));

DROP POLICY IF EXISTS tto_tickets_agency_update ON public.tto_time_tickets;
CREATE POLICY tto_tickets_agency_update ON public.tto_time_tickets FOR UPDATE TO authenticated
USING ((private.has_role(auth.uid(),'agency_admin') OR private.has_role(auth.uid(),'recruiter'))
  AND agency_id IN (SELECT private.current_user_agency_ids()))
WITH CHECK ((private.has_role(auth.uid(),'agency_admin') OR private.has_role(auth.uid(),'recruiter'))
  AND agency_id IN (SELECT private.current_user_agency_ids()));

DROP POLICY IF EXISTS tto_tickets_agency_write ON public.tto_time_tickets;
CREATE POLICY tto_tickets_agency_write ON public.tto_time_tickets FOR INSERT TO authenticated
WITH CHECK (agency_id IN (SELECT private.current_user_agency_ids())
  AND (private.has_role(auth.uid(),'agency_admin') OR private.has_role(auth.uid(),'recruiter')
       OR worker_id IN (SELECT w.id FROM public.workers w WHERE w.user_id = auth.uid())));

-- ============================================================
-- 2. GRAPH TAXONOMY
-- ============================================================
CREATE TABLE IF NOT EXISTS public.woic_graph_node_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  category text NOT NULL,
  description text,
  color text,
  icon text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.woic_graph_node_types TO authenticated;
GRANT ALL ON public.woic_graph_node_types TO service_role;
ALTER TABLE public.woic_graph_node_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY woic_node_types_read ON public.woic_graph_node_types FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.woic_graph_relation_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  from_types text[] NOT NULL DEFAULT '{}',
  to_types text[] NOT NULL DEFAULT '{}',
  directed boolean NOT NULL DEFAULT true,
  category text NOT NULL DEFAULT 'general',
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.woic_graph_relation_types TO authenticated;
GRANT ALL ON public.woic_graph_relation_types TO service_role;
ALTER TABLE public.woic_graph_relation_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY woic_relation_types_read ON public.woic_graph_relation_types FOR SELECT TO authenticated USING (true);

INSERT INTO public.woic_graph_node_types (key,label,category,color) VALUES
 ('worker','Worker','people','#38bdf8'),
 ('organization','Organization','org','#818cf8'),
 ('department','Department','org','#a78bfa'),
 ('team','Team','org','#c084fc'),
 ('project','Project','work','#34d399'),
 ('job','Job','work','#10b981'),
 ('task','Task','work','#6ee7b7'),
 ('schedule','Schedule','work','#5eead4'),
 ('skill','Skill','capability','#fbbf24'),
 ('certification','Certification','capability','#f59e0b'),
 ('training','Training','capability','#fcd34d'),
 ('license','License','compliance','#f97316'),
 ('compliance_rule','Compliance Rule','compliance','#ef4444'),
 ('government','Government','compliance','#dc2626'),
 ('equipment','Equipment','asset','#94a3b8'),
 ('asset','Asset','asset','#cbd5e1'),
 ('vehicle','Vehicle','asset','#64748b'),
 ('robot','Robot','machine','#22d3ee'),
 ('humanoid','Humanoid','machine','#06b6d4'),
 ('ai_agent','AI Agent','machine','#2dd4bf'),
 ('building','Building','place','#a3a3a3'),
 ('facility','Facility','place','#d4d4d4'),
 ('location','Location','place','#e5e5e5'),
 ('city','City','place','#f5f5f5'),
 ('state','State','place','#fafafa'),
 ('country','Country','place','#ffffff'),
 ('client','Client','commerce','#60a5fa'),
 ('vendor','Vendor','commerce','#3b82f6'),
 ('school','School','education','#f472b6'),
 ('university','University','education','#ec4899'),
 ('event','Event','signal','#facc15'),
 ('document','Document','knowledge','#a5b4fc'),
 ('knowledge_article','Knowledge Article','knowledge','#93c5fd'),
 ('research_paper','Research Paper','knowledge','#7dd3fc'),
 ('language','Language','attribute','#fda4af'),
 ('industry','Industry','attribute','#fb7185'),
 ('technology','Technology','attribute','#4ade80'),
 ('software','Software','attribute','#22c55e'),
 ('community','Community','network','#e879f9'),
 ('association','Professional Association','network','#d946ef')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.woic_graph_relation_types (key,label,from_types,to_types,category,directed) VALUES
 ('has_skill','HAS SKILL','{worker}','{skill}','capability',true),
 ('worked_on','WORKED ON','{worker}','{project,job}','work',true),
 ('belongs_to','BELONGS TO','{worker,department,team}','{organization,department}','org',true),
 ('knows','KNOWS','{worker}','{worker}','network',false),
 ('trained','TRAINED','{worker}','{worker}','network',true),
 ('supervised','SUPERVISED','{worker}','{worker}','org',true),
 ('operates','OPERATES','{worker,robot,humanoid}','{equipment,vehicle}','asset',true),
 ('has_certification','HAS CERTIFICATION','{worker}','{certification}','compliance',true),
 ('requires_training','REQUIRES TRAINING','{certification}','{training}','capability',true),
 ('grants_skill','GRANTS SKILL','{training}','{skill}','capability',true),
 ('requires_skill','REQUIRES SKILL','{project,job}','{skill}','work',true),
 ('owns','OWNS','{organization,client,vendor}','{equipment,asset,vehicle,building,robot}','asset',true),
 ('located_at','LOCATED AT','{equipment,worker,project,robot}','{facility,building,location}','place',true),
 ('in_city','IN CITY','{facility,building,location}','{city}','place',true),
 ('in_state','IN STATE','{city}','{state}','place',true),
 ('in_country','IN COUNTRY','{state}','{country}','place',true),
 ('reports_to','REPORTS TO','{robot,humanoid,worker,ai_agent}','{organization,worker}','org',true),
 ('assists','ASSISTS','{ai_agent}','{worker}','machine',true),
 ('controls','CONTROLS','{ai_agent}','{robot,humanoid,equipment}','machine',true),
 ('uses','USES','{robot,humanoid,worker}','{equipment,software,technology}','asset',true),
 ('requires_inspection','REQUIRES INSPECTION','{equipment,vehicle}','{event,compliance_rule}','compliance',true),
 ('generated','GENERATED','{event,task,document}','{event,document}','signal',true),
 ('changed_compliance','CHANGED COMPLIANCE','{event}','{compliance_rule}','compliance',true),
 ('assigned_to','ASSIGNED TO','{worker,robot,ai_agent}','{task,job,project,schedule}','work',true),
 ('serves','SERVES','{organization}','{client}','commerce',true),
 ('supplies','SUPPLIES','{vendor}','{organization,equipment}','commerce',true),
 ('studied_at','STUDIED AT','{worker}','{school,university}','education',true),
 ('member_of','MEMBER OF','{worker}','{community,association,team}','network',true),
 ('speaks','SPEAKS','{worker}','{language}','attribute',true),
 ('operates_in','OPERATES IN','{organization,client}','{industry,country}','attribute',true),
 ('documents','DOCUMENTS','{document,knowledge_article,research_paper}','{skill,equipment,compliance_rule,project}','knowledge',true),
 ('related_to','RELATED TO','{}','{}','general',false)
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 3. TIME TRAVEL + PERFORMANCE + CACHE
-- ============================================================
ALTER TABLE public.woic_graph_entities
  ADD COLUMN IF NOT EXISTS valid_from timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS valid_to timestamptz;
ALTER TABLE public.woic_graph_edges
  ADD COLUMN IF NOT EXISTS valid_from timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS valid_to timestamptz,
  ADD COLUMN IF NOT EXISTS confidence numeric NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS woic_graph_edges_from_idx ON public.woic_graph_edges(agency_id, from_id, relation);
CREATE INDEX IF NOT EXISTS woic_graph_edges_to_idx ON public.woic_graph_edges(agency_id, to_id, relation);
CREATE INDEX IF NOT EXISTS woic_graph_entities_type_idx ON public.woic_graph_entities(agency_id, entity_type);
CREATE INDEX IF NOT EXISTS woic_graph_entities_ref_idx ON public.woic_graph_entities(agency_id, ref_entity, ref_id);

CREATE TABLE IF NOT EXISTS public.woic_graph_query_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  query_key text NOT NULL,
  api text NOT NULL,
  result jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agency_id, query_key)
);
GRANT SELECT ON public.woic_graph_query_cache TO authenticated;
GRANT ALL ON public.woic_graph_query_cache TO service_role;
ALTER TABLE public.woic_graph_query_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY woic_graph_cache_read ON public.woic_graph_query_cache FOR SELECT TO authenticated
USING (agency_id IN (SELECT private.current_user_agency_ids()));

-- ============================================================
-- 4. GRAPH QUERY ENGINE (RLS-respecting, security invoker)
-- ============================================================

-- Neighbourhood expansion up to _depth hops.
CREATE OR REPLACE FUNCTION public.woic_graph_neighbors(
  _agency_id uuid, _node_id uuid, _depth integer DEFAULT 2,
  _relations text[] DEFAULT NULL, _as_of timestamptz DEFAULT NULL, _limit integer DEFAULT 300)
RETURNS TABLE (node_id uuid, label text, entity_type text, depth integer, via text, weight numeric)
LANGUAGE sql STABLE AS $$
  WITH RECURSIVE ts AS (SELECT COALESCE(_as_of, now()) AS t),
  walk AS (
    SELECT _node_id AS node_id, 0 AS depth, NULL::text AS via, 1::numeric AS weight
    UNION ALL
    SELECT CASE WHEN e.from_id = w.node_id THEN e.to_id ELSE e.from_id END,
           w.depth + 1, e.relation, w.weight * COALESCE(e.weight, 1)
    FROM walk w
    JOIN public.woic_graph_edges e
      ON (e.from_id = w.node_id OR e.to_id = w.node_id)
     AND e.agency_id = _agency_id
     AND (_relations IS NULL OR e.relation = ANY(_relations))
     AND e.valid_from <= (SELECT t FROM ts)
     AND (e.valid_to IS NULL OR e.valid_to > (SELECT t FROM ts))
    WHERE w.depth < LEAST(GREATEST(_depth, 1), 5)
  ),
  best AS (
    SELECT node_id, MIN(depth) AS depth,
           (ARRAY_AGG(via ORDER BY depth))[1] AS via,
           MAX(weight) AS weight
    FROM walk GROUP BY node_id
  )
  SELECT b.node_id, n.label, n.entity_type, b.depth, b.via, b.weight
  FROM best b
  JOIN public.woic_graph_entities n ON n.id = b.node_id AND n.agency_id = _agency_id
  ORDER BY b.depth, b.weight DESC
  LIMIT GREATEST(LEAST(_limit, 2000), 1);
$$;

-- Shortest path between two nodes (BFS, cycle-safe).
CREATE OR REPLACE FUNCTION public.woic_graph_shortest_path(
  _agency_id uuid, _from_id uuid, _to_id uuid, _max_depth integer DEFAULT 6)
RETURNS TABLE (hop integer, node_id uuid, label text, entity_type text, relation text)
LANGUAGE sql STABLE AS $$
  WITH RECURSIVE bfs AS (
    SELECT _from_id AS node_id, ARRAY[_from_id] AS path, ARRAY[]::text[] AS rels, 0 AS depth
    UNION ALL
    SELECT CASE WHEN e.from_id = b.node_id THEN e.to_id ELSE e.from_id END,
           b.path || CASE WHEN e.from_id = b.node_id THEN e.to_id ELSE e.from_id END,
           b.rels || e.relation, b.depth + 1
    FROM bfs b
    JOIN public.woic_graph_edges e
      ON (e.from_id = b.node_id OR e.to_id = b.node_id) AND e.agency_id = _agency_id
     AND e.valid_to IS NULL
    WHERE b.depth < LEAST(GREATEST(_max_depth, 1), 8)
      AND NOT (CASE WHEN e.from_id = b.node_id THEN e.to_id ELSE e.from_id END = ANY(b.path))
      AND NOT (_to_id = ANY(b.path))
  ),
  found AS (
    SELECT path, rels FROM bfs WHERE node_id = _to_id ORDER BY depth LIMIT 1
  )
  SELECT s.ord - 1 AS hop, s.nid AS node_id, n.label, n.entity_type,
         CASE WHEN s.ord = 1 THEN NULL ELSE (SELECT rels[s.ord - 1] FROM found) END AS relation
  FROM found f, LATERAL unnest(f.path) WITH ORDINALITY AS s(nid, ord)
  JOIN public.woic_graph_entities n ON n.id = s.nid AND n.agency_id = _agency_id
  ORDER BY s.ord;
$$;

-- Similarity: shared-neighbour (Jaccard) similarity between nodes.
CREATE OR REPLACE FUNCTION public.woic_graph_similar(
  _agency_id uuid, _node_id uuid, _entity_type text DEFAULT NULL,
  _relations text[] DEFAULT NULL, _limit integer DEFAULT 20)
RETURNS TABLE (node_id uuid, label text, entity_type text, shared integer, similarity numeric, shared_labels text[])
LANGUAGE sql STABLE AS $$
  WITH src AS (
    SELECT DISTINCT CASE WHEN e.from_id = _node_id THEN e.to_id ELSE e.from_id END AS nb
    FROM public.woic_graph_edges e
    WHERE e.agency_id = _agency_id AND (e.from_id = _node_id OR e.to_id = _node_id)
      AND (_relations IS NULL OR e.relation = ANY(_relations)) AND e.valid_to IS NULL
  ),
  others AS (
    SELECT CASE WHEN e.from_id = s.nb THEN e.to_id ELSE e.from_id END AS cand, s.nb
    FROM src s
    JOIN public.woic_graph_edges e ON (e.from_id = s.nb OR e.to_id = s.nb) AND e.agency_id = _agency_id
     AND (_relations IS NULL OR e.relation = ANY(_relations)) AND e.valid_to IS NULL
  ),
  agg AS (
    SELECT o.cand, COUNT(DISTINCT o.nb)::int AS shared,
           ARRAY_AGG(DISTINCT n2.label) FILTER (WHERE n2.label IS NOT NULL) AS shared_labels
    FROM others o
    LEFT JOIN public.woic_graph_entities n2 ON n2.id = o.nb AND n2.agency_id = _agency_id
    WHERE o.cand <> _node_id
    GROUP BY o.cand
  ),
  deg AS (
    SELECT a.cand, a.shared, a.shared_labels,
      (SELECT COUNT(DISTINCT CASE WHEN e.from_id = a.cand THEN e.to_id ELSE e.from_id END)
       FROM public.woic_graph_edges e
       WHERE e.agency_id = _agency_id AND (e.from_id = a.cand OR e.to_id = a.cand) AND e.valid_to IS NULL) AS cand_deg
    FROM agg a
  )
  SELECT d.cand, n.label, n.entity_type, d.shared,
         ROUND(d.shared::numeric / NULLIF(((SELECT COUNT(*) FROM src) + d.cand_deg - d.shared), 0), 4) AS similarity,
         (d.shared_labels)[1:8]
  FROM deg d
  JOIN public.woic_graph_entities n ON n.id = d.cand AND n.agency_id = _agency_id
  WHERE (_entity_type IS NULL OR n.entity_type = _entity_type)
  ORDER BY similarity DESC NULLS LAST, d.shared DESC
  LIMIT GREATEST(LEAST(_limit, 200), 1);
$$;

-- Influence: weighted degree centrality.
CREATE OR REPLACE FUNCTION public.woic_graph_influence(
  _agency_id uuid, _entity_type text DEFAULT NULL, _limit integer DEFAULT 25)
RETURNS TABLE (node_id uuid, label text, entity_type text, degree integer, in_degree integer, out_degree integer, score numeric)
LANGUAGE sql STABLE AS $$
  WITH d AS (
    SELECT n.id, n.label, n.entity_type,
      COUNT(e.id)::int AS degree,
      COUNT(e.id) FILTER (WHERE e.to_id = n.id)::int AS in_degree,
      COUNT(e.id) FILTER (WHERE e.from_id = n.id)::int AS out_degree,
      COALESCE(SUM(COALESCE(e.weight,1) * COALESCE(e.confidence,1)), 0) AS raw
    FROM public.woic_graph_entities n
    LEFT JOIN public.woic_graph_edges e
      ON (e.from_id = n.id OR e.to_id = n.id) AND e.agency_id = _agency_id AND e.valid_to IS NULL
    WHERE n.agency_id = _agency_id AND (_entity_type IS NULL OR n.entity_type = _entity_type)
    GROUP BY n.id, n.label, n.entity_type
  )
  SELECT d.id, d.label, d.entity_type, d.degree, d.in_degree, d.out_degree,
         ROUND(d.raw / NULLIF((SELECT MAX(raw) FROM d), 0), 4) AS score
  FROM d WHERE d.degree > 0
  ORDER BY score DESC NULLS LAST, d.degree DESC
  LIMIT GREATEST(LEAST(_limit, 200), 1);
$$;

-- Community detection: connected components with a bounded expansion.
CREATE OR REPLACE FUNCTION public.woic_graph_communities(
  _agency_id uuid, _relations text[] DEFAULT NULL, _max_depth integer DEFAULT 3, _limit integer DEFAULT 20)
RETURNS TABLE (community_id uuid, community_label text, size integer, members jsonb)
LANGUAGE sql STABLE AS $$
  WITH RECURSIVE seeds AS (
    SELECT n.id FROM public.woic_graph_entities n WHERE n.agency_id = _agency_id
  ),
  walk AS (
    SELECT s.id AS root, s.id AS node_id, 0 AS depth FROM seeds s
    UNION
    SELECT w.root, CASE WHEN e.from_id = w.node_id THEN e.to_id ELSE e.from_id END, w.depth + 1
    FROM walk w
    JOIN public.woic_graph_edges e
      ON (e.from_id = w.node_id OR e.to_id = w.node_id) AND e.agency_id = _agency_id
     AND e.valid_to IS NULL AND (_relations IS NULL OR e.relation = ANY(_relations))
    WHERE w.depth < LEAST(GREATEST(_max_depth,1), 4)
  ),
  comp AS (
    SELECT root, MIN(node_id::text)::uuid AS community_id, ARRAY_AGG(DISTINCT node_id) AS nodes
    FROM walk GROUP BY root
  ),
  grouped AS (
    SELECT community_id, ARRAY_AGG(DISTINCT nid) AS nodes
    FROM comp, LATERAL unnest(comp.nodes) AS nid
    GROUP BY community_id
  )
  SELECT g.community_id,
         (SELECT n.label FROM public.woic_graph_entities n WHERE n.id = g.community_id) AS community_label,
         CARDINALITY(g.nodes) AS size,
         (SELECT jsonb_agg(jsonb_build_object('id', n.id, 'label', n.label, 'entity_type', n.entity_type))
          FROM public.woic_graph_entities n WHERE n.id = ANY(g.nodes) AND n.agency_id = _agency_id) AS members
  FROM grouped g
  WHERE CARDINALITY(g.nodes) > 1
  ORDER BY size DESC
  LIMIT GREATEST(LEAST(_limit, 100), 1);
$$;

-- Risk propagation from a source node, decaying by hop.
CREATE OR REPLACE FUNCTION public.woic_graph_risk_propagation(
  _agency_id uuid, _node_id uuid, _depth integer DEFAULT 3, _decay numeric DEFAULT 0.55)
RETURNS TABLE (node_id uuid, label text, entity_type text, depth integer, risk numeric, via text)
LANGUAGE sql STABLE AS $$
  SELECT nb.node_id, nb.label, nb.entity_type, nb.depth,
         ROUND(POWER(GREATEST(LEAST(_decay, 0.99), 0.05), nb.depth)::numeric * COALESCE(nb.weight, 1), 4) AS risk,
         nb.via
  FROM public.woic_graph_neighbors(_agency_id, _node_id, _depth, NULL, NULL, 500) nb
  WHERE nb.depth > 0
  ORDER BY risk DESC;
$$;

-- Subgraph extraction for the visualization layer (nodes + edges in one call).
CREATE OR REPLACE FUNCTION public.woic_graph_subgraph(
  _agency_id uuid, _entity_types text[] DEFAULT NULL, _relations text[] DEFAULT NULL,
  _as_of timestamptz DEFAULT NULL, _limit integer DEFAULT 400)
RETURNS jsonb
LANGUAGE sql STABLE AS $$
  WITH t AS (SELECT COALESCE(_as_of, now()) AS ts),
  nodes AS (
    SELECT n.id, n.label, n.entity_type, n.attributes, n.weight
    FROM public.woic_graph_entities n, t
    WHERE n.agency_id = _agency_id
      AND (_entity_types IS NULL OR n.entity_type = ANY(_entity_types))
      AND n.valid_from <= t.ts AND (n.valid_to IS NULL OR n.valid_to > t.ts)
    ORDER BY n.weight DESC NULLS LAST, n.updated_at DESC
    LIMIT GREATEST(LEAST(_limit, 2000), 1)
  ),
  edges AS (
    SELECT e.id, e.from_id, e.to_id, e.relation, e.weight, e.confidence
    FROM public.woic_graph_edges e, t
    WHERE e.agency_id = _agency_id
      AND e.from_id IN (SELECT id FROM nodes) AND e.to_id IN (SELECT id FROM nodes)
      AND (_relations IS NULL OR e.relation = ANY(_relations))
      AND e.valid_from <= t.ts AND (e.valid_to IS NULL OR e.valid_to > t.ts)
    LIMIT 4000
  )
  SELECT jsonb_build_object(
    'nodes', COALESCE((SELECT jsonb_agg(to_jsonb(n)) FROM nodes n), '[]'::jsonb),
    'edges', COALESCE((SELECT jsonb_agg(to_jsonb(e)) FROM edges e), '[]'::jsonb)
  );
$$;

REVOKE ALL ON FUNCTION public.woic_graph_neighbors(uuid,uuid,integer,text[],timestamptz,integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.woic_graph_shortest_path(uuid,uuid,uuid,integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.woic_graph_similar(uuid,uuid,text,text[],integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.woic_graph_influence(uuid,text,integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.woic_graph_communities(uuid,text[],integer,integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.woic_graph_risk_propagation(uuid,uuid,integer,numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.woic_graph_subgraph(uuid,text[],text[],timestamptz,integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.woic_graph_neighbors(uuid,uuid,integer,text[],timestamptz,integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.woic_graph_shortest_path(uuid,uuid,uuid,integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.woic_graph_similar(uuid,uuid,text,text[],integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.woic_graph_influence(uuid,text,integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.woic_graph_communities(uuid,text[],integer,integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.woic_graph_risk_propagation(uuid,uuid,integer,numeric) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.woic_graph_subgraph(uuid,text[],text[],timestamptz,integer) TO authenticated, service_role;
