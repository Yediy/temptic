CREATE TABLE public.ttos_action_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  correlation_id uuid NOT NULL,
  fingerprint text NOT NULL,
  conflict_key text,
  automation_id uuid,
  event_id uuid,
  priority integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (correlation_id, fingerprint)
);
CREATE INDEX ON public.ttos_action_ledger(correlation_id, conflict_key);
CREATE INDEX ON public.ttos_action_ledger(agency_id, created_at DESC);
GRANT SELECT ON public.ttos_action_ledger TO authenticated;
GRANT ALL ON public.ttos_action_ledger TO service_role;
ALTER TABLE public.ttos_action_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agency members read action ledger" ON public.ttos_action_ledger FOR SELECT TO authenticated
USING (private.has_role(auth.uid(),'super_admin') OR EXISTS (SELECT 1 FROM agency_members am WHERE am.agency_id = ttos_action_ledger.agency_id AND am.user_id = auth.uid() AND am.is_active));