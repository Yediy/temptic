
-- =========================================================================
-- IWOS 4.7 — Client Collaboration Operating Profile
-- Additive migration. No existing systems modified except one security fix
-- on public.eeo_demographics.
-- =========================================================================

-- ---------- ENUMS ---------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.cc_user_role AS ENUM (
    'corporate_admin','branch_manager','hiring_manager',
    'project_manager','finance','read_only','custom'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.cc_thread_kind AS ENUM ('agency','worker','group');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.cc_doc_category AS ENUM (
    'contract','msa','sow','insurance','compliance','invoice','safety','training','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.cc_request_kind AS ENUM (
    'additional_workers','replacement','schedule_change',
    'payroll_question','billing_question','compliance_review','general'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.cc_request_status AS ENUM ('open','in_progress','resolved','closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- HELPER: check if auth.uid() is a member of an agency -----------
-- Reuses existing agency_members. Predicate inlined to keep RLS fast and
-- avoid introducing new SECURITY DEFINER surface.

-- ---------- cc_client_users ------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cc_client_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.cc_user_role NOT NULL DEFAULT 'read_only',
  custom_permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cc_client_users TO authenticated;
GRANT ALL ON public.cc_client_users TO service_role;
ALTER TABLE public.cc_client_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ccu_agency_all" ON public.cc_client_users FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.agency_members am WHERE am.user_id = auth.uid() AND am.agency_id = cc_client_users.agency_id AND am.is_active))
WITH CHECK (EXISTS (SELECT 1 FROM public.agency_members am WHERE am.user_id = auth.uid() AND am.agency_id = cc_client_users.agency_id AND am.is_active));

CREATE POLICY "ccu_self_read" ON public.cc_client_users FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "ccu_corp_admin_manage" ON public.cc_client_users FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.cc_client_users me WHERE me.client_id = cc_client_users.client_id AND me.user_id = auth.uid() AND me.role = 'corporate_admin' AND me.status = 'active'))
WITH CHECK (EXISTS (SELECT 1 FROM public.cc_client_users me WHERE me.client_id = cc_client_users.client_id AND me.user_id = auth.uid() AND me.role = 'corporate_admin' AND me.status = 'active'));

-- ---------- cc_workspaces --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cc_workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL UNIQUE REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cc_workspaces TO authenticated;
GRANT ALL ON public.cc_workspaces TO service_role;
ALTER TABLE public.cc_workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ccw_agency_all" ON public.cc_workspaces FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.agency_members am WHERE am.user_id = auth.uid() AND am.agency_id = cc_workspaces.agency_id AND am.is_active))
WITH CHECK (EXISTS (SELECT 1 FROM public.agency_members am WHERE am.user_id = auth.uid() AND am.agency_id = cc_workspaces.agency_id AND am.is_active));

CREATE POLICY "ccw_client_read" ON public.cc_workspaces FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.cc_client_users u WHERE u.client_id = cc_workspaces.client_id AND u.user_id = auth.uid() AND u.status = 'active'));

-- ---------- cc_permissions -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cc_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  role public.cc_user_role NOT NULL,
  module TEXT NOT NULL,
  actions TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id, role, module)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cc_permissions TO authenticated;
GRANT ALL ON public.cc_permissions TO service_role;
ALTER TABLE public.cc_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ccp_agency_all" ON public.cc_permissions FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.agency_members am WHERE am.user_id = auth.uid() AND am.agency_id = cc_permissions.agency_id AND am.is_active))
WITH CHECK (EXISTS (SELECT 1 FROM public.agency_members am WHERE am.user_id = auth.uid() AND am.agency_id = cc_permissions.agency_id AND am.is_active));

CREATE POLICY "ccp_client_read" ON public.cc_permissions FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.cc_client_users u WHERE u.client_id = cc_permissions.client_id AND u.user_id = auth.uid() AND u.status = 'active'));

-- ---------- cc_threads -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cc_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  kind public.cc_thread_kind NOT NULL DEFAULT 'agency',
  subject TEXT,
  participants JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_message_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cc_threads TO authenticated;
GRANT ALL ON public.cc_threads TO service_role;
ALTER TABLE public.cc_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cct_agency_all" ON public.cc_threads FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.agency_members am WHERE am.user_id = auth.uid() AND am.agency_id = cc_threads.agency_id AND am.is_active))
WITH CHECK (EXISTS (SELECT 1 FROM public.agency_members am WHERE am.user_id = auth.uid() AND am.agency_id = cc_threads.agency_id AND am.is_active));

CREATE POLICY "cct_client_rw" ON public.cc_threads FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.cc_client_users u WHERE u.client_id = cc_threads.client_id AND u.user_id = auth.uid() AND u.status = 'active'))
WITH CHECK (EXISTS (SELECT 1 FROM public.cc_client_users u WHERE u.client_id = cc_threads.client_id AND u.user_id = auth.uid() AND u.status = 'active'));

