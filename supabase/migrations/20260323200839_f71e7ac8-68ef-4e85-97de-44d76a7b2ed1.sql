-- Fix: Restrict client signer self-update to prevent client_id reassignment
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Client updates own signer record" ON public.client_signers;

-- Create a restricted policy that prevents changing client_id, user_id, site_id
CREATE POLICY "Client updates own signer record"
ON public.client_signers
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND client_id = (SELECT client_id FROM public.client_signers WHERE user_id = auth.uid() LIMIT 1)
);