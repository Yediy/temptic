
DO $$
DECLARE new_roles text[] := ARRAY['agency_owner','recruiter','account_manager','onboarding_specialist','compliance_specialist','scheduler','payroll_specialist','billing_specialist','client_hiring_manager','client_supervisor','candidate']; r text;
BEGIN
  FOREACH r IN ARRAY new_roles LOOP
    BEGIN EXECUTE format('ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS %L', r);
    EXCEPTION WHEN others THEN NULL; END;
  END LOOP;
END $$;

CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE IF NOT EXISTS public.role_permissions (
  role public.app_role NOT NULL,
  module text NOT NULL,
  actions text[] NOT NULL DEFAULT ARRAY['view']::text[],
  PRIMARY KEY (role, module)
);
GRANT SELECT ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "role_permissions_read_all" ON public.role_permissions;
CREATE POLICY "role_permissions_read_all" ON public.role_permissions FOR SELECT TO authenticated USING (true);

INSERT INTO public.role_permissions(role, module, actions) VALUES
  ('super_admin','command_center', ARRAY['view','manage']),('super_admin','talent',ARRAY['view','manage']),
  ('super_admin','jobs',ARRAY['view','manage']),('super_admin','onboarding',ARRAY['view','manage']),
  ('super_admin','compliance',ARRAY['view','manage']),('super_admin','training',ARRAY['view','manage']),
  ('super_admin','scheduling',ARRAY['view','manage']),('super_admin','tickets',ARRAY['view','manage']),
  ('super_admin','timecards',ARRAY['view','manage']),('super_admin','payroll',ARRAY['view','manage']),
  ('super_admin','billing',ARRAY['view','manage']),('super_admin','clients',ARRAY['view','manage']),
  ('super_admin','ai_center',ARRAY['view','manage']),('super_admin','reports',ARRAY['view','manage']),
  ('super_admin','network',ARRAY['view','manage']),('super_admin','settings',ARRAY['view','manage']),
  ('agency_admin','command_center',ARRAY['view','manage']),('agency_admin','talent',ARRAY['view','manage']),
  ('agency_admin','jobs',ARRAY['view','manage']),('agency_admin','onboarding',ARRAY['view','manage']),
  ('agency_admin','compliance',ARRAY['view','manage']),('agency_admin','training',ARRAY['view','manage']),
  ('agency_admin','scheduling',ARRAY['view','manage']),('agency_admin','tickets',ARRAY['view','manage']),
  ('agency_admin','timecards',ARRAY['view','manage']),('agency_admin','payroll',ARRAY['view','manage']),
  ('agency_admin','billing',ARRAY['view','manage']),('agency_admin','clients',ARRAY['view','manage']),
  ('agency_admin','ai_center',ARRAY['view']),('agency_admin','reports',ARRAY['view']),
  ('agency_admin','network',ARRAY['view']),('agency_admin','settings',ARRAY['view','manage']),
  ('dispatcher','command_center',ARRAY['view']),('dispatcher','tickets',ARRAY['view','manage']),
  ('dispatcher','scheduling',ARRAY['view','manage']),('dispatcher','talent',ARRAY['view']),
  ('dispatcher','clients',ARRAY['view']),
  ('payroll','command_center',ARRAY['view']),('payroll','timecards',ARRAY['view','manage']),
  ('payroll','payroll',ARRAY['view','manage']),('payroll','billing',ARRAY['view']),('payroll','reports',ARRAY['view']),
  ('viewer','command_center',ARRAY['view']),('viewer','tickets',ARRAY['view']),('viewer','reports',ARRAY['view'])
ON CONFLICT (role, module) DO NOTHING;

