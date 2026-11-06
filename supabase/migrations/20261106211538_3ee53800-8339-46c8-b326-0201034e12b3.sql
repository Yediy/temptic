CREATE TABLE public.pb_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid,
  actor_id uuid,
  actor_roles text[] NOT NULL DEFAULT '{}',
  function_name text NOT NULL,
  action text NOT NULL,
  decision text NOT NULL CHECK (decision IN ('allowed','denied','error')),
  reason text,
  subject_type text,
  subject_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pb_audit_events TO authenticated;
GRANT ALL ON public.pb_audit_events TO service_role;
ALTER TABLE public.pb_audit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY pb_audit_read_admins ON public.pb_audit_events FOR SELECT TO authenticated
USING (
  private.has_role(auth.uid(), 'super_admin'::app_role)
  OR (private.has_role(auth.uid(), 'agency_admin'::app_role)
      AND agency_id IN (SELECT am.agency_id FROM public.agency_members am WHERE am.user_id = auth.uid() AND am.is_active))
);
CREATE INDEX pb_audit_events_agency_created_idx ON public.pb_audit_events (agency_id, created_at DESC);