
-- Fix: Add client_id constraint to Client updates own signer record WITH CHECK
DROP POLICY IF EXISTS "Client updates own signer record" ON public.client_signers;
CREATE POLICY "Client updates own signer record"
  ON public.client_signers
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND client_id = get_user_client_id(auth.uid())
  );
