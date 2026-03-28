
-- Trigger to auto-hash token after insert and clear plaintext
CREATE OR REPLACE FUNCTION public.hash_invite_token()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.client_invites
  SET token_hash = encode(extensions.digest(NEW.token::bytea, 'sha256'), 'hex'),
      token = NEW.id::text
  WHERE id = NEW.id;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_hash_invite_token ON public.client_invites;
CREATE TRIGGER trg_hash_invite_token
  AFTER INSERT ON public.client_invites
  FOR EACH ROW
  EXECUTE FUNCTION public.hash_invite_token();

-- Restrict notifications SELECT to agency admins only
DROP POLICY IF EXISTS "Agency reads own notifications" ON public.notifications;

CREATE POLICY "Agency admins read own notifications"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (
    agency_id = get_user_agency_id(auth.uid())
    AND has_role(auth.uid(), 'agency_admin'::app_role)
  );
