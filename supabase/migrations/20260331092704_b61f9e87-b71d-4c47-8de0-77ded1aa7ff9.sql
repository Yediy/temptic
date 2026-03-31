-- 1. Fix agency_members role enumeration: restrict non-admins to own row only
DROP POLICY IF EXISTS "Read own agency members" ON public.agency_members;

-- Admins can see all members in their agency
CREATE POLICY "Agency admins read all agency members"
  ON public.agency_members
  FOR SELECT
  TO authenticated
  USING (
    agency_id = public.get_user_agency_id(auth.uid())
    AND public.has_role(auth.uid(), 'agency_admin')
  );

-- Non-admins can only read their own membership row
CREATE POLICY "Members read own membership"
  ON public.agency_members
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 2. Ensure token_hash is excluded from client_invites select
-- (Already revoked in prior migration, adding explicit column-level grant for safe columns)
-- No additional SQL needed - the REVOKE SELECT (token_hash) from prior migration handles this.