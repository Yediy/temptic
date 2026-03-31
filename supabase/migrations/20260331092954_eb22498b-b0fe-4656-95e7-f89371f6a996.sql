-- 1. Fix client_invites column grants (REVOKE ALL removed everything, re-grant properly)
GRANT SELECT (id, agency_id, client_id, client_signer_id, email, status, expires_at, accepted_at, created_by, created_at) ON public.client_invites TO authenticated;
GRANT INSERT (agency_id, client_id, client_signer_id, email, token_hash, created_by) ON public.client_invites TO authenticated;
GRANT UPDATE (status, accepted_at) ON public.client_invites TO authenticated;
GRANT DELETE ON public.client_invites TO authenticated;

-- 2. Fix ticket_signatures: allow dispatchers to read non-sensitive columns
--    by using column-level grants instead of restricting the whole policy
DROP POLICY IF EXISTS "Agency admins read signatures" ON public.ticket_signatures;

-- Restore agency-wide read (all agency members need to see signatures for ticket flow)
CREATE POLICY "Agency reads signatures"
  ON public.ticket_signatures
  FOR SELECT
  TO authenticated
  USING (
    ticket_id IN (
      SELECT id FROM public.tickets
      WHERE agency_id = public.get_user_agency_id(auth.uid())
    )
  );

-- But hide sensitive columns from non-admin via column-level security
REVOKE ALL ON public.ticket_signatures FROM authenticated;
GRANT SELECT (id, ticket_id, signer_type, signer_name, signer_title, signer_initials, signature_image_url, signed_at, created_at) ON public.ticket_signatures TO authenticated;
GRANT INSERT ON public.ticket_signatures TO authenticated;

-- 3. Tighten storage: scope client reads to their own tickets only
DROP POLICY IF EXISTS "Client reads own agency ticket assets" ON storage.objects;
DROP POLICY IF EXISTS "Worker reads own agency ticket assets" ON storage.objects;

-- Clients can only read assets for tickets belonging to their client_id
CREATE POLICY "Client reads own ticket assets"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'ticket-assets'
    AND EXISTS (
      SELECT 1 FROM public.tickets t
      JOIN public.client_signers cs ON cs.client_id = t.client_id
      WHERE cs.user_id = auth.uid()
        AND cs.is_active = true
        AND (storage.foldername(name))[1] = t.agency_id::text
        AND name LIKE '%' || t.id::text || '%'
    )
  );

-- Workers can only read assets for tickets assigned to them
CREATE POLICY "Worker reads own ticket assets"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'ticket-assets'
    AND EXISTS (
      SELECT 1 FROM public.tickets t
      JOIN public.workers w ON w.id = t.worker_id
      WHERE w.user_id = auth.uid()
        AND w.is_active = true
        AND (storage.foldername(name))[1] = t.agency_id::text
        AND name LIKE '%' || t.id::text || '%'
    )
  );