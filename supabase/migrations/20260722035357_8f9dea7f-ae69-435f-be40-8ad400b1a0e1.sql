
-- passport_sharing
CREATE TABLE public.passport_sharing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passport_id UUID NOT NULL REFERENCES public.workforce_passports(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  label TEXT,
  scopes TEXT[] NOT NULL DEFAULT ARRAY['identity','skills','certifications','training','employment']::text[],
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  view_count INTEGER NOT NULL DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.passport_sharing TO authenticated;
GRANT ALL ON public.passport_sharing TO service_role;
ALTER TABLE public.passport_sharing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Worker manages own passport sharing"
  ON public.passport_sharing FOR ALL
  USING (EXISTS (SELECT 1 FROM public.workforce_passports wp JOIN public.workers w ON w.id = wp.worker_id WHERE wp.id = passport_sharing.passport_id AND w.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workforce_passports wp JOIN public.workers w ON w.id = wp.worker_id WHERE wp.id = passport_sharing.passport_id AND w.user_id = auth.uid()));

CREATE INDEX idx_passport_sharing_passport ON public.passport_sharing(passport_id);
CREATE INDEX idx_passport_sharing_token ON public.passport_sharing(token_hash);

CREATE TRIGGER trg_passport_sharing_updated
  BEFORE UPDATE ON public.passport_sharing
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- passport_verifications (granular, distinct from identity_verifications which is single-shot identity check)
CREATE TABLE public.passport_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passport_id UUID NOT NULL REFERENCES public.workforce_passports(id) ON DELETE CASCADE,
  verification_type TEXT NOT NULL, -- government_id, work_authorization, address, phone, email, education, reference
  status TEXT NOT NULL DEFAULT 'unverified', -- unverified, pending, verified, failed, expired
  verifier TEXT,
  evidence_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (passport_id, verification_type)
);
GRANT SELECT ON public.passport_verifications TO authenticated;
GRANT ALL ON public.passport_verifications TO service_role;
ALTER TABLE public.passport_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Worker views own passport verifications"
  ON public.passport_verifications FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.workforce_passports wp JOIN public.workers w ON w.id = wp.worker_id WHERE wp.id = passport_verifications.passport_id AND w.user_id = auth.uid()));

CREATE POLICY "Agency views their workers passport verifications"
  ON public.passport_verifications FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.workforce_passports wp JOIN public.workers w ON w.id = wp.worker_id JOIN public.agency_members am ON am.agency_id = w.agency_id WHERE wp.id = passport_verifications.passport_id AND am.user_id = auth.uid() AND am.is_active = true));

CREATE INDEX idx_passport_verifications_passport ON public.passport_verifications(passport_id);

CREATE TRIGGER trg_passport_verifications_updated
  BEFORE UPDATE ON public.passport_verifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- passport_badges
CREATE TABLE public.passport_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passport_id UUID NOT NULL REFERENCES public.workforce_passports(id) ON DELETE CASCADE,
  badge_key TEXT NOT NULL, -- e.g. reliability_gold, safety_champion, verified_identity
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  tier TEXT, -- bronze, silver, gold, platinum
  awarded_by TEXT, -- system, agency, client
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (passport_id, badge_key)
);
GRANT SELECT ON public.passport_badges TO authenticated;
GRANT ALL ON public.passport_badges TO service_role;
ALTER TABLE public.passport_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Worker views own passport badges"
  ON public.passport_badges FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.workforce_passports wp JOIN public.workers w ON w.id = wp.worker_id WHERE wp.id = passport_badges.passport_id AND w.user_id = auth.uid()));

CREATE POLICY "Agency views their workers passport badges"
  ON public.passport_badges FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.workforce_passports wp JOIN public.workers w ON w.id = wp.worker_id JOIN public.agency_members am ON am.agency_id = w.agency_id WHERE wp.id = passport_badges.passport_id AND am.user_id = auth.uid() AND am.is_active = true));

CREATE INDEX idx_passport_badges_passport ON public.passport_badges(passport_id);
