-- Fix: Restrict client signature inserts to signer_type = 'client' only
DROP POLICY IF EXISTS "Client inserts signature" ON public.ticket_signatures;

CREATE POLICY "Client inserts signature"
ON public.ticket_signatures
FOR INSERT
TO authenticated
WITH CHECK (
  signer_type = 'client'
  AND ticket_id IN (
    SELECT id FROM tickets WHERE client_id = get_user_client_id(auth.uid())
  )
);