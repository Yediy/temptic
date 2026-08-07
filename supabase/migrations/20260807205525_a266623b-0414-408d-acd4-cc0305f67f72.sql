-- 1) Remove the self-insert policy
DROP POLICY IF EXISTS "Owners insert timeline" ON public.passport_timeline;

-- 2) Revoke write privileges from client roles; service_role keeps full access
REVOKE INSERT, UPDATE, DELETE ON public.passport_timeline FROM authenticated;
REVOKE ALL ON public.passport_timeline FROM anon;
GRANT SELECT ON public.passport_timeline TO authenticated;
GRANT ALL ON public.passport_timeline TO service_role;

-- 3) Defense-in-depth trigger: only service_role may write timeline events
CREATE OR REPLACE FUNCTION public.enforce_service_role_timeline_writes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role'
     AND current_setting('role', true) IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'passport_timeline events can only be created by the system';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_passport_timeline_service_role_only ON public.passport_timeline;
CREATE TRIGGER trg_passport_timeline_service_role_only
BEFORE INSERT OR UPDATE OR DELETE ON public.passport_timeline
FOR EACH ROW EXECUTE FUNCTION public.enforce_service_role_timeline_writes();