
-- 1. Add missing DELETE policy for ticket-assets storage bucket
CREATE POLICY "Agency deletes own ticket assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'ticket-assets'
  AND (storage.foldername(name))[1] = get_user_agency_id(auth.uid())::text
);

-- 2. Redact all existing token values that still contain data
UPDATE public.client_invites SET token = 'REDACTED' WHERE token != 'REDACTED';
