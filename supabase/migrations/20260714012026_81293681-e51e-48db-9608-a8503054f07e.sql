
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DO $$ BEGIN
  CREATE TYPE public.onboarding_stage AS ENUM (
    'sourced','applied','screening','interviewing','offered',
    'documents','training','compliance','ready','placed','on_hold','rejected'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.onboarding_scope AS ENUM ('universal','agency','client','job','location','state','industry');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.document_status AS ENUM ('draft','active','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.training_lesson_type AS ENUM ('video','reading','quiz');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.training_enrollment_status AS ENUM ('enrolled','in_progress','completed','expired','revoked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.onboarding_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  scope public.onboarding_scope NOT NULL DEFAULT 'agency',
  scope_ref_id uuid,
  is_default boolean NOT NULL DEFAULT false,
  stage_labels jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.onboarding_templates TO authenticated;
GRANT ALL ON public.onboarding_templates TO service_role;
ALTER TABLE public.onboarding_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "onb_templates_agency_read" ON public.onboarding_templates FOR SELECT TO authenticated
  USING (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid()));
CREATE POLICY "onb_templates_agency_write" ON public.onboarding_templates FOR ALL TO authenticated
  USING (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid()) AND private.has_role(auth.uid(), 'agency_admin'::public.app_role))
  WITH CHECK (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid()) AND private.has_role(auth.uid(), 'agency_admin'::public.app_role));

CREATE TABLE IF NOT EXISTS public.onboarding_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.onboarding_templates(id) ON DELETE CASCADE,
  label text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general',
  required boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  document_template_id uuid,
  training_course_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.onboarding_requirements TO authenticated;
GRANT ALL ON public.onboarding_requirements TO service_role;
ALTER TABLE public.onboarding_requirements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "onb_req_via_template" ON public.onboarding_requirements FOR ALL TO authenticated
  USING (template_id IN (SELECT id FROM public.onboarding_templates WHERE agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid())))
  WITH CHECK (template_id IN (SELECT id FROM public.onboarding_templates WHERE agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid())));

CREATE TABLE IF NOT EXISTS public.onboarding_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  worker_id uuid NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.onboarding_templates(id) ON DELETE SET NULL,
  stage public.onboarding_stage NOT NULL DEFAULT 'sourced',
  cleared_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (worker_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.onboarding_checklists TO authenticated;
GRANT ALL ON public.onboarding_checklists TO service_role;
ALTER TABLE public.onboarding_checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "onb_checklists_agency" ON public.onboarding_checklists FOR ALL TO authenticated
  USING (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid()))
  WITH CHECK (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.onboarding_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id uuid NOT NULL REFERENCES public.onboarding_checklists(id) ON DELETE CASCADE,
  requirement_id uuid REFERENCES public.onboarding_requirements(id) ON DELETE SET NULL,
  label text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  required boolean NOT NULL DEFAULT true,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  completed_by uuid,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.onboarding_items TO authenticated;
GRANT ALL ON public.onboarding_items TO service_role;
ALTER TABLE public.onboarding_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "onb_items_via_checklist" ON public.onboarding_items FOR ALL TO authenticated
  USING (checklist_id IN (SELECT id FROM public.onboarding_checklists WHERE agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid())))
  WITH CHECK (checklist_id IN (SELECT id FROM public.onboarding_checklists WHERE agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid())));

CREATE TABLE IF NOT EXISTS public.document_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  classification text NOT NULL DEFAULT 'employee',
  status public.document_status NOT NULL DEFAULT 'draft',
  body_markdown text NOT NULL DEFAULT '',
  requires_signature boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_templates TO authenticated;
GRANT ALL ON public.document_templates TO service_role;
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "doc_templates_agency" ON public.document_templates FOR ALL TO authenticated
  USING (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid()))
  WITH CHECK (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.document_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.document_templates(id) ON DELETE CASCADE,
  version_number int NOT NULL DEFAULT 1,
  body_markdown text NOT NULL DEFAULT '',
  effective_from timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_id, version_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_versions TO authenticated;
GRANT ALL ON public.document_versions TO service_role;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "doc_versions_via_template" ON public.document_versions FOR ALL TO authenticated
  USING (template_id IN (SELECT id FROM public.document_templates WHERE agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid())))
  WITH CHECK (template_id IN (SELECT id FROM public.document_templates WHERE agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid())));

