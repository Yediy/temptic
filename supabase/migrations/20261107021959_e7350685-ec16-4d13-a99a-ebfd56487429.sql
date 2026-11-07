CREATE TABLE public.woic_access_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid,
  actor_id uuid,
  actor_roles text[] NOT NULL DEFAULT '{}',
  function_name text NOT NULL,
  operation text NOT NULL,
  module text,
  resource text,
  access text,
  decision text NOT NULL,
  reason text,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.woic_access_audit TO authenticated;
GRANT ALL ON public.woic_access_audit TO service_role;
ALTER TABLE public.woic_access_audit ENABLE ROW LEVEL SECURITY;
CREATE INDEX woic_access_audit_agency_idx ON public.woic_access_audit (agency_id, created_at DESC);
CREATE INDEX woic_access_audit_actor_idx ON public.woic_access_audit (actor_id, created_at DESC);

CREATE POLICY woic_access_audit_read ON public.woic_access_audit
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin')
  OR EXISTS (
    SELECT 1 FROM public.agency_members m
    WHERE m.user_id = auth.uid() AND m.agency_id = woic_access_audit.agency_id
      AND m.is_active AND m.role::text IN ('agency_owner','agency_admin','compliance_specialist')
  )
);