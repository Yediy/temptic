
-- 1. Make token column nullable so it can be fully cleared
ALTER TABLE public.client_invites ALTER COLUMN token DROP NOT NULL;

-- 2. Update trigger to NULL out the token instead of 'REDACTED'
CREATE OR REPLACE FUNCTION public.hash_invite_token()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.client_invites
  SET token_hash = encode(extensions.digest(NEW.token::bytea, 'sha256'), 'hex'),
      token = NULL
  WHERE id = NEW.id;
  RETURN NULL;
END;
$function$;

-- 3. Clear any existing token values
UPDATE public.client_invites SET token = NULL WHERE token IS NOT NULL;

-- 4. Add storage SELECT policy for workers (scoped to their agency)
CREATE POLICY "Worker reads own agency ticket assets"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'ticket-assets'
  AND (storage.foldername(name))[1] = (
    SELECT agency_id::text FROM public.workers
    WHERE user_id = auth.uid() AND is_active = true
    LIMIT 1
  )
);

-- 5. Add storage SELECT policy for client signers (scoped to their client's agency)
CREATE POLICY "Client reads own agency ticket assets"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'ticket-assets'
  AND (storage.foldername(name))[1] = (
    SELECT c.agency_id::text FROM public.client_signers cs
    JOIN public.clients c ON c.id = cs.client_id
    WHERE cs.user_id = auth.uid() AND cs.is_active = true
    LIMIT 1
  )
);
