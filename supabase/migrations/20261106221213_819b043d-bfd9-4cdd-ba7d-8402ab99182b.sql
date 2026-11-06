ALTER FUNCTION public.log_screening_access(text,uuid[],text) SET SCHEMA private;
ALTER FUNCTION public.get_screening_document(text,uuid) SET SCHEMA private;
ALTER FUNCTION public.sign_screening_consent(uuid) SET SCHEMA private;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.log_screening_access(text,uuid[],text), private.get_screening_document(text,uuid), private.sign_screening_consent(uuid) TO authenticated;

CREATE FUNCTION public.log_screening_access(_record_type text, _record_ids uuid[], _context text DEFAULT NULL)
RETURNS integer LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$ SELECT private.log_screening_access(_record_type, _record_ids, _context) $$;
CREATE FUNCTION public.get_screening_document(_record_type text, _record_id uuid)
RETURNS text LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$ SELECT private.get_screening_document(_record_type, _record_id) $$;
CREATE FUNCTION public.sign_screening_consent(_consent_id uuid)
RETURNS timestamptz LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$ SELECT private.sign_screening_consent(_consent_id) $$;
REVOKE ALL ON FUNCTION public.log_screening_access(text,uuid[],text), public.get_screening_document(text,uuid), public.sign_screening_consent(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_screening_access(text,uuid[],text), public.get_screening_document(text,uuid), public.sign_screening_consent(uuid) TO authenticated;