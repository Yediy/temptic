-- Fix: Restrict user_id assignment on worker UPDATE to agency_admin only
-- This prevents dispatchers from linking arbitrary user accounts to worker records

DROP POLICY IF EXISTS "Agency updates workers" ON public.workers;

CREATE POLICY "Agency updates workers"
  ON public.workers
  FOR UPDATE
  TO authenticated
  USING (
    agency_id = get_user_agency_id(auth.uid())
  )
  WITH CHECK (
    agency_id = get_user_agency_id(auth.uid())
    AND (
      user_id IS NULL
      OR has_role(auth.uid(), 'agency_admin'::app_role)
    )
  );