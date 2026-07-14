
-- signed-documents bucket policies
CREATE POLICY "sd_agency_read" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'signed-documents'
    AND (storage.foldername(name))[1]::uuid IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid())
  );
CREATE POLICY "sd_worker_read_self" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'signed-documents'
    AND (storage.foldername(name))[1]::uuid IN (SELECT agency_id FROM public.workers WHERE user_id = auth.uid())
    AND (storage.foldername(name))[2]::uuid IN (SELECT id FROM public.workers WHERE user_id = auth.uid())
  );
CREATE POLICY "sd_agency_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'signed-documents'
    AND (storage.foldername(name))[1]::uuid IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid())
  );

-- training-assets bucket policies (agency-scoped)
CREATE POLICY "ta_agency_read" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'training-assets'
    AND (
      (storage.foldername(name))[1]::uuid IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid())
      OR (storage.foldername(name))[1]::uuid IN (SELECT agency_id FROM public.workers WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "ta_agency_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'training-assets'
    AND (storage.foldername(name))[1]::uuid IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid())
  );
CREATE POLICY "ta_agency_update" ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'training-assets'
    AND (storage.foldername(name))[1]::uuid IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid())
  );
CREATE POLICY "ta_agency_delete" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'training-assets'
    AND (storage.foldername(name))[1]::uuid IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid())
  );