CREATE OR REPLACE FUNCTION public.has_module_access(_user_id uuid, _module text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles ur JOIN public.role_permissions rp ON rp.role = ur.role WHERE ur.user_id = _user_id AND rp.module = _module);
$$;
REVOKE EXECUTE ON FUNCTION public.has_module_access(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_module_access(uuid, text) TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE,
  name text NOT NULL, category text, is_global boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS skills_agency_name_uidx ON public.skills (COALESCE(agency_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.skills TO authenticated;
GRANT ALL ON public.skills TO service_role;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "skills_read" ON public.skills;
CREATE POLICY "skills_read" ON public.skills FOR SELECT TO authenticated
  USING (is_global = true OR agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "skills_write_agency" ON public.skills;
CREATE POLICY "skills_write_agency" ON public.skills FOR ALL TO authenticated
  USING (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid()))
  WITH CHECK (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.worker_profiles (
  worker_id uuid PRIMARY KEY REFERENCES public.workers(id) ON DELETE CASCADE,
  preferred_name text, general_location text, travel_radius_miles integer, transportation_status text,
  desired_pay_min numeric(10,2), desired_pay_max numeric(10,2), years_experience integer,
  languages text[] DEFAULT ARRAY[]::text[], trade_specialties text[] DEFAULT ARRAY[]::text[],
  preferred_industries text[] DEFAULT ARRAY[]::text[], preferred_job_types text[] DEFAULT ARRAY[]::text[],
  shift_preferences text[] DEFAULT ARRAY[]::text[], availability_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  rehire_eligible boolean, bio text, completion_score integer NOT NULL DEFAULT 0,
  completion_updated_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.worker_profiles TO authenticated;
GRANT ALL ON public.worker_profiles TO service_role;
ALTER TABLE public.worker_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wp_agency_all" ON public.worker_profiles;
CREATE POLICY "wp_agency_all" ON public.worker_profiles FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workers w WHERE w.id = worker_id AND w.agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workers w WHERE w.id = worker_id AND w.agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid())));
DROP POLICY IF EXISTS "wp_self_read_update" ON public.worker_profiles;
CREATE POLICY "wp_self_read_update" ON public.worker_profiles FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workers w WHERE w.id = worker_id AND w.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workers w WHERE w.id = worker_id AND w.user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.employment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  employer text NOT NULL, role text, started_on date, ended_on date,
  is_current boolean NOT NULL DEFAULT false, location text, description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS eh_worker_idx ON public.employment_history(worker_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employment_history TO authenticated;
GRANT ALL ON public.employment_history TO service_role;
ALTER TABLE public.employment_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "eh_agency_or_self" ON public.employment_history;
CREATE POLICY "eh_agency_or_self" ON public.employment_history FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workers w WHERE w.id = worker_id AND (w.user_id = auth.uid() OR w.agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workers w WHERE w.id = worker_id AND (w.user_id = auth.uid() OR w.agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid()))));

CREATE TABLE IF NOT EXISTS public.worker_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  proficiency text CHECK (proficiency IN ('beginner','intermediate','advanced','expert')),
  years_experience integer, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (worker_id, skill_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.worker_skills TO authenticated;
GRANT ALL ON public.worker_skills TO service_role;
ALTER TABLE public.worker_skills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ws_agency_or_self" ON public.worker_skills;
CREATE POLICY "ws_agency_or_self" ON public.worker_skills FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workers w WHERE w.id = worker_id AND (w.user_id = auth.uid() OR w.agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workers w WHERE w.id = worker_id AND (w.user_id = auth.uid() OR w.agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid()))));

CREATE TABLE IF NOT EXISTS public.credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE,
  name text NOT NULL, category text,
  requires_expiration boolean NOT NULL DEFAULT true, is_global boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.credentials TO authenticated;
GRANT ALL ON public.credentials TO service_role;
ALTER TABLE public.credentials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cred_read" ON public.credentials;
CREATE POLICY "cred_read" ON public.credentials FOR SELECT TO authenticated
  USING (is_global = true OR agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "cred_write_agency" ON public.credentials;
CREATE POLICY "cred_write_agency" ON public.credentials FOR ALL TO authenticated
  USING (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid()))
  WITH CHECK (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.worker_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  credential_id uuid REFERENCES public.credentials(id) ON DELETE SET NULL,
  name text NOT NULL, issuer text, issued_on date, expires_on date,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','expired','rejected')),
  document_path text, notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wc_worker_idx ON public.worker_credentials(worker_id);
CREATE INDEX IF NOT EXISTS wc_expires_idx ON public.worker_credentials(expires_on);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.worker_credentials TO authenticated;
GRANT ALL ON public.worker_credentials TO service_role;
ALTER TABLE public.worker_credentials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wc_agency_or_self" ON public.worker_credentials;
CREATE POLICY "wc_agency_or_self" ON public.worker_credentials FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workers w WHERE w.id = worker_id AND (w.user_id = auth.uid() OR w.agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workers w WHERE w.id = worker_id AND (w.user_id = auth.uid() OR w.agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid()))));

