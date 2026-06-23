
-- 1) Private schema for internal SECURITY DEFINER helpers (not exposed via PostgREST)
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, anon, service_role;

-- 2) Move RLS-helper functions out of public.
ALTER FUNCTION public.has_role(uuid, public.app_role)         SET SCHEMA private;
ALTER FUNCTION public.current_user_has_role(public.app_role)  SET SCHEMA private;
ALTER FUNCTION public.get_user_agency_id(uuid)                SET SCHEMA private;
ALTER FUNCTION public.get_user_client_id(uuid)                SET SCHEMA private;
ALTER FUNCTION public.get_user_worker_id(uuid)                SET SCHEMA private;
ALTER FUNCTION public.current_user_agency_ids()               SET SCHEMA private;
ALTER FUNCTION public.current_user_client_ids()               SET SCHEMA private;
ALTER FUNCTION public.current_user_worker_ids()               SET SCHEMA private;
ALTER FUNCTION public.is_demo_agency(uuid)                    SET SCHEMA private;
ALTER FUNCTION public.current_user_is_demo()                  SET SCHEMA private;

REVOKE EXECUTE ON FUNCTION private.has_role(uuid, public.app_role)        FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.current_user_has_role(public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.get_user_agency_id(uuid)               FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.get_user_client_id(uuid)               FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.get_user_worker_id(uuid)               FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.current_user_agency_ids()              FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.current_user_client_ids()              FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.current_user_worker_ids()              FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.is_demo_agency(uuid)                   FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.current_user_is_demo()                 FROM PUBLIC;

GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role)        TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION private.current_user_has_role(public.app_role) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION private.get_user_agency_id(uuid)               TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION private.get_user_client_id(uuid)               TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION private.get_user_worker_id(uuid)               TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION private.current_user_agency_ids()              TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION private.current_user_client_ids()              TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION private.current_user_worker_ids()              TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION private.is_demo_agency(uuid)                   TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION private.current_user_is_demo()                 TO authenticated, anon, service_role;

-- 3) Revoke API access on trigger-only and service-only SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                          FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_worker_identity_columns()          FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_signer_identity_columns()          FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_worker_user_id_assignment()        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_audit_log_insert()                FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sanitize_download_log_audit_fields()       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sanitize_signature_audit_fields()          FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.next_ticket_number(uuid)                   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer)   FROM PUBLIC, anon, authenticated;

-- register_agency stays callable by authenticated (it IS an intentional RPC).
REVOKE EXECUTE ON FUNCTION public.register_agency(text)           FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.register_agency(text, uuid)     FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.register_agency(text)           TO authenticated, service_role;

-- 4) Lock down rate_limits explicitly
CREATE POLICY "rate_limits service role only"
  ON public.rate_limits
  FOR ALL
  TO authenticated, anon
  USING (false)
  WITH CHECK (false);
