
-- Events
CREATE TABLE public.ttos_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  module text NOT NULL,
  name text NOT NULL,
  actor_id uuid,
  entity_type text,
  entity_id uuid,
  status text NOT NULL DEFAULT 'emitted',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  related_objects jsonb NOT NULL DEFAULT '[]'::jsonb,
  correlation_id uuid,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.ttos_events TO authenticated;
GRANT ALL ON public.ttos_events TO service_role;
ALTER TABLE public.ttos_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events_select_by_agency" ON public.ttos_events FOR SELECT TO authenticated
  USING (agency_id IN (SELECT private.current_user_agency_ids()));
CREATE POLICY "events_insert_by_agency" ON public.ttos_events FOR INSERT TO authenticated
  WITH CHECK (agency_id IN (SELECT private.current_user_agency_ids()));
CREATE POLICY "events_service_all" ON public.ttos_events FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE INDEX ttos_events_agency_created_idx ON public.ttos_events (agency_id, created_at DESC);
CREATE INDEX ttos_events_entity_idx ON public.ttos_events (entity_type, entity_id);
CREATE INDEX ttos_events_name_idx ON public.ttos_events (name);
CREATE INDEX ttos_events_unprocessed_idx ON public.ttos_events (created_at) WHERE processed_at IS NULL;

CREATE TABLE public.ttos_event_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module text NOT NULL,
  event_pattern text NOT NULL,
  handler_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_pattern, handler_key)
);
GRANT SELECT ON public.ttos_event_subscribers TO authenticated;
GRANT ALL ON public.ttos_event_subscribers TO service_role;
ALTER TABLE public.ttos_event_subscribers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subs_read_all_auth" ON public.ttos_event_subscribers FOR SELECT TO authenticated USING (true);
CREATE POLICY "subs_service_all" ON public.ttos_event_subscribers FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE public.ttos_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid,
  kind text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'queued',
  attempts int NOT NULL DEFAULT 0,
  max_attempts int NOT NULL DEFAULT 5,
  run_after timestamptz NOT NULL DEFAULT now(),
  locked_by text,
  locked_until timestamptz,
  last_error text,
  result jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ttos_jobs TO authenticated;
GRANT ALL ON public.ttos_jobs TO service_role;
ALTER TABLE public.ttos_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jobs_select_by_agency" ON public.ttos_jobs FOR SELECT TO authenticated
  USING (agency_id IS NULL OR agency_id IN (SELECT private.current_user_agency_ids()));
CREATE POLICY "jobs_service_all" ON public.ttos_jobs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE INDEX ttos_jobs_queue_idx ON public.ttos_jobs (status, run_after) WHERE status IN ('queued','failed');

CREATE TABLE public.ttos_automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  trigger_event text NOT NULL,
  conditions jsonb NOT NULL DEFAULT '[]'::jsonb,
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  priority int NOT NULL DEFAULT 100,
  enabled boolean NOT NULL DEFAULT true,
  retries int NOT NULL DEFAULT 3,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ttos_automations TO authenticated;
GRANT ALL ON public.ttos_automations TO service_role;
ALTER TABLE public.ttos_automations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auto_select_by_agency" ON public.ttos_automations FOR SELECT TO authenticated
  USING (agency_id IN (SELECT private.current_user_agency_ids()));
CREATE POLICY "auto_write_admin" ON public.ttos_automations FOR ALL TO authenticated
  USING (agency_id IN (SELECT private.current_user_agency_ids()) AND private.has_role(auth.uid(), 'agency_admin'::app_role))
  WITH CHECK (agency_id IN (SELECT private.current_user_agency_ids()) AND private.has_role(auth.uid(), 'agency_admin'::app_role));
