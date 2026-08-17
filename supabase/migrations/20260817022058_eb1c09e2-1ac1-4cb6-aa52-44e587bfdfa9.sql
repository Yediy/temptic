CREATE POLICY "Portfolio owners manage their files"
ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'passport-portfolio'
  AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND private.passport_owner_user_id(((storage.foldername(name))[1])::uuid) = auth.uid()
)
WITH CHECK (
  bucket_id = 'passport-portfolio'
  AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND private.passport_owner_user_id(((storage.foldername(name))[1])::uuid) = auth.uid()
);

CREATE POLICY "Granted viewers read portfolio files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'passport-portfolio'
  AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND private.has_passport_access(((storage.foldername(name))[1])::uuid, auth.uid())
);