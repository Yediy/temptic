
-- Fix 1: Add trigger on workers to prevent non-service-role users from changing user_id
CREATE OR REPLACE FUNCTION public.protect_worker_identity_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) != 'service_role' THEN
    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      IF NOT public.has_role(auth.uid(), 'agency_admin') THEN
        RAISE EXCEPTION 'Only agency admins can modify worker user_id';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_protect_worker_identity
  BEFORE UPDATE ON public.workers
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_worker_identity_columns();

-- Fix 2: Restrict client_invites SELECT to agency_admin only
DROP POLICY IF EXISTS "Agency reads own invites" ON public.client_invites;
CREATE POLICY "Agency admins read own invites"
  ON public.client_invites
  FOR SELECT
  TO authenticated
  USING (
    agency_id = get_user_agency_id(auth.uid())
    AND has_role(auth.uid(), 'agency_admin'::app_role)
  );