CREATE TABLE IF NOT EXISTS public.worker_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  name text NOT NULL, relationship text, phone text, email text, employer text, notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wref_worker_idx ON public.worker_references(worker_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.worker_references TO authenticated;
GRANT ALL ON public.worker_references TO service_role;
ALTER TABLE public.worker_references ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wref_agency_or_self" ON public.worker_references;
CREATE POLICY "wref_agency_or_self" ON public.worker_references FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workers w WHERE w.id = worker_id AND (w.user_id = auth.uid() OR w.agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workers w WHERE w.id = worker_id AND (w.user_id = auth.uid() OR w.agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid()))));

CREATE TABLE IF NOT EXISTS public.worker_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  doc_type text NOT NULL, file_name text NOT NULL, storage_path text NOT NULL,
  mime_type text, size_bytes bigint, is_sensitive boolean NOT NULL DEFAULT false,
  uploaded_by uuid, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wdoc_worker_idx ON public.worker_documents(worker_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.worker_documents TO authenticated;
GRANT ALL ON public.worker_documents TO service_role;
ALTER TABLE public.worker_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wdoc_agency_or_self" ON public.worker_documents;
CREATE POLICY "wdoc_agency_or_self" ON public.worker_documents FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workers w WHERE w.id = worker_id AND (w.user_id = auth.uid() OR w.agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workers w WHERE w.id = worker_id AND (w.user_id = auth.uid() OR w.agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid()))));

CREATE TABLE IF NOT EXISTS public.resume_parse_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  document_id uuid REFERENCES public.worker_documents(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','ready','applied','rejected','failed')),
  provider text NOT NULL DEFAULT 'mock', suggestions jsonb NOT NULL DEFAULT '{}'::jsonb,
  applied_fields jsonb NOT NULL DEFAULT '{}'::jsonb, error text, created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rpr_worker_idx ON public.resume_parse_runs(worker_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resume_parse_runs TO authenticated;
GRANT ALL ON public.resume_parse_runs TO service_role;
ALTER TABLE public.resume_parse_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rpr_agency_or_self" ON public.resume_parse_runs;
CREATE POLICY "rpr_agency_or_self" ON public.resume_parse_runs FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workers w WHERE w.id = worker_id AND (w.user_id = auth.uid() OR w.agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workers w WHERE w.id = worker_id AND (w.user_id = auth.uid() OR w.agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid()))));

CREATE TABLE IF NOT EXISTS public.emergency_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  name text NOT NULL, relationship text, phone text NOT NULL, email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.emergency_contacts TO authenticated;
GRANT ALL ON public.emergency_contacts TO service_role;
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ec_agency_or_self" ON public.emergency_contacts;
CREATE POLICY "ec_agency_or_self" ON public.emergency_contacts FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workers w WHERE w.id = worker_id AND (w.user_id = auth.uid() OR w.agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workers w WHERE w.id = worker_id AND (w.user_id = auth.uid() OR w.agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid()))));