CREATE TABLE IF NOT EXISTS public.document_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  worker_id uuid NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.document_templates(id) ON DELETE RESTRICT,
  version_id uuid REFERENCES public.document_versions(id) ON DELETE SET NULL,
  typed_name text NOT NULL,
  signature_image_url text,
  pdf_storage_path text,
  content_sha256 text NOT NULL,
  signed_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text
);
GRANT SELECT, INSERT ON public.document_signatures TO authenticated;
GRANT ALL ON public.document_signatures TO service_role;
ALTER TABLE public.document_signatures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "doc_sig_agency_read" ON public.document_signatures FOR SELECT TO authenticated
  USING (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid()));
CREATE POLICY "doc_sig_worker_self_read" ON public.document_signatures FOR SELECT TO authenticated
  USING (worker_id IN (SELECT id FROM public.workers WHERE user_id = auth.uid()));
CREATE POLICY "doc_sig_insert_self_or_agency" ON public.document_signatures FOR INSERT TO authenticated
  WITH CHECK (
    worker_id IN (SELECT id FROM public.workers WHERE user_id = auth.uid())
    OR agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS public.training_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text,
  thumbnail_url text,
  duration_minutes int NOT NULL DEFAULT 0,
  required boolean NOT NULL DEFAULT false,
  status public.document_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_courses TO authenticated;
GRANT ALL ON public.training_courses TO service_role;
ALTER TABLE public.training_courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "training_courses_agency_read" ON public.training_courses FOR SELECT TO authenticated
  USING (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid()));
CREATE POLICY "training_courses_worker_read" ON public.training_courses FOR SELECT TO authenticated
  USING (status = 'active' AND agency_id IN (SELECT agency_id FROM public.workers WHERE user_id = auth.uid()));
CREATE POLICY "training_courses_agency_write" ON public.training_courses FOR ALL TO authenticated
  USING (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid()) AND private.has_role(auth.uid(), 'agency_admin'::public.app_role))
  WITH CHECK (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid()) AND private.has_role(auth.uid(), 'agency_admin'::public.app_role));

CREATE TABLE IF NOT EXISTS public.training_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.training_courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  lesson_type public.training_lesson_type NOT NULL DEFAULT 'reading',
  body text,
  media_url text,
  duration_seconds int NOT NULL DEFAULT 0,
  quiz_json jsonb,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_lessons TO authenticated;
GRANT ALL ON public.training_lessons TO service_role;
ALTER TABLE public.training_lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "training_lessons_via_course" ON public.training_lessons FOR SELECT TO authenticated
  USING (course_id IN (
    SELECT id FROM public.training_courses
    WHERE agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid())
       OR (status = 'active' AND agency_id IN (SELECT agency_id FROM public.workers WHERE user_id = auth.uid()))
  ));
CREATE POLICY "training_lessons_agency_write" ON public.training_lessons FOR ALL TO authenticated
  USING (course_id IN (SELECT id FROM public.training_courses WHERE agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid())) AND private.has_role(auth.uid(), 'agency_admin'::public.app_role))
  WITH CHECK (course_id IN (SELECT id FROM public.training_courses WHERE agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid())) AND private.has_role(auth.uid(), 'agency_admin'::public.app_role));

CREATE TABLE IF NOT EXISTS public.training_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  worker_id uuid NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.training_courses(id) ON DELETE CASCADE,
  status public.training_enrollment_status NOT NULL DEFAULT 'enrolled',
  progress_pct int NOT NULL DEFAULT 0,
  started_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (worker_id, course_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_enrollments TO authenticated;
GRANT ALL ON public.training_enrollments TO service_role;
ALTER TABLE public.training_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "train_enroll_agency" ON public.training_enrollments FOR ALL TO authenticated
  USING (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid()))
  WITH CHECK (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid()));
