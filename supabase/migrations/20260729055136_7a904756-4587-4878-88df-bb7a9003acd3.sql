
-- 1. Extend ttos_automations
ALTER TABLE public.ttos_automations
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS template_id uuid,
  ADD COLUMN IF NOT EXISTS require_approval boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS last_run_at timestamptz,
  ADD COLUMN IF NOT EXISTS success_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS failure_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.ttos_automation_runs
  ADD COLUMN IF NOT EXISTS next_retry_at timestamptz,
  ADD COLUMN IF NOT EXISTS duration_ms integer,
  ADD COLUMN IF NOT EXISTS triggered_by text;

-- 2. automation_templates (global catalog)
CREATE TABLE IF NOT EXISTS public.automation_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  category text NOT NULL,
  description text,
  trigger_event text NOT NULL,
  conditions jsonb NOT NULL DEFAULT '[]'::jsonb,
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  tags text[] NOT NULL DEFAULT '{}',
  icon text,
  is_builtin boolean NOT NULL DEFAULT true,
  created_by uuid,
  agency_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.automation_templates TO authenticated;
GRANT ALL ON public.automation_templates TO service_role;
ALTER TABLE public.automation_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "automation_templates_read_all"
  ON public.automation_templates FOR SELECT TO authenticated
  USING (is_builtin = true OR agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "automation_templates_admin_write"
  ON public.automation_templates FOR ALL TO authenticated
  USING (agency_id IS NOT NULL AND private.has_role(auth.uid(), 'agency_admin'::public.app_role))
  WITH CHECK (agency_id IS NOT NULL AND private.has_role(auth.uid(), 'agency_admin'::public.app_role));

-- 3. automation_agents (per-agency AI agent registry)
CREATE TABLE IF NOT EXISTS public.automation_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  name text NOT NULL,
  role text NOT NULL,
  description text,
  model text NOT NULL DEFAULT 'google/gemini-2.5-flash',
  system_prompt text NOT NULL,
  tools jsonb NOT NULL DEFAULT '[]'::jsonb,
  memory jsonb NOT NULL DEFAULT '{}'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.automation_agents TO authenticated;
GRANT ALL ON public.automation_agents TO service_role;
ALTER TABLE public.automation_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "automation_agents_read"
  ON public.automation_agents FOR SELECT TO authenticated
  USING (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "automation_agents_admin_write"
  ON public.automation_agents FOR ALL TO authenticated
  USING (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid() AND is_active = true) AND private.has_role(auth.uid(), 'agency_admin'::public.app_role))
  WITH CHECK (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid() AND is_active = true) AND private.has_role(auth.uid(), 'agency_admin'::public.app_role));

-- 4. automation_agent_runs
CREATE TABLE IF NOT EXISTS public.automation_agent_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  agent_id uuid NOT NULL REFERENCES public.automation_agents(id) ON DELETE CASCADE,
  automation_id uuid,
  event_id uuid,
  input jsonb NOT NULL DEFAULT '{}'::jsonb,
  output jsonb,
  status text NOT NULL DEFAULT 'running',
  error text,
  tokens_used integer,
  duration_ms integer,
  correlation_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.automation_agent_runs TO authenticated;
GRANT ALL ON public.automation_agent_runs TO service_role;
ALTER TABLE public.automation_agent_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "automation_agent_runs_read"
  ON public.automation_agent_runs FOR SELECT TO authenticated
  USING (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid() AND is_active = true));

-- 5. automation_dead_letter
CREATE TABLE IF NOT EXISTS public.automation_dead_letter (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  source_kind text NOT NULL,
  source_id uuid,
  automation_id uuid,
  event_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text,
  attempts integer NOT NULL DEFAULT 0,
  resolved_at timestamptz,
  resolved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.automation_dead_letter TO authenticated;
GRANT ALL ON public.automation_dead_letter TO service_role;
ALTER TABLE public.automation_dead_letter ENABLE ROW LEVEL SECURITY;
CREATE POLICY "automation_dead_letter_read"
  ON public.automation_dead_letter FOR SELECT TO authenticated
  USING (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "automation_dead_letter_admin_resolve"
  ON public.automation_dead_letter FOR UPDATE TO authenticated
  USING (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid() AND is_active = true) AND private.has_role(auth.uid(), 'agency_admin'::public.app_role))
  WITH CHECK (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid() AND is_active = true) AND private.has_role(auth.uid(), 'agency_admin'::public.app_role));

-- 6. Realtime for the live monitor
ALTER PUBLICATION supabase_realtime ADD TABLE public.ttos_automation_runs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ttos_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.automation_agent_runs;

