
-- 1. Fix: Workers should only insert worker-type signatures on their own tickets
CREATE POLICY "Worker inserts own signature"
ON public.ticket_signatures FOR INSERT TO authenticated
WITH CHECK (
  signer_type = 'worker'::signer_type
  AND ticket_id IN (
    SELECT id FROM public.tickets WHERE worker_id = get_user_worker_id(auth.uid())
  )
);

-- 2. Fix: template_field_mappings write policies for agency users
CREATE POLICY "Agency inserts mappings"
ON public.template_field_mappings FOR INSERT TO authenticated
WITH CHECK (
  template_id IN (
    SELECT id FROM public.ticket_templates
    WHERE agency_id = get_user_agency_id(auth.uid())
  )
);

CREATE POLICY "Agency updates mappings"
ON public.template_field_mappings FOR UPDATE TO authenticated
USING (
  template_id IN (
    SELECT id FROM public.ticket_templates
    WHERE agency_id = get_user_agency_id(auth.uid())
  )
)
WITH CHECK (
  template_id IN (
    SELECT id FROM public.ticket_templates
    WHERE agency_id = get_user_agency_id(auth.uid())
  )
);

CREATE POLICY "Agency deletes mappings"
ON public.template_field_mappings FOR DELETE TO authenticated
USING (
  template_id IN (
    SELECT id FROM public.ticket_templates
    WHERE agency_id = get_user_agency_id(auth.uid())
  )
);

-- 3. Fix: Restrict client signer UPDATE to non-identity columns
DROP POLICY IF EXISTS "Client updates own signer record" ON public.client_signers;

CREATE OR REPLACE FUNCTION public.protect_signer_identity_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) != 'service_role' THEN
    IF NEW.user_id IS DISTINCT FROM OLD.user_id
       OR NEW.client_id IS DISTINCT FROM OLD.client_id
       OR NEW.site_id IS DISTINCT FROM OLD.site_id THEN
      RAISE EXCEPTION 'Cannot modify identity columns (user_id, client_id, site_id)';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_signer_identity ON public.client_signers;
CREATE TRIGGER trg_protect_signer_identity
BEFORE UPDATE ON public.client_signers
FOR EACH ROW EXECUTE FUNCTION public.protect_signer_identity_columns();

CREATE POLICY "Client updates own signer record"
ON public.client_signers FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 4. Fix: Audit log INSERT validation trigger
CREATE OR REPLACE FUNCTION public.validate_audit_log_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.actor_id IS NOT NULL AND NEW.actor_id != auth.uid() THEN
    RAISE EXCEPTION 'actor_id must match authenticated user';
  END IF;
  IF NEW.actor_type NOT IN ('agency', 'client', 'worker', 'system') THEN
    RAISE EXCEPTION 'Invalid actor_type';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_audit_log ON public.audit_logs;
CREATE TRIGGER trg_validate_audit_log
BEFORE INSERT ON public.audit_logs
FOR EACH ROW EXECUTE FUNCTION public.validate_audit_log_insert();
