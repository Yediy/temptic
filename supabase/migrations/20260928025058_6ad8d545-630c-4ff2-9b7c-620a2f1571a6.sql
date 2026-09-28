CREATE POLICY "punch_photos_worker_upload" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'punch-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "punch_photos_worker_read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'punch-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "punch_photos_agency_read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'punch-photos' AND EXISTS (
  SELECT 1 FROM public.tto_time_tickets t
  WHERE t.id::text = (storage.foldername(name))[2]
    AND t.agency_id IN (SELECT private.current_user_agency_ids())
));