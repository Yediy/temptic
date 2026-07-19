CREATE TABLE public.workforce_passports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL UNIQUE REFERENCES public.workers(id) ON DELETE CASCADE,
  legal_name text, preferred_name text, avatar_url text, date_of_birth date,
  govid_status text NOT NULL DEFAULT 'unverified',
  right_to_work_status text NOT NULL DEFAULT 'unverified',
  identity_verification_status text NOT NULL DEFAULT 'unverified',
  military_status text, veteran_status boolean DEFAULT false,
  accessibility_accommodations text,
  address_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  languages text[] NOT NULL DEFAULT '{}',
  completion_score int NOT NULL DEFAULT 0,
  compliance_score int NOT NULL DEFAULT 0,
  skill_score int NOT NULL DEFAULT 0,
  reputation_score numeric(4,2) NOT NULL DEFAULT 0,
  career_score numeric(4,2) NOT NULL DEFAULT 0,
  availability_status text NOT NULL DEFAULT 'unknown',
  public_profile boolean NOT NULL DEFAULT false,
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.workforce_passports TO authenticated;
GRANT ALL ON public.workforce_passports TO service_role;
ALTER TABLE public.workforce_passports ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.passport_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  passport_id uuid NOT NULL REFERENCES public.workforce_passports(id) ON DELETE CASCADE,
  grantee_type text NOT NULL CHECK (grantee_type IN ('agency','user','external')),
  grantee_id uuid, share_token_hash text,
  scopes text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('pending','active','revoked','expired')),
  requested_by uuid, approved_by uuid,
  granted_at timestamptz, expires_at timestamptz, revoked_at timestamptz,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX passport_permissions_passport_idx ON public.passport_permissions(passport_id);
CREATE INDEX passport_permissions_grantee_idx ON public.passport_permissions(grantee_type, grantee_id);
GRANT SELECT, INSERT, UPDATE ON public.passport_permissions TO authenticated;
GRANT ALL ON public.passport_permissions TO service_role;
ALTER TABLE public.passport_permissions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION private.passport_owner_user_id(_passport_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT w.user_id FROM public.workforce_passports p
  JOIN public.workers w ON w.id = p.worker_id WHERE p.id = _passport_id
$$;
REVOKE ALL ON FUNCTION private.passport_owner_user_id(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.has_passport_access(_passport_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    (private.passport_owner_user_id(_passport_id) = _user_id)
    OR private.has_role(_user_id, 'super_admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.passport_permissions pp
      JOIN public.agency_members am ON am.agency_id = pp.grantee_id
        AND am.user_id = _user_id AND am.is_active = true
      WHERE pp.passport_id = _passport_id AND pp.grantee_type = 'agency'
        AND pp.status = 'active'
        AND (pp.expires_at IS NULL OR pp.expires_at > now())
        AND pp.revoked_at IS NULL
    )
    OR EXISTS (
      SELECT 1 FROM public.passport_permissions pp
      WHERE pp.passport_id = _passport_id AND pp.grantee_type = 'user'
        AND pp.grantee_id = _user_id AND pp.status = 'active'
        AND (pp.expires_at IS NULL OR pp.expires_at > now())
        AND pp.revoked_at IS NULL
    )
$$;
REVOKE ALL ON FUNCTION private.has_passport_access(uuid, uuid) FROM PUBLIC, anon, authenticated;

CREATE POLICY "Workers view own passport" ON public.workforce_passports FOR SELECT TO authenticated
  USING (private.has_passport_access(id, auth.uid()));
CREATE POLICY "Workers update own passport" ON public.workforce_passports FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workers w WHERE w.id = worker_id AND w.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workers w WHERE w.id = worker_id AND w.user_id = auth.uid()));
CREATE POLICY "Workers insert own passport" ON public.workforce_passports FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.workers w WHERE w.id = worker_id AND w.user_id = auth.uid()));

CREATE POLICY "Passport participants view permissions" ON public.passport_permissions FOR SELECT TO authenticated
  USING (
    private.passport_owner_user_id(passport_id) = auth.uid()
    OR private.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR (grantee_type = 'agency' AND EXISTS (
      SELECT 1 FROM public.agency_members am
      WHERE am.agency_id = grantee_id AND am.user_id = auth.uid() AND am.is_active = true
    ))
    OR (grantee_type = 'user' AND grantee_id = auth.uid())
  );
CREATE POLICY "Owners manage permissions" ON public.passport_permissions FOR ALL TO authenticated
  USING (private.passport_owner_user_id(passport_id) = auth.uid())
  WITH CHECK (private.passport_owner_user_id(passport_id) = auth.uid());
