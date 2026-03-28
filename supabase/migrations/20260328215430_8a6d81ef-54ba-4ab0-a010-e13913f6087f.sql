
-- 1. Add DELETE policy for client_invites so agency admins can remove stale invites
CREATE POLICY "Agency admins delete own invites"
  ON public.client_invites
  FOR DELETE
  TO authenticated
  USING (
    agency_id = get_user_agency_id(auth.uid())
    AND has_role(auth.uid(), 'agency_admin'::app_role)
  );

-- 2. Tighten client_signers INSERT: agency admins can only insert with user_id = NULL
--    (the accept-invite edge function uses service_role and bypasses RLS)
DROP POLICY IF EXISTS "Agency inserts signers" ON public.client_signers;
CREATE POLICY "Agency inserts signers"
  ON public.client_signers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    client_id IN (
      SELECT clients.id FROM clients WHERE clients.agency_id = get_user_agency_id(auth.uid())
    )
    AND user_id IS NULL
  );

-- 3. Tighten workers INSERT: agency admins can only insert with user_id = NULL
DROP POLICY IF EXISTS "Agency inserts workers" ON public.workers;
CREATE POLICY "Agency inserts workers"
  ON public.workers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    agency_id = get_user_agency_id(auth.uid())
    AND user_id IS NULL
  );
