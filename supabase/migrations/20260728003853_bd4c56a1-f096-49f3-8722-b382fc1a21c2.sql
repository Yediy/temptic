
-- Storage policies for client-documents bucket
-- Path convention: {agency_id}/{client_id}/{filename}

DROP POLICY IF EXISTS "cc_docs_agency_all" ON storage.objects;
CREATE POLICY "cc_docs_agency_all" ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'client-documents' AND
  EXISTS (
    SELECT 1 FROM public.agency_members am
    WHERE am.user_id = auth.uid()
      AND am.is_active
      AND am.agency_id::text = split_part(name, '/', 1)
  )
)
WITH CHECK (
  bucket_id = 'client-documents' AND
  EXISTS (
    SELECT 1 FROM public.agency_members am
    WHERE am.user_id = auth.uid()
      AND am.is_active
      AND am.agency_id::text = split_part(name, '/', 1)
  )
);

DROP POLICY IF EXISTS "cc_docs_client_read" ON storage.objects;
CREATE POLICY "cc_docs_client_read" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'client-documents' AND
  EXISTS (
    SELECT 1 FROM public.cc_client_users u
    WHERE u.user_id = auth.uid()
      AND u.status = 'active'
      AND u.client_id::text = split_part(name, '/', 2)
  )
);

DROP POLICY IF EXISTS "cc_docs_client_upload" ON storage.objects;
CREATE POLICY "cc_docs_client_upload" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'client-documents' AND
  EXISTS (
    SELECT 1 FROM public.cc_client_users u
    WHERE u.user_id = auth.uid()
      AND u.status = 'active'
      AND u.client_id::text = split_part(name, '/', 2)
  )
);
