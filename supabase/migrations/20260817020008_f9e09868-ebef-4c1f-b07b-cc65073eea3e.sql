
-- 1. Trigger: only service_role may write reputation scoring fields; owners may only toggle dispute fields.
CREATE OR REPLACE FUNCTION public.enforce_reputation_write_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r text := current_setting('request.jwt.claim.role', true);
BEGIN
  IF r IS NULL THEN
    r := coalesce((current_setting('request.jwt.claims', true)::jsonb ->> 'role'), '');
  END IF;

  -- service_role (edge functions / backend) has full control
  IF r = 'service_role' OR current_user = 'service_role' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP <> 'UPDATE' THEN
    RAISE EXCEPTION 'passport_reputation rows may only be created or removed by the system';
  END IF;

  IF NEW.passport_id IS DISTINCT FROM OLD.passport_id
     OR NEW.category IS DISTINCT FROM OLD.category
     OR NEW.score IS DISTINCT FROM OLD.score
     OR NEW.sample_size IS DISTINCT FROM OLD.sample_size
     OR NEW.source IS DISTINCT FROM OLD.source
     OR NEW.agency_id IS DISTINCT FROM OLD.agency_id
     OR NEW.last_computed_at IS DISTINCT FROM OLD.last_computed_at
     OR NEW.metadata IS DISTINCT FROM OLD.metadata
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'only dispute fields may be modified on passport_reputation';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_passport_reputation_write_scope ON public.passport_reputation;
CREATE TRIGGER trg_passport_reputation_write_scope
BEFORE INSERT OR UPDATE OR DELETE ON public.passport_reputation
FOR EACH ROW EXECUTE FUNCTION public.enforce_reputation_write_scope();

-- 2. Column-level grants: authenticated may only update dispute fields; no insert/delete.
REVOKE INSERT, UPDATE, DELETE ON public.passport_reputation FROM authenticated;
REVOKE ALL ON public.passport_reputation FROM anon;
GRANT SELECT ON public.passport_reputation TO authenticated;
GRANT UPDATE (disputed, dispute_reason, updated_at) ON public.passport_reputation TO authenticated;
GRANT ALL ON public.passport_reputation TO service_role;

-- 3. RLS policies
DROP POLICY IF EXISTS "Owners can dispute reputation" ON public.passport_reputation;
CREATE POLICY "Owners can flag reputation disputes"
ON public.passport_reputation
FOR UPDATE
TO authenticated
USING (private.passport_owner_user_id(passport_id) = auth.uid())
WITH CHECK (private.passport_owner_user_id(passport_id) = auth.uid());
