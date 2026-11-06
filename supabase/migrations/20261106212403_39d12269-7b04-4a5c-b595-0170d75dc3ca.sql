CREATE TABLE public.security_findings (
  internal_id text PRIMARY KEY,
  scanner text NOT NULL,
  level text NOT NULL,
  name text NOT NULL,
  description text,
  category text,
  subject text,
  status text NOT NULL CHECK (status IN ('remaining','ignored','fixed')),
  first_seen_at timestamptz,
  last_seen_at timestamptz,
  fixed_at timestamptz,
  synced_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.security_findings TO authenticated;
GRANT ALL ON public.security_findings TO service_role;
ALTER TABLE public.security_findings ENABLE ROW LEVEL SECURITY;
CREATE POLICY security_findings_super_admin_read ON public.security_findings
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'super_admin'::app_role));

CREATE TABLE public.security_scan_runs (
  scanner text PRIMARY KEY,
  scanned_at timestamptz,
  completion_status text,
  finding_count int NOT NULL DEFAULT 0,
  synced_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.security_scan_runs TO authenticated;
GRANT ALL ON public.security_scan_runs TO service_role;
ALTER TABLE public.security_scan_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY security_scan_runs_super_admin_read ON public.security_scan_runs
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'super_admin'::app_role));