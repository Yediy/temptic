
CREATE TABLE public.ttos_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  title text NOT NULL,
  body text,
  level text NOT NULL DEFAULT 'medium',
  entity_type text,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.ttos_notifications TO authenticated;
GRANT ALL ON public.ttos_notifications TO service_role;
ALTER TABLE public.ttos_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ttosn_select_own" ON public.ttos_notifications FOR SELECT TO authenticated
  USING (recipient_id = auth.uid());
CREATE POLICY "ttosn_update_own_read" ON public.ttos_notifications FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());
CREATE POLICY "ttosn_service_all" ON public.ttos_notifications FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE INDEX ttos_notifications_recipient_idx ON public.ttos_notifications (recipient_id, created_at DESC);