-- ---------- cc_messages ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cc_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  thread_id UUID NOT NULL REFERENCES public.cc_threads(id) ON DELETE CASCADE,
  sender_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_kind TEXT NOT NULL DEFAULT 'agency',
  body TEXT NOT NULL,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  read_by JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cc_messages TO authenticated;
GRANT ALL ON public.cc_messages TO service_role;
ALTER TABLE public.cc_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ccm_agency_all" ON public.cc_messages FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.agency_members am WHERE am.user_id = auth.uid() AND am.agency_id = cc_messages.agency_id AND am.is_active))
WITH CHECK (EXISTS (SELECT 1 FROM public.agency_members am WHERE am.user_id = auth.uid() AND am.agency_id = cc_messages.agency_id AND am.is_active));

CREATE POLICY "ccm_client_rw" ON public.cc_messages FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.cc_client_users u WHERE u.client_id = cc_messages.client_id AND u.user_id = auth.uid() AND u.status = 'active'))
WITH CHECK (EXISTS (SELECT 1 FROM public.cc_client_users u WHERE u.client_id = cc_messages.client_id AND u.user_id = auth.uid() AND u.status = 'active'));

CREATE INDEX IF NOT EXISTS idx_cc_messages_thread ON public.cc_messages(thread_id, created_at DESC);

-- ---------- cc_documents ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cc_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  category public.cc_doc_category NOT NULL DEFAULT 'other',
  name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  parent_id UUID REFERENCES public.cc_documents(id) ON DELETE SET NULL,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cc_documents TO authenticated;
GRANT ALL ON public.cc_documents TO service_role;
ALTER TABLE public.cc_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ccd_agency_all" ON public.cc_documents FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.agency_members am WHERE am.user_id = auth.uid() AND am.agency_id = cc_documents.agency_id AND am.is_active))
WITH CHECK (EXISTS (SELECT 1 FROM public.agency_members am WHERE am.user_id = auth.uid() AND am.agency_id = cc_documents.agency_id AND am.is_active));

CREATE POLICY "ccd_client_read" ON public.cc_documents FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.cc_client_users u WHERE u.client_id = cc_documents.client_id AND u.user_id = auth.uid() AND u.status = 'active'));

CREATE POLICY "ccd_client_insert" ON public.cc_documents FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.cc_client_users u WHERE u.client_id = cc_documents.client_id AND u.user_id = auth.uid() AND u.status = 'active'));

-- ---------- cc_notifications -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.cc_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  severity TEXT NOT NULL DEFAULT 'info',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cc_notifications TO authenticated;
GRANT ALL ON public.cc_notifications TO service_role;
ALTER TABLE public.cc_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ccn_agency_all" ON public.cc_notifications FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.agency_members am WHERE am.user_id = auth.uid() AND am.agency_id = cc_notifications.agency_id AND am.is_active))
WITH CHECK (EXISTS (SELECT 1 FROM public.agency_members am WHERE am.user_id = auth.uid() AND am.agency_id = cc_notifications.agency_id AND am.is_active));

CREATE POLICY "ccn_user_rw" ON public.cc_notifications FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_cc_notifications_user_unread ON public.cc_notifications(user_id, read_at, created_at DESC);

-- ---------- cc_requests ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cc_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  kind public.cc_request_kind NOT NULL DEFAULT 'general',
  subject TEXT NOT NULL,
  body TEXT,
  status public.cc_request_status NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'normal',
  assignee_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cc_requests TO authenticated;
GRANT ALL ON public.cc_requests TO service_role;
ALTER TABLE public.cc_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ccr_agency_all" ON public.cc_requests FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.agency_members am WHERE am.user_id = auth.uid() AND am.agency_id = cc_requests.agency_id AND am.is_active))
WITH CHECK (EXISTS (SELECT 1 FROM public.agency_members am WHERE am.user_id = auth.uid() AND am.agency_id = cc_requests.agency_id AND am.is_active));

CREATE POLICY "ccr_client_rw" ON public.cc_requests FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.cc_client_users u WHERE u.client_id = cc_requests.client_id AND u.user_id = auth.uid() AND u.status = 'active'))
WITH CHECK (EXISTS (SELECT 1 FROM public.cc_client_users u WHERE u.client_id = cc_requests.client_id AND u.user_id = auth.uid() AND u.status = 'active'));

-- ---------- cc_activities --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cc_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_kind TEXT NOT NULL DEFAULT 'system',
  verb TEXT NOT NULL,
  object_type TEXT,
  object_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.cc_activities TO authenticated;
GRANT ALL ON public.cc_activities TO service_role;
ALTER TABLE public.cc_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cca_agency_read" ON public.cc_activities FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.agency_members am WHERE am.user_id = auth.uid() AND am.agency_id = cc_activities.agency_id AND am.is_active));

CREATE POLICY "cca_client_read" ON public.cc_activities FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.cc_client_users u WHERE u.client_id = cc_activities.client_id AND u.user_id = auth.uid() AND u.status = 'active'));

