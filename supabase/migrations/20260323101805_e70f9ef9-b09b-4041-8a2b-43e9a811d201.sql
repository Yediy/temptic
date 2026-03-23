
-- Add agency UPDATE policy for client_signers
CREATE POLICY "Agency updates signers"
  ON public.client_signers
  FOR UPDATE
  TO authenticated
  USING (client_id IN (
    SELECT id FROM public.clients WHERE agency_id = get_user_agency_id(auth.uid())
  ))
  WITH CHECK (client_id IN (
    SELECT id FROM public.clients WHERE agency_id = get_user_agency_id(auth.uid())
  ));
