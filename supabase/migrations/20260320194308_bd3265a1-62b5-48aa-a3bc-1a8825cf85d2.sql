
-- Fix: restrict user_id assignment on client_signers to agency_admin only
DROP POLICY IF EXISTS "Agency inserts signers" ON public.client_signers;
CREATE POLICY "Agency inserts signers" ON public.client_signers
FOR INSERT TO authenticated
WITH CHECK (
  client_id IN (SELECT id FROM clients WHERE agency_id = get_user_agency_id(auth.uid()))
  AND (
    user_id IS NULL
    OR has_role(auth.uid(), 'agency_admin')
  )
);

-- Fix: restrict user_id assignment on workers insert to agency_admin only
DROP POLICY IF EXISTS "Agency inserts workers" ON public.workers;
CREATE POLICY "Agency inserts workers" ON public.workers
FOR INSERT TO authenticated
WITH CHECK (
  agency_id = get_user_agency_id(auth.uid())
  AND (
    user_id IS NULL
    OR has_role(auth.uid(), 'agency_admin')
  )
);

-- Fix: restrict user_id changes on workers update to agency_admin only
DROP POLICY IF EXISTS "Agency updates workers" ON public.workers;
CREATE POLICY "Agency updates workers" ON public.workers
FOR UPDATE TO authenticated
USING (agency_id = get_user_agency_id(auth.uid()))
WITH CHECK (
  agency_id = get_user_agency_id(auth.uid())
  AND (
    user_id IS NULL
    OR has_role(auth.uid(), 'agency_admin')
  )
);
