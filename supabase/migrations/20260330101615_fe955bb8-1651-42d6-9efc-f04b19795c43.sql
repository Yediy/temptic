
-- 1. Hide token_hash from authenticated users (column-level security)
REVOKE SELECT (token_hash) ON public.client_invites FROM authenticated;

-- 2. BEFORE INSERT trigger on download_logs to force server-set audit fields
CREATE OR REPLACE FUNCTION public.sanitize_download_log_audit_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only allow service_role to set these fields
  IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role' THEN
    NEW.ip_address := NULL;
    NEW.user_agent := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sanitize_download_log_audit
  BEFORE INSERT ON public.download_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.sanitize_download_log_audit_fields();

-- 3. BEFORE INSERT trigger on ticket_signatures to force server-set audit fields
CREATE OR REPLACE FUNCTION public.sanitize_signature_audit_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role' THEN
    NEW.ip_address := NULL;
    NEW.user_agent := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sanitize_signature_audit
  BEFORE INSERT ON public.ticket_signatures
  FOR EACH ROW
  EXECUTE FUNCTION public.sanitize_signature_audit_fields();
