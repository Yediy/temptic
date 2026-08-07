ALTER TABLE public.onboarding_sessions
  ADD COLUMN IF NOT EXISTS step_state jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE POLICY "Workers update own onboarding_sessions"
ON public.onboarding_sessions
FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM public.workers w WHERE w.id = onboarding_sessions.worker_id AND w.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.workers w WHERE w.id = onboarding_sessions.worker_id AND w.user_id = auth.uid()));

CREATE POLICY "Workers create own onboarding_sessions"
ON public.onboarding_sessions
FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.workers w
  WHERE w.id = onboarding_sessions.worker_id
    AND w.user_id = auth.uid()
    AND w.agency_id = onboarding_sessions.agency_id
));