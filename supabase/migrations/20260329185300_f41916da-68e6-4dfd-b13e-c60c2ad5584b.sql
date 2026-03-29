
CREATE OR REPLACE FUNCTION public.hash_invite_token()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.client_invites
  SET token_hash = encode(extensions.digest(NEW.token::bytea, 'sha256'), 'hex'),
      token = 'REDACTED'
  WHERE id = NEW.id;
  RETURN NULL;
END;
$function$;
