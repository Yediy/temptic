-- Drop the overly permissive storage policies
DROP POLICY IF EXISTS "Agency reads ticket assets" ON storage.objects;
DROP POLICY IF EXISTS "Agency uploads ticket assets" ON storage.objects;

-- Agency members can only read files under their own agency's folder
CREATE POLICY "Agency reads own ticket assets"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'ticket-assets'
  AND (storage.foldername(name))[1] = get_user_agency_id(auth.uid())::text
);

-- Agency members can only upload files under their own agency's folder
CREATE POLICY "Agency uploads own ticket assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'ticket-assets'
  AND (storage.foldername(name))[1] = get_user_agency_id(auth.uid())::text
);

-- Agency members can update (upsert) files under their own agency's folder
CREATE POLICY "Agency updates own ticket assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'ticket-assets'
  AND (storage.foldername(name))[1] = get_user_agency_id(auth.uid())::text
);