CREATE POLICY "auto_service_all" ON public.ttos_automations FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE public.ttos_automation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id uuid NOT NULL REFERENCES public.ttos_automations(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.ttos_events(id) ON DELETE SET NULL,
  agency_id uuid NOT NULL,
  status text NOT NULL,
  attempts int NOT NULL DEFAULT 1,
  error text,
  output jsonb,
  ran_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ttos_automation_runs TO authenticated;
GRANT ALL ON public.ttos_automation_runs TO service_role;
ALTER TABLE public.ttos_automation_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "runs_select_by_agency" ON public.ttos_automation_runs FOR SELECT TO authenticated
  USING (agency_id IN (SELECT private.current_user_agency_ids()));
CREATE POLICY "runs_service_all" ON public.ttos_automation_runs FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE public.ttos_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  owner_id uuid,
  entity_type text,
  entity_id uuid,
  due_at timestamptz,
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  dependencies uuid[] NOT NULL DEFAULT '{}',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ttos_tasks TO authenticated;
GRANT ALL ON public.ttos_tasks TO service_role;
ALTER TABLE public.ttos_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tasks_agency_rw" ON public.ttos_tasks FOR ALL TO authenticated
  USING (agency_id IN (SELECT private.current_user_agency_ids()))
  WITH CHECK (agency_id IN (SELECT private.current_user_agency_ids()));
CREATE POLICY "tasks_service_all" ON public.ttos_tasks FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE INDEX ttos_tasks_agency_status_idx ON public.ttos_tasks (agency_id, status, due_at);

CREATE TABLE public.ttos_ai_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  run_id uuid REFERENCES public.ai_runs(id) ON DELETE SET NULL,
  kind text NOT NULL,
  recommendation jsonb NOT NULL,
  confidence numeric,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  reviewer_id uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.ttos_ai_decisions TO authenticated;
GRANT ALL ON public.ttos_ai_decisions TO service_role;
ALTER TABLE public.ttos_ai_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aid_select_by_agency" ON public.ttos_ai_decisions FOR SELECT TO authenticated
  USING (agency_id IN (SELECT private.current_user_agency_ids()));
CREATE POLICY "aid_update_admin" ON public.ttos_ai_decisions FOR UPDATE TO authenticated
  USING (agency_id IN (SELECT private.current_user_agency_ids()) AND private.has_role(auth.uid(), 'agency_admin'::app_role))
  WITH CHECK (agency_id IN (SELECT private.current_user_agency_ids()));
CREATE POLICY "aid_service_all" ON public.ttos_ai_decisions FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE public.ttos_org_settings (
  agency_id uuid PRIMARY KEY,
  branding jsonb NOT NULL DEFAULT '{}'::jsonb,
  notifications jsonb NOT NULL DEFAULT '{}'::jsonb,
  automation_defaults jsonb NOT NULL DEFAULT '{}'::jsonb,
  approval_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  payroll_defaults jsonb NOT NULL DEFAULT '{}'::jsonb,
  compliance_defaults jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  document_retention jsonb NOT NULL DEFAULT '{}'::jsonb,
  security_policies jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.ttos_org_settings TO authenticated;
GRANT ALL ON public.ttos_org_settings TO service_role;
ALTER TABLE public.ttos_org_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_select_by_agency" ON public.ttos_org_settings FOR SELECT TO authenticated
  USING (agency_id IN (SELECT private.current_user_agency_ids()));
CREATE POLICY "settings_write_admin" ON public.ttos_org_settings FOR ALL TO authenticated
  USING (agency_id IN (SELECT private.current_user_agency_ids()) AND private.has_role(auth.uid(), 'agency_admin'::app_role))
  WITH CHECK (agency_id IN (SELECT private.current_user_agency_ids()) AND private.has_role(auth.uid(), 'agency_admin'::app_role));
CREATE POLICY "settings_service_all" ON public.ttos_org_settings FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE public.ttos_message_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  subject text,
  participants uuid[] NOT NULL DEFAULT '{}',
  last_message_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.ttos_message_threads TO authenticated;
GRANT ALL ON public.ttos_message_threads TO service_role;
ALTER TABLE public.ttos_message_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "threads_participant_select" ON public.ttos_message_threads FOR SELECT TO authenticated
  USING (auth.uid() = ANY (participants) AND agency_id IN (SELECT private.current_user_agency_ids()));
CREATE POLICY "threads_insert_creator" ON public.ttos_message_threads FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = ANY (participants) AND agency_id IN (SELECT private.current_user_agency_ids()));
CREATE POLICY "threads_service_all" ON public.ttos_message_threads FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE public.ttos_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.ttos_message_threads(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  body text NOT NULL,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  read_by uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.ttos_messages TO authenticated;
GRANT ALL ON public.ttos_messages TO service_role;
ALTER TABLE public.ttos_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "msgs_participant_select" ON public.ttos_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ttos_message_threads t WHERE t.id = thread_id AND auth.uid() = ANY (t.participants)));
CREATE POLICY "msgs_participant_insert" ON public.ttos_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND EXISTS (SELECT 1 FROM public.ttos_message_threads t WHERE t.id = thread_id AND auth.uid() = ANY (t.participants)));
CREATE POLICY "msgs_participant_update_read" ON public.ttos_messages FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ttos_message_threads t WHERE t.id = thread_id AND auth.uid() = ANY (t.participants)));
CREATE POLICY "msgs_service_all" ON public.ttos_messages FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE INDEX ttos_messages_thread_idx ON public.ttos_messages (thread_id, created_at);