CREATE POLICY "train_enroll_worker_read" ON public.training_enrollments FOR SELECT TO authenticated
  USING (worker_id IN (SELECT id FROM public.workers WHERE user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.training_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES public.training_enrollments(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.training_lessons(id) ON DELETE CASCADE,
  watched_seconds int NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  last_position_seconds int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (enrollment_id, lesson_id)
);
GRANT SELECT, INSERT, UPDATE ON public.training_progress TO authenticated;
GRANT ALL ON public.training_progress TO service_role;
ALTER TABLE public.training_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "train_progress_via_enrollment" ON public.training_progress FOR ALL TO authenticated
  USING (enrollment_id IN (
    SELECT id FROM public.training_enrollments
    WHERE agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid())
       OR worker_id IN (SELECT id FROM public.workers WHERE user_id = auth.uid())
  ))
  WITH CHECK (enrollment_id IN (
    SELECT id FROM public.training_enrollments
    WHERE agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid())
       OR worker_id IN (SELECT id FROM public.workers WHERE user_id = auth.uid())
  ));

CREATE TABLE IF NOT EXISTS public.training_quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES public.training_enrollments(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.training_lessons(id) ON DELETE CASCADE,
  score_pct int NOT NULL DEFAULT 0,
  passed boolean NOT NULL DEFAULT false,
  answers_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.training_quiz_attempts TO authenticated;
GRANT ALL ON public.training_quiz_attempts TO service_role;
ALTER TABLE public.training_quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quiz_attempts_read" ON public.training_quiz_attempts FOR SELECT TO authenticated
  USING (enrollment_id IN (
    SELECT id FROM public.training_enrollments
    WHERE agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid())
       OR worker_id IN (SELECT id FROM public.workers WHERE user_id = auth.uid())
  ));
CREATE POLICY "quiz_attempts_insert" ON public.training_quiz_attempts FOR INSERT TO authenticated
  WITH CHECK (enrollment_id IN (
    SELECT id FROM public.training_enrollments
    WHERE worker_id IN (SELECT id FROM public.workers WHERE user_id = auth.uid())
  ));

CREATE TABLE IF NOT EXISTS public.training_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES public.training_enrollments(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  worker_id uuid NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.training_courses(id) ON DELETE CASCADE,
  issued_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  pdf_storage_path text,
  certificate_number text NOT NULL UNIQUE
);
GRANT SELECT, INSERT ON public.training_certificates TO authenticated;
GRANT ALL ON public.training_certificates TO service_role;
ALTER TABLE public.training_certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cert_agency_read" ON public.training_certificates FOR SELECT TO authenticated
  USING (agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid()));
CREATE POLICY "cert_worker_read" ON public.training_certificates FOR SELECT TO authenticated
  USING (worker_id IN (SELECT id FROM public.workers WHERE user_id = auth.uid()));

CREATE TRIGGER trg_onb_tmpl_upd BEFORE UPDATE ON public.onboarding_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_onb_cl_upd BEFORE UPDATE ON public.onboarding_checklists FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_doc_tmpl_upd BEFORE UPDATE ON public.document_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_tr_course_upd BEFORE UPDATE ON public.training_courses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_tr_enroll_upd BEFORE UPDATE ON public.training_enrollments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.guard_training_progress()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  wall_delta int;
  claim_delta int;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    wall_delta := GREATEST(0, EXTRACT(EPOCH FROM (now() - OLD.updated_at))::int + 2);
    claim_delta := GREATEST(0, NEW.watched_seconds - OLD.watched_seconds);
    IF claim_delta > wall_delta THEN
      NEW.watched_seconds := OLD.watched_seconds + wall_delta;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.guard_training_progress() FROM anon, authenticated;
CREATE TRIGGER trg_guard_training_progress BEFORE UPDATE ON public.training_progress
  FOR EACH ROW EXECUTE FUNCTION public.guard_training_progress();

CREATE OR REPLACE VIEW public.worker_readiness
WITH (security_invoker = true) AS
SELECT
  w.id AS worker_id,
  w.agency_id,
  COALESCE(c.stage, 'sourced'::public.onboarding_stage) AS onboarding_stage,
  (
    NOT EXISTS (
      SELECT 1 FROM public.onboarding_items i
      WHERE i.checklist_id = c.id AND i.required = true AND i.completed = false
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.training_enrollments te
      JOIN public.training_courses tc ON tc.id = te.course_id
      WHERE te.worker_id = w.id AND tc.required = true AND te.status <> 'completed'
    )
  ) AS cleared_for_assignment
FROM public.workers w
LEFT JOIN public.onboarding_checklists c ON c.worker_id = w.id;
GRANT SELECT ON public.worker_readiness TO authenticated, service_role;
