
-- Fix: Restrict client_invites UPDATE to agency_admin only
DROP POLICY IF EXISTS "Agency updates own invites" ON public.client_invites;
CREATE POLICY "Agency admins update own invites"
  ON public.client_invites
  FOR UPDATE
  TO authenticated
  USING (
    agency_id = get_user_agency_id(auth.uid())
    AND has_role(auth.uid(), 'agency_admin'::app_role)
  );

-- Also restrict INSERT to agency_admin for consistency
DROP POLICY IF EXISTS "Agency inserts invites" ON public.client_invites;
CREATE POLICY "Agency admins insert invites"
  ON public.client_invites
  FOR INSERT
  TO authenticated
  WITH CHECK (
    agency_id = get_user_agency_id(auth.uid())
    AND has_role(auth.uid(), 'agency_admin'::app_role)
  );
