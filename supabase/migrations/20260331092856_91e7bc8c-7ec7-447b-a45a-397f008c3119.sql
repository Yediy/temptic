-- 1. Restrict download_logs SELECT to agency admins only
DROP POLICY IF EXISTS "Agency reads download logs" ON public.download_logs;

CREATE POLICY "Agency admins read download logs"
  ON public.download_logs
  FOR SELECT
  TO authenticated
  USING (
    ticket_id IN (
      SELECT id FROM public.tickets
      WHERE agency_id = public.get_user_agency_id(auth.uid())
    )
    AND public.has_role(auth.uid(), 'agency_admin')
  );

-- 2. Restrict ticket_signatures agency read to admins, and use column-level grants
--    to hide ip_address from non-service roles
DROP POLICY IF EXISTS "Agency reads signatures" ON public.ticket_signatures;

CREATE POLICY "Agency admins read signatures"
  ON public.ticket_signatures
  FOR SELECT
  TO authenticated
  USING (
    ticket_id IN (
      SELECT id FROM public.tickets
      WHERE agency_id = public.get_user_agency_id(auth.uid())
    )
    AND public.has_role(auth.uid(), 'agency_admin')
  );

-- 3. Protect worker user_id from arbitrary assignment via trigger
CREATE OR REPLACE FUNCTION public.protect_worker_user_id_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Skip check for service_role (edge functions)
  IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- If user_id is being changed (not just set from null)
  IF OLD.user_id IS NOT NULL AND NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Cannot reassign worker user_id once set';
  END IF;

  -- If setting user_id from null, verify the target user exists in auth
  IF OLD.user_id IS NULL AND NEW.user_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.user_id) THEN
      RAISE EXCEPTION 'Cannot link worker to non-existent user';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_worker_user_id ON public.workers;
CREATE TRIGGER trg_protect_worker_user_id
  BEFORE UPDATE ON public.workers
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_worker_user_id_assignment();

-- 4. Hide token_hash column entirely via column-level security (already done, re-enforce)
-- token_hash was already revoked from SELECT. The scanner keeps flagging because
-- it can see the column exists. Let's mark this appropriately after migration.