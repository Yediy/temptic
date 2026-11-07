CREATE TABLE public.event_replay_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  actor_id uuid NOT NULL,
  actor_roles text[] NOT NULL DEFAULT '{}',
  mode text NOT NULL,
  dry_run boolean NOT NULL,
  selector jsonb NOT NULL DEFAULT '{}',
  event_ids uuid[] NOT NULL DEFAULT '{}',
  plan_hash text,
  impact jsonb NOT NULL DEFAULT '{}',
  confirmed boolean NOT NULL DEFAULT false,
  status text NOT NULL,
  replayed_event_ids uuid[] NOT NULL DEFAULT '{}',
  error text,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.event_replay_runs TO authenticated;
GRANT ALL ON public.event_replay_runs TO service_role;
ALTER TABLE public.event_replay_runs ENABLE ROW LEVEL SECURITY;
CREATE INDEX event_replay_runs_agency_idx ON public.event_replay_runs (agency_id, created_at DESC);

CREATE POLICY event_replay_runs_read ON public.event_replay_runs
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin')
  OR EXISTS (
    SELECT 1 FROM public.agency_members m
    WHERE m.user_id = auth.uid() AND m.agency_id = event_replay_runs.agency_id
      AND m.is_active AND m.role::text IN ('agency_owner','agency_admin')
  )
);