CREATE POLICY "Agencies can request access" ON public.passport_permissions FOR INSERT TO authenticated
  WITH CHECK (
    grantee_type = 'agency' AND status = 'pending'
    AND EXISTS (SELECT 1 FROM public.agency_members am
      WHERE am.agency_id = grantee_id AND am.user_id = auth.uid() AND am.is_active = true)
  );

CREATE TABLE public.identity_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  passport_id uuid NOT NULL REFERENCES public.workforce_passports(id) ON DELETE CASCADE,
  method text NOT NULL CHECK (method IN ('govid','ssn','address','biometric','right_to_work','background')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','failed','expired')),
  verifier text, evidence_ref text,
  verified_at timestamptz, expires_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.identity_verifications TO authenticated;
GRANT ALL ON public.identity_verifications TO service_role;
ALTER TABLE public.identity_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Passport access controls identity" ON public.identity_verifications FOR SELECT TO authenticated
  USING (private.has_passport_access(passport_id, auth.uid()));
CREATE POLICY "Owners manage identity verifications" ON public.identity_verifications FOR ALL TO authenticated
  USING (private.passport_owner_user_id(passport_id) = auth.uid())
  WITH CHECK (private.passport_owner_user_id(passport_id) = auth.uid());

CREATE TABLE public.passport_compliance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  passport_id uuid NOT NULL REFERENCES public.workforce_passports(id) ON DELETE CASCADE,
  requirement_type text NOT NULL, label text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','complete','expired','waived','failed')),
  completed_at timestamptz, expires_at timestamptz,
  document_id uuid REFERENCES public.worker_documents(id) ON DELETE SET NULL,
  notes text, metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.passport_compliance TO authenticated;
GRANT ALL ON public.passport_compliance TO service_role;
ALTER TABLE public.passport_compliance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Passport access controls compliance" ON public.passport_compliance FOR SELECT TO authenticated
  USING (private.has_passport_access(passport_id, auth.uid()));
CREATE POLICY "Owners manage compliance" ON public.passport_compliance FOR ALL TO authenticated
  USING (private.passport_owner_user_id(passport_id) = auth.uid())
  WITH CHECK (private.passport_owner_user_id(passport_id) = auth.uid());

CREATE TABLE public.passport_reputation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  passport_id uuid NOT NULL REFERENCES public.workforce_passports(id) ON DELETE CASCADE,
  category text NOT NULL,
  score numeric(4,2) NOT NULL DEFAULT 0,
  sample_size int NOT NULL DEFAULT 0,
  source text,
  agency_id uuid REFERENCES public.agencies(id) ON DELETE SET NULL,
  disputed boolean NOT NULL DEFAULT false,
  dispute_reason text,
  last_computed_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.passport_reputation TO authenticated;
GRANT ALL ON public.passport_reputation TO service_role;
ALTER TABLE public.passport_reputation ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Passport access controls reputation" ON public.passport_reputation FOR SELECT TO authenticated
  USING (private.has_passport_access(passport_id, auth.uid()));
CREATE POLICY "Owners can dispute reputation" ON public.passport_reputation FOR UPDATE TO authenticated
  USING (private.passport_owner_user_id(passport_id) = auth.uid())
  WITH CHECK (private.passport_owner_user_id(passport_id) = auth.uid());

CREATE TABLE public.passport_portfolios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  passport_id uuid NOT NULL REFERENCES public.workforce_passports(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('project','photo','video','reference','recommendation','achievement','case_study')),
  title text NOT NULL, description text,
  media_url text, external_url text,
  is_public boolean NOT NULL DEFAULT false,
  order_index int NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.passport_portfolios TO authenticated;
GRANT ALL ON public.passport_portfolios TO service_role;
ALTER TABLE public.passport_portfolios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public portfolio items visible" ON public.passport_portfolios FOR SELECT TO authenticated
  USING (is_public = true OR private.has_passport_access(passport_id, auth.uid()));
CREATE POLICY "Owners manage portfolio" ON public.passport_portfolios FOR ALL TO authenticated
  USING (private.passport_owner_user_id(passport_id) = auth.uid())
  WITH CHECK (private.passport_owner_user_id(passport_id) = auth.uid());

CREATE TABLE public.passport_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  passport_id uuid NOT NULL REFERENCES public.workforce_passports(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_date timestamptz NOT NULL DEFAULT now(),
  title text NOT NULL, description text,
  ref_table text, ref_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX passport_timeline_passport_date_idx ON public.passport_timeline(passport_id, event_date DESC);
GRANT SELECT, INSERT ON public.passport_timeline TO authenticated;
GRANT ALL ON public.passport_timeline TO service_role;
ALTER TABLE public.passport_timeline ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Passport access controls timeline" ON public.passport_timeline FOR SELECT TO authenticated
  USING (private.has_passport_access(passport_id, auth.uid()));
CREATE POLICY "Owners insert timeline" ON public.passport_timeline FOR INSERT TO authenticated
  WITH CHECK (private.passport_owner_user_id(passport_id) = auth.uid());

CREATE TABLE public.passport_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  passport_id uuid NOT NULL REFERENCES public.workforce_passports(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('job','assignment','training','certification','career_path','mentor','education')),
  title text NOT NULL, description text,
  ref_table text, ref_id uuid,
  score numeric(4,2) NOT NULL DEFAULT 0,
  reasoning text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','saved','dismissed','applied')),
  expires_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.passport_opportunities TO authenticated;
GRANT ALL ON public.passport_opportunities TO service_role;
ALTER TABLE public.passport_opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Passport access controls opportunities" ON public.passport_opportunities FOR SELECT TO authenticated
  USING (private.has_passport_access(passport_id, auth.uid()));
CREATE POLICY "Owners update opportunities" ON public.passport_opportunities FOR UPDATE TO authenticated
  USING (private.passport_owner_user_id(passport_id) = auth.uid())
  WITH CHECK (private.passport_owner_user_id(passport_id) = auth.uid());

CREATE TABLE public.career_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  passport_id uuid NOT NULL REFERENCES public.workforce_passports(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('career','training','certification','skill','income','next_best_action')),
  title text NOT NULL, description text,
  priority int NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'woic',
  woic_recommendation_id uuid REFERENCES public.woic_recommendations(id) ON DELETE SET NULL,
  actioned_at timestamptz, dismissed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.career_recommendations TO authenticated;
GRANT ALL ON public.career_recommendations TO service_role;
ALTER TABLE public.career_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Passport access controls career recs" ON public.career_recommendations FOR SELECT TO authenticated
  USING (private.has_passport_access(passport_id, auth.uid()));
CREATE POLICY "Owners action career recs" ON public.career_recommendations FOR UPDATE TO authenticated
  USING (private.passport_owner_user_id(passport_id) = auth.uid())
  WITH CHECK (private.passport_owner_user_id(passport_id) = auth.uid());

CREATE TABLE public.passport_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  passport_id uuid NOT NULL REFERENCES public.workforce_passports(id) ON DELETE CASCADE,
  actor_id uuid, actor_type text NOT NULL DEFAULT 'user',
  action text NOT NULL, resource text,
  ip_address inet, user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX passport_access_log_passport_idx ON public.passport_access_log(passport_id, created_at DESC);
GRANT SELECT, INSERT ON public.passport_access_log TO authenticated;
GRANT ALL ON public.passport_access_log TO service_role;
ALTER TABLE public.passport_access_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner sees own access log" ON public.passport_access_log FOR SELECT TO authenticated
  USING (private.passport_owner_user_id(passport_id) = auth.uid() OR private.has_role(auth.uid(), 'super_admin'::public.app_role));
CREATE POLICY "Anyone with access can log" ON public.passport_access_log FOR INSERT TO authenticated
  WITH CHECK (private.has_passport_access(passport_id, auth.uid()));

CREATE TRIGGER update_workforce_passports_updated_at BEFORE UPDATE ON public.workforce_passports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_passport_permissions_updated_at BEFORE UPDATE ON public.passport_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_identity_verifications_updated_at BEFORE UPDATE ON public.identity_verifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_passport_compliance_updated_at BEFORE UPDATE ON public.passport_compliance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_passport_reputation_updated_at BEFORE UPDATE ON public.passport_reputation
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_passport_portfolios_updated_at BEFORE UPDATE ON public.passport_portfolios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_passport_opportunities_updated_at BEFORE UPDATE ON public.passport_opportunities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_career_recommendations_updated_at BEFORE UPDATE ON public.career_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.ensure_workforce_passport()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.workforce_passports (worker_id, legal_name, preferred_name)
  VALUES (NEW.id, COALESCE(NEW.first_name,'') || ' ' || COALESCE(NEW.last_name,''), NEW.first_name)
  ON CONFLICT (worker_id) DO NOTHING;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_ensure_workforce_passport
  AFTER INSERT ON public.workers
  FOR EACH ROW EXECUTE FUNCTION public.ensure_workforce_passport();

INSERT INTO public.workforce_passports (worker_id, legal_name, preferred_name)
SELECT w.id, COALESCE(w.first_name,'') || ' ' || COALESCE(w.last_name,''), w.first_name
FROM public.workers w
LEFT JOIN public.workforce_passports p ON p.worker_id = w.id
WHERE p.id IS NULL;
