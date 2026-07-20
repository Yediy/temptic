
-- ============ ONBOARDING OS ADDITIVE TABLES ============

CREATE TABLE IF NOT EXISTS public.onboarding_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL,
  worker_id UUID NOT NULL,
  checklist_id UUID REFERENCES public.onboarding_checklists(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'in_progress',
  current_step TEXT,
  progress_pct INTEGER NOT NULL DEFAULT 0,
  resume_token TEXT,
  device_info JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.onboarding_sessions TO authenticated;
GRANT ALL ON public.onboarding_sessions TO service_role;
ALTER TABLE public.onboarding_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agency members read onboarding_sessions"
  ON public.onboarding_sessions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agency_members m WHERE m.agency_id = onboarding_sessions.agency_id AND m.user_id = auth.uid() AND m.is_active));
CREATE POLICY "Agency members manage onboarding_sessions"
  ON public.onboarding_sessions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agency_members m WHERE m.agency_id = onboarding_sessions.agency_id AND m.user_id = auth.uid() AND m.is_active))
  WITH CHECK (EXISTS (SELECT 1 FROM public.agency_members m WHERE m.agency_id = onboarding_sessions.agency_id AND m.user_id = auth.uid() AND m.is_active));
CREATE POLICY "Workers read own onboarding_sessions"
  ON public.onboarding_sessions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workers w WHERE w.id = onboarding_sessions.worker_id AND w.user_id = auth.uid()));
CREATE TRIGGER trg_onboarding_sessions_updated BEFORE UPDATE ON public.onboarding_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.client_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL,
  client_id UUID NOT NULL,
  name TEXT NOT NULL,
  forms JSONB NOT NULL DEFAULT '[]'::jsonb,
  training_course_ids UUID[] NOT NULL DEFAULT '{}',
  policy_ids UUID[] NOT NULL DEFAULT '{}',
  required_certifications TEXT[] NOT NULL DEFAULT '{}',
  required_licenses TEXT[] NOT NULL DEFAULT '{}',
  screening_package_id UUID,
  drug_screen_required BOOLEAN NOT NULL DEFAULT false,
  background_required BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_requirements TO authenticated;
GRANT ALL ON public.client_requirements TO service_role;
ALTER TABLE public.client_requirements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agency members manage client_requirements"
  ON public.client_requirements FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agency_members m WHERE m.agency_id = client_requirements.agency_id AND m.user_id = auth.uid() AND m.is_active))
  WITH CHECK (EXISTS (SELECT 1 FROM public.agency_members m WHERE m.agency_id = client_requirements.agency_id AND m.user_id = auth.uid() AND m.is_active));
CREATE TRIGGER trg_client_requirements_updated BEFORE UPDATE ON public.client_requirements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.assignment_readiness (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL,
  worker_id UUID NOT NULL,
  client_id UUID,
  score INTEGER NOT NULL DEFAULT 0,
  ready BOOLEAN NOT NULL DEFAULT false,
  breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  missing JSONB NOT NULL DEFAULT '[]'::jsonb,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (worker_id, client_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assignment_readiness TO authenticated;
GRANT ALL ON public.assignment_readiness TO service_role;
ALTER TABLE public.assignment_readiness ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agency members read assignment_readiness"
  ON public.assignment_readiness FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agency_members m WHERE m.agency_id = assignment_readiness.agency_id AND m.user_id = auth.uid() AND m.is_active));
CREATE POLICY "Agency members write assignment_readiness"
  ON public.assignment_readiness FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agency_members m WHERE m.agency_id = assignment_readiness.agency_id AND m.user_id = auth.uid() AND m.is_active))
  WITH CHECK (EXISTS (SELECT 1 FROM public.agency_members m WHERE m.agency_id = assignment_readiness.agency_id AND m.user_id = auth.uid() AND m.is_active));
CREATE POLICY "Workers read own readiness"
  ON public.assignment_readiness FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workers w WHERE w.id = assignment_readiness.worker_id AND w.user_id = auth.uid()));
CREATE TRIGGER trg_assignment_readiness_updated BEFORE UPDATE ON public.assignment_readiness
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.onboarding_ai_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL,
  worker_id UUID,
  session_id UUID REFERENCES public.onboarding_sessions(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  actor_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.onboarding_ai_events TO authenticated;
GRANT ALL ON public.onboarding_ai_events TO service_role;
ALTER TABLE public.onboarding_ai_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agency members read onboarding_ai_events"
  ON public.onboarding_ai_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agency_members m WHERE m.agency_id = onboarding_ai_events.agency_id AND m.user_id = auth.uid() AND m.is_active));
CREATE POLICY "Agency members insert onboarding_ai_events"
  ON public.onboarding_ai_events FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.agency_members m WHERE m.agency_id = onboarding_ai_events.agency_id AND m.user_id = auth.uid() AND m.is_active));

-- ============ SECURITY FIX: identity_verifications self-write ============
CREATE OR REPLACE FUNCTION public.protect_identity_verification_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.verifier IS DISTINCT FROM OLD.verifier
     OR NEW.verified_at IS DISTINCT FROM OLD.verified_at THEN
    RAISE EXCEPTION 'Only verifiers can change verification status';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_protect_identity_verification_status ON public.identity_verifications;
CREATE TRIGGER trg_protect_identity_verification_status
  BEFORE UPDATE ON public.identity_verifications
  FOR EACH ROW EXECUTE FUNCTION public.protect_identity_verification_status();

-- ============ SECURITY FIX: passport_compliance self-write ============
CREATE OR REPLACE FUNCTION public.protect_passport_compliance_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.completed_at IS DISTINCT FROM OLD.completed_at THEN
    RAISE EXCEPTION 'Only compliance officers can change compliance status';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_protect_passport_compliance_status ON public.passport_compliance;
CREATE TRIGGER trg_protect_passport_compliance_status
  BEFORE UPDATE ON public.passport_compliance
  FOR EACH ROW EXECUTE FUNCTION public.protect_passport_compliance_status();