CREATE TABLE IF NOT EXISTS public.eeo_demographics (
  worker_id uuid PRIMARY KEY REFERENCES public.workers(id) ON DELETE CASCADE,
  race text, ethnicity text, gender text, veteran_status text, disability_status text,
  date_of_birth date, submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.eeo_demographics TO authenticated;
GRANT ALL ON public.eeo_demographics TO service_role;
ALTER TABLE public.eeo_demographics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "eeo_self_insert" ON public.eeo_demographics;
CREATE POLICY "eeo_self_insert" ON public.eeo_demographics FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.workers w WHERE w.id = worker_id AND w.user_id = auth.uid()));
DROP POLICY IF EXISTS "eeo_self_update" ON public.eeo_demographics;
CREATE POLICY "eeo_self_update" ON public.eeo_demographics FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workers w WHERE w.id = worker_id AND w.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workers w WHERE w.id = worker_id AND w.user_id = auth.uid()));
-- Compliance role check uses text cast to avoid new-enum-in-same-txn error
DROP POLICY IF EXISTS "eeo_compliance_read" ON public.eeo_demographics;
CREATE POLICY "eeo_compliance_read" ON public.eeo_demographics FOR SELECT TO authenticated
  USING (
    private.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text = 'compliance_specialist')
    OR EXISTS (SELECT 1 FROM public.workers w WHERE w.id = worker_id AND w.user_id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS public.organization_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  name text NOT NULL, address_line1 text, address_line2 text, city text, state text,
  postal_code text, country text DEFAULT 'US', is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_locations TO authenticated;
GRANT ALL ON public.organization_locations TO service_role;
ALTER TABLE public.organization_locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "orgloc_agency" ON public.organization_locations;
CREATE POLICY "orgloc_agency" ON public.organization_locations FOR ALL TO authenticated
  USING (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid()))
  WITH CHECK (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.automation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL, agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE,
  entity_type text, entity_id uuid, actor_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb, processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ae_type_idx ON public.automation_events(event_type);
CREATE INDEX IF NOT EXISTS ae_agency_idx ON public.automation_events(agency_id);
CREATE INDEX IF NOT EXISTS ae_unprocessed_idx ON public.automation_events(created_at) WHERE processed_at IS NULL;
GRANT SELECT ON public.automation_events TO authenticated;
GRANT ALL ON public.automation_events TO service_role;
ALTER TABLE public.automation_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ae_agency_read" ON public.automation_events;
CREATE POLICY "ae_agency_read" ON public.automation_events FOR SELECT TO authenticated
  USING (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid()) OR private.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE OR REPLACE FUNCTION private.emit_automation_event(_event_type text, _agency_id uuid, _entity_type text, _entity_id uuid, _actor_id uuid, _payload jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  INSERT INTO public.automation_events(event_type, agency_id, entity_type, entity_id, actor_id, payload)
  VALUES (_event_type, _agency_id, _entity_type, _entity_id, _actor_id, COALESCE(_payload, '{}'::jsonb))
  RETURNING id INTO _id;
  RETURN _id;
END $$;
REVOKE EXECUTE ON FUNCTION private.emit_automation_event(text, uuid, text, uuid, uuid, jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.tg_worker_profile_events() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _agency uuid;
BEGIN
  SELECT agency_id INTO _agency FROM public.workers WHERE id = NEW.worker_id;
  PERFORM private.emit_automation_event(
    CASE WHEN TG_OP = 'INSERT' THEN 'profile.created' ELSE 'profile.updated' END,
    _agency, 'worker_profile', NEW.worker_id, NULL, jsonb_build_object('completion_score', NEW.completion_score)
  );
  IF NEW.completion_score >= 100 AND (TG_OP='INSERT' OR OLD.completion_score < 100) THEN
    PERFORM private.emit_automation_event('profile.completed', _agency, 'worker_profile', NEW.worker_id, NULL, '{}'::jsonb);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_worker_profile_events ON public.worker_profiles;
CREATE TRIGGER trg_worker_profile_events AFTER INSERT OR UPDATE ON public.worker_profiles
FOR EACH ROW EXECUTE FUNCTION private.tg_worker_profile_events();

CREATE OR REPLACE FUNCTION private.tg_set_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_wp_updated ON public.worker_profiles;
CREATE TRIGGER trg_wp_updated BEFORE UPDATE ON public.worker_profiles FOR EACH ROW EXECUTE FUNCTION private.tg_set_updated_at();
DROP TRIGGER IF EXISTS trg_wc_updated ON public.worker_credentials;
CREATE TRIGGER trg_wc_updated BEFORE UPDATE ON public.worker_credentials FOR EACH ROW EXECUTE FUNCTION private.tg_set_updated_at();
DROP TRIGGER IF EXISTS trg_rpr_updated ON public.resume_parse_runs;
CREATE TRIGGER trg_rpr_updated BEFORE UPDATE ON public.resume_parse_runs FOR EACH ROW EXECUTE FUNCTION private.tg_set_updated_at();
DROP TRIGGER IF EXISTS trg_eeo_updated ON public.eeo_demographics;
CREATE TRIGGER trg_eeo_updated BEFORE UPDATE ON public.eeo_demographics FOR EACH ROW EXECUTE FUNCTION private.tg_set_updated_at();