-- 7. Indexes
CREATE INDEX IF NOT EXISTS idx_automation_templates_category ON public.automation_templates(category);
CREATE INDEX IF NOT EXISTS idx_automation_agent_runs_agency_created ON public.automation_agent_runs(agency_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_dead_letter_agency ON public.automation_dead_letter(agency_id, created_at DESC) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ttos_automation_runs_agency_ran ON public.ttos_automation_runs(agency_id, ran_at DESC);

-- 8. updated_at triggers
CREATE TRIGGER trg_automation_templates_updated BEFORE UPDATE ON public.automation_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_automation_agents_updated BEFORE UPDATE ON public.automation_agents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 9. Seed built-in templates
INSERT INTO public.automation_templates (slug, name, category, description, trigger_event, conditions, actions, tags, icon) VALUES
('rapid-onboarding', 'Rapid Onboarding', 'onboarding', 'Auto-start onboarding checklist when a worker is created.', 'worker.created', '[]', '[{"type":"create_task","title":"Complete onboarding checklist","priority":"high"},{"type":"notify","title":"New worker","body":"Onboarding started","level":"medium"}]', ARRAY['workers','onboarding'], 'user-plus'),
('same-day-placement', 'Same-Day Placement', 'placement', 'Notify recruiter and dispatch when a job order is filled the same day it opens.', 'job.created', '[{"field":"priority","op":"eq","value":"urgent"}]', '[{"type":"notify","title":"Urgent job order","body":"Dispatch immediately","level":"high"},{"type":"emit_event","name":"placement.rapid.requested"}]', ARRAY['jobs','placement'], 'zap'),
('certification-renewal', 'Certification Renewal', 'compliance', 'Alert workers and admins 30 days before a credential expires.', 'credential.expiring', '[]', '[{"type":"notify","title":"Certification expiring soon","level":"high"},{"type":"create_task","title":"Renew certification","priority":"high"}]', ARRAY['compliance','credentials'], 'shield-alert'),
('worker-recall', 'Worker Recall', 'placement', 'Contact previously-placed workers when a matching job opens.', 'job.created', '[]', '[{"type":"emit_event","name":"recall.candidates.suggested"},{"type":"notify","title":"Recall candidates available"}]', ARRAY['placement','recruit'], 'rotate-cw'),
('interview-scheduling', 'Interview Scheduling', 'recruit', 'Create a calendar event and notify both parties when an interview is booked.', 'interview.scheduled', '[]', '[{"type":"notify","title":"Interview scheduled"},{"type":"emit_event","name":"calendar.event.create"}]', ARRAY['recruit','calendar'], 'calendar'),
('payroll-processing', 'Payroll Processing', 'payroll', 'Generate payroll after time tickets are approved.', 'ticket.approved', '[]', '[{"type":"emit_event","name":"payroll.batch.generate"},{"type":"notify","title":"Payroll ready to process"}]', ARRAY['payroll'], 'dollar-sign'),
('compliance-monitoring', 'Compliance Monitoring', 'compliance', 'Escalate compliance failures to admins immediately.', 'compliance.violation', '[]', '[{"type":"notify","title":"Compliance violation","level":"high"},{"type":"create_task","title":"Investigate compliance issue","priority":"high"}]', ARRAY['compliance','safety'], 'shield'),
('training-assignment', 'Training Assignment', 'training', 'Enroll a worker in required training on placement.', 'placement.created', '[]', '[{"type":"emit_event","name":"training.enroll.required"},{"type":"notify","title":"Required training assigned"}]', ARRAY['training'], 'book-open'),
('client-follow-up', 'Client Follow-Up', 'client', 'Send a follow-up 7 days after job order completion.', 'job.closed', '[]', '[{"type":"notify","title":"Client follow-up due","level":"medium"}]', ARRAY['client','crm'], 'message-circle'),
('candidate-reengagement', 'Candidate Re-Engagement', 'recruit', 'Re-engage candidates inactive for 60+ days.', 'candidate.dormant', '[]', '[{"type":"notify","title":"Re-engage candidate"},{"type":"create_task","title":"Reach out to dormant candidate"}]', ARRAY['recruit'], 'refresh-cw'),
('executive-reporting', 'Executive Reporting', 'analytics', 'Generate weekly executive summary.', 'schedule.weekly', '[]', '[{"type":"emit_event","name":"report.executive.generate"},{"type":"notify","title":"Executive report ready"}]', ARRAY['analytics','reporting'], 'bar-chart'),
('incident-escalation', 'Incident Escalation', 'safety', 'Escalate safety incidents to admins and on-call staff.', 'incident.reported', '[]', '[{"type":"notify","title":"Safety incident reported","level":"high"},{"type":"create_task","title":"Investigate incident","priority":"high"}]', ARRAY['safety','compliance'], 'alert-triangle'),
('document-expiration', 'Document Expiration', 'compliance', 'Alert 15 days before a document expires.', 'document.expiring', '[]', '[{"type":"notify","title":"Document expiring","level":"high"}]', ARRAY['compliance','documents'], 'file-warning'),
('assignment-completion', 'Assignment Completion', 'placement', 'Notify client and start close-out on assignment completion.', 'assignment.completed', '[]', '[{"type":"notify","title":"Assignment completed"},{"type":"emit_event","name":"assignment.closeout.start"}]', ARRAY['placement'], 'check-circle'),
('rehire-workflow', 'Rehire Workflow', 'recruit', 'Fast-track rehire onboarding for former workers.', 'worker.rehire.requested', '[]', '[{"type":"emit_event","name":"onboarding.fasttrack.start"},{"type":"notify","title":"Rehire fast-track started"}]', ARRAY['recruit','onboarding'], 'user-check')
ON CONFLICT (slug) DO NOTHING;
