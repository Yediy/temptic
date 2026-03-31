-- 1. Block DELETE and UPDATE on audit_logs for authenticated users
CREATE POLICY "Block audit_logs delete"
  ON public.audit_logs
  FOR DELETE
  TO authenticated
  USING (false);

CREATE POLICY "Block audit_logs update"
  ON public.audit_logs
  FOR UPDATE
  TO authenticated
  USING (false);

-- 2. Restrict worker UPDATE to agency_admin only
DROP POLICY IF EXISTS "Agency updates workers" ON public.workers;

CREATE POLICY "Agency admins update workers"
  ON public.workers
  FOR UPDATE
  TO authenticated
  USING (
    agency_id = public.get_user_agency_id(auth.uid())
    AND public.has_role(auth.uid(), 'agency_admin')
  )
  WITH CHECK (
    agency_id = public.get_user_agency_id(auth.uid())
    AND public.has_role(auth.uid(), 'agency_admin')
  );

-- 3. Ensure token_hash is not selectable (re-enforce column-level revoke)
-- The prior migration already ran REVOKE SELECT (token_hash), but the scan
-- still flags it. Let's also create a view that excludes token_hash and
-- use an RLS approach: grant select only on specific columns.
-- Actually, column-level REVOKE should work. Let's re-run it to be sure.
REVOKE ALL ON public.client_invites FROM authenticated;
GRANT SELECT (id, agency_id, client_id, client_signer_id, email, status, expires_at, accepted_at, created_by, created_at) ON public.client_invites TO authenticated;
GRANT INSERT ON public.client_invites TO authenticated;
GRANT UPDATE (status, accepted_at) ON public.client_invites TO authenticated;
GRANT DELETE ON public.client_invites TO authenticated;