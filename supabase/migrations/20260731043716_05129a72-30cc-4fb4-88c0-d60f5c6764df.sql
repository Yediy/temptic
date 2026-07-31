-- 1. Storage: exact ticket folder match instead of LIKE '%ticket_id%'
DROP POLICY IF EXISTS "Client reads own ticket assets" ON storage.objects;
CREATE POLICY "Client reads own ticket assets"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'ticket-assets'
  AND EXISTS (
    SELECT 1 FROM public.tickets t
    JOIN public.client_signers cs ON cs.client_id = t.client_id
    WHERE cs.user_id = auth.uid()
      AND cs.is_active = true
      AND (storage.foldername(objects.name))[1] = t.agency_id::text
      AND (storage.foldername(objects.name))[2] = t.id::text
  )
);

DROP POLICY IF EXISTS "Worker reads own ticket assets" ON storage.objects;
CREATE POLICY "Worker reads own ticket assets"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'ticket-assets'
  AND EXISTS (
    SELECT 1 FROM public.tickets t
    JOIN public.workers w ON w.id = t.worker_id
    WHERE w.user_id = auth.uid()
      AND w.is_active = true
      AND (storage.foldername(objects.name))[1] = t.agency_id::text
      AND (storage.foldername(objects.name))[2] = t.id::text
  )
);

-- 2. EEO demographics: explicit same-agency tenant scoping
DROP POLICY IF EXISTS "eeo_compliance_read" ON public.eeo_demographics;
CREATE POLICY "eeo_compliance_read"
ON public.eeo_demographics FOR SELECT TO authenticated
USING (
  private.has_role(auth.uid(), 'super_admin'::app_role)
  OR EXISTS (
    SELECT 1
    FROM public.workers w
    JOIN public.agency_members am
      ON am.agency_id = w.agency_id
     AND am.user_id = auth.uid()
     AND am.is_active
    JOIN public.user_roles ur
      ON ur.user_id = auth.uid()
     AND ur.role = 'compliance_specialist'::app_role
    WHERE w.id = eeo_demographics.worker_id
  )
);

-- 3. Screening reports: no client-side writes (service role only)
REVOKE INSERT, UPDATE, DELETE ON public.screening_reports FROM authenticated, anon;
GRANT ALL ON public.screening_reports TO service_role;
CREATE POLICY "screening_reports_no_client_writes"
ON public.screening_reports FOR ALL TO authenticated, anon
USING (false) WITH CHECK (false);

-- 4. Screening webhook events: explicit fail-closed deny-all
REVOKE ALL ON public.screening_webhook_events FROM authenticated, anon;
GRANT ALL ON public.screening_webhook_events TO service_role;
CREATE POLICY "screening_webhook_events_deny_all"
ON public.screening_webhook_events FOR ALL TO authenticated, anon
USING (false) WITH CHECK (false);