CREATE POLICY "cca_insert" ON public.cc_activities FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.agency_members am WHERE am.user_id = auth.uid() AND am.agency_id = cc_activities.agency_id AND am.is_active)
  OR EXISTS (SELECT 1 FROM public.cc_client_users u WHERE u.client_id = cc_activities.client_id AND u.user_id = auth.uid() AND u.status = 'active')
);

CREATE INDEX IF NOT EXISTS idx_cc_activities_client_recent ON public.cc_activities(client_id, created_at DESC);

-- ---------- cc_analytics_snapshots -----------------------------------------
CREATE TABLE IF NOT EXISTS public.cc_analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cc_analytics_snapshots TO authenticated;
GRANT ALL ON public.cc_analytics_snapshots TO service_role;
ALTER TABLE public.cc_analytics_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ccas_agency_all" ON public.cc_analytics_snapshots FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.agency_members am WHERE am.user_id = auth.uid() AND am.agency_id = cc_analytics_snapshots.agency_id AND am.is_active))
WITH CHECK (EXISTS (SELECT 1 FROM public.agency_members am WHERE am.user_id = auth.uid() AND am.agency_id = cc_analytics_snapshots.agency_id AND am.is_active));

CREATE POLICY "ccas_client_read" ON public.cc_analytics_snapshots FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.cc_client_users u WHERE u.client_id = cc_analytics_snapshots.client_id AND u.user_id = auth.uid() AND u.status = 'active'));

-- ---------- cc_settings ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cc_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL UNIQUE REFERENCES public.clients(id) ON DELETE CASCADE,
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  notification_prefs JSONB NOT NULL DEFAULT '{}'::jsonb,
  branding JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cc_settings TO authenticated;
GRANT ALL ON public.cc_settings TO service_role;
ALTER TABLE public.cc_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ccs_agency_all" ON public.cc_settings FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.agency_members am WHERE am.user_id = auth.uid() AND am.agency_id = cc_settings.agency_id AND am.is_active))
WITH CHECK (EXISTS (SELECT 1 FROM public.agency_members am WHERE am.user_id = auth.uid() AND am.agency_id = cc_settings.agency_id AND am.is_active));

CREATE POLICY "ccs_client_read" ON public.cc_settings FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.cc_client_users u WHERE u.client_id = cc_settings.client_id AND u.user_id = auth.uid() AND u.status = 'active'));

-- ---------- cc_audit_logs (append-only) ------------------------------------
CREATE TABLE IF NOT EXISTS public.cc_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  ip TEXT,
  user_agent TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.cc_audit_logs TO authenticated;
GRANT ALL ON public.cc_audit_logs TO service_role;
ALTER TABLE public.cc_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ccal_agency_read" ON public.cc_audit_logs FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.agency_members am WHERE am.user_id = auth.uid() AND am.agency_id = cc_audit_logs.agency_id AND am.is_active));

CREATE POLICY "ccal_insert" ON public.cc_audit_logs FOR INSERT TO authenticated
WITH CHECK (
  actor_user_id = auth.uid() AND (
    EXISTS (SELECT 1 FROM public.agency_members am WHERE am.user_id = auth.uid() AND am.agency_id = cc_audit_logs.agency_id AND am.is_active)
    OR EXISTS (SELECT 1 FROM public.cc_client_users u WHERE u.client_id = cc_audit_logs.client_id AND u.user_id = auth.uid() AND u.status = 'active')
  )
);
-- deliberately no UPDATE or DELETE policies => immutable

-- ---------- updated_at trigger reuse ---------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'cc_client_users','cc_workspaces','cc_permissions','cc_threads',
    'cc_documents','cc_requests','cc_settings'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%1$s_updated ON public.%1$s', t);
    EXECUTE format('CREATE TRIGGER trg_%1$s_updated BEFORE UPDATE ON public.%1$s FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t);
  END LOOP;
END $$;

-- ---------- Realtime -------------------------------------------------------
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.cc_messages;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.cc_notifications;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.cc_activities;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;

-- =========================================================================
-- SECURITY FIX: EEO demographics — scope compliance read to same agency
-- Prior policy allowed any 'compliance_specialist' role to read across agencies.
-- =========================================================================
DROP POLICY IF EXISTS "eeo_compliance_read" ON public.eeo_demographics;
CREATE POLICY "eeo_compliance_read" ON public.eeo_demographics FOR SELECT TO authenticated
USING (
  private.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR EXISTS (
    SELECT 1
    FROM public.workers w
    JOIN public.agency_members am ON am.agency_id = w.agency_id
    JOIN public.user_roles ur    ON ur.user_id   = am.user_id
    WHERE w.id = eeo_demographics.worker_id
      AND am.user_id = auth.uid()
      AND am.is_active
      AND ur.role = 'compliance_specialist'::public.app_role
  )
);