CREATE TABLE public.ttos_notification_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL,
  channel text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  attempts int NOT NULL DEFAULT 0,
  last_error text,
  delivered_at timestamptz,
  opened_at timestamptz,
  acknowledged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ttos_notification_deliveries TO authenticated;
GRANT ALL ON public.ttos_notification_deliveries TO service_role;
ALTER TABLE public.ttos_notification_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deliv_select_by_agency" ON public.ttos_notification_deliveries FOR SELECT TO authenticated
  USING (agency_id IN (SELECT private.current_user_agency_ids()));
CREATE POLICY "deliv_service_all" ON public.ttos_notification_deliveries FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE public.ttos_search_index (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  title text NOT NULL,
  subtitle text,
  body text,
  tags text[] NOT NULL DEFAULT '{}',
  tsv tsvector,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_type, entity_id)
);
GRANT SELECT ON public.ttos_search_index TO authenticated;
GRANT ALL ON public.ttos_search_index TO service_role;
ALTER TABLE public.ttos_search_index ENABLE ROW LEVEL SECURITY;
CREATE POLICY "search_select_by_agency" ON public.ttos_search_index FOR SELECT TO authenticated
  USING (agency_id IN (SELECT private.current_user_agency_ids()));
CREATE POLICY "search_service_all" ON public.ttos_search_index FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.ttos_search_index_tsv() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.tsv :=
    setweight(to_tsvector('simple', coalesce(NEW.title,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.subtitle,'')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.body,'')), 'C') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(NEW.tags, ' '), '')), 'B');
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER ttos_search_index_tsv_trg BEFORE INSERT OR UPDATE ON public.ttos_search_index
  FOR EACH ROW EXECUTE FUNCTION public.ttos_search_index_tsv();
CREATE INDEX ttos_search_tsv_idx ON public.ttos_search_index USING GIN (tsv);
CREATE INDEX ttos_search_agency_idx ON public.ttos_search_index (agency_id, entity_type);

CREATE OR REPLACE VIEW public.ttos_timeline AS
SELECT e.id, e.agency_id, e.entity_type, e.entity_id, e.module, e.name, e.actor_id, e.metadata, e.created_at
FROM public.ttos_events e
WHERE e.entity_type IS NOT NULL AND e.entity_id IS NOT NULL;
GRANT SELECT ON public.ttos_timeline TO authenticated, service_role;

CREATE OR REPLACE VIEW public.ttos_calendar AS
SELECT s.id, s.agency_id, 'shift'::text AS kind,
       (s.shift_date::timestamptz + coalesce(s.start_time, '00:00'::time)) AS start_at,
       (s.shift_date::timestamptz + coalesce(s.end_time, '23:59'::time)) AS end_at,
       s.id AS entity_id, 'shift'::text AS entity_type,
       'Shift' AS title
FROM public.shifts s
UNION ALL
SELECT wc.id, w.agency_id, 'credential_expiry'::text,
       wc.expires_on::timestamptz, wc.expires_on::timestamptz,
       wc.id, 'worker_credential'::text,
       'Credential expires: ' || coalesce(wc.name, 'credential')
FROM public.worker_credentials wc
JOIN public.workers w ON w.id = wc.worker_id
WHERE wc.expires_on IS NOT NULL
UNION ALL
SELECT te.id, te.agency_id, 'training_due'::text, te.expires_at, te.expires_at,
       te.id, 'training_enrollment'::text,
       'Training expires'
FROM public.training_enrollments te
WHERE te.expires_at IS NOT NULL
UNION ALL
SELECT t.id, t.agency_id, 'ticket_work_date'::text,
       (t.work_date::timestamptz), (t.work_date::timestamptz + interval '1 day'),
       t.id, 'ticket'::text,
       'Ticket ' || coalesce(t.ticket_number, '')
FROM public.tickets t
WHERE t.work_date IS NOT NULL;
GRANT SELECT ON public.ttos_calendar TO authenticated, service_role;

CREATE TRIGGER ttos_automations_updated BEFORE UPDATE ON public.ttos_automations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER ttos_tasks_updated BEFORE UPDATE ON public.ttos_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER ttos_org_settings_updated BEFORE UPDATE ON public.ttos_org_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER ttos_jobs_updated BEFORE UPDATE ON public.ttos_jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.ttos_event_subscribers (module, event_pattern, handler_key) VALUES
  ('automations', '*', 'run_automations'),
  ('search',      '*', 'reindex_entity'),
  ('audit',       '*', 'append_audit')
ON CONFLICT DO NOTHING;
