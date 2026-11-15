ALTER TABLE public.screening_reports ADD COLUMN document_version integer NOT NULL DEFAULT 1;
ALTER TABLE public.screening_consents ADD COLUMN document_version integer NOT NULL DEFAULT 1, ADD COLUMN consent_text text;
ALTER TABLE public.screening_access_log ADD COLUMN document_version integer;

CREATE OR REPLACE FUNCTION private.screening_document_version() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF TG_OP='INSERT' THEN NEW.document_version := 1; RETURN NEW; END IF;
 IF TG_TABLE_NAME='screening_reports' THEN
  IF NEW.result IS DISTINCT FROM OLD.result OR NEW.summary IS DISTINCT FROM OLD.summary OR NEW.document_url IS DISTINCT FROM OLD.document_url THEN NEW.document_version := OLD.document_version+1; ELSE NEW.document_version := OLD.document_version; END IF;
 ELSE
  IF NEW.worker_id IS DISTINCT FROM OLD.worker_id OR NEW.order_id IS DISTINCT FROM OLD.order_id OR NEW.consent_type IS DISTINCT FROM OLD.consent_type OR NEW.consent_text IS DISTINCT FROM OLD.consent_text OR NEW.document_url IS DISTINCT FROM OLD.document_url THEN
   IF OLD.signed_at IS NOT NULL THEN RAISE EXCEPTION 'Signed consent is immutable; create a new consent record'; END IF;
   NEW.document_version := OLD.document_version+1;
  ELSE NEW.document_version := OLD.document_version; END IF;
  IF OLD.signed_at IS NOT NULL AND NEW.signed_at IS DISTINCT FROM OLD.signed_at THEN RAISE EXCEPTION 'Signature is immutable'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER screening_report_version BEFORE INSERT OR UPDATE ON public.screening_reports FOR EACH ROW EXECUTE FUNCTION private.screening_document_version();
CREATE TRIGGER screening_consent_version BEFORE INSERT OR UPDATE ON public.screening_consents FOR EACH ROW EXECUTE FUNCTION private.screening_document_version();

CREATE OR REPLACE FUNCTION private.screening_write_log(_action text,_type text,_id uuid,_context text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r record; hdr json; roles text[]; v integer;
BEGIN
 SELECT * INTO r FROM private.screening_resolve(_type,_id);
 IF _type='report' THEN SELECT document_version INTO v FROM public.screening_reports WHERE id=_id;
 ELSIF _type='consent' THEN SELECT document_version INTO v FROM public.screening_consents WHERE id=_id; END IF;
 BEGIN hdr:=current_setting('request.headers',true)::json; EXCEPTION WHEN others THEN hdr:=NULL; END;
 SELECT coalesce(array_agg(DISTINCT role::text),'{}') INTO roles FROM public.user_roles WHERE user_id=auth.uid();
 INSERT INTO public.screening_access_log(agency_id,actor_user_id,actor_roles,action,record_type,record_id,order_id,worker_id,ip_address,user_agent,context,document_version)
 VALUES(r.agency_id,auth.uid(),roles,_action,_type,_id,r.order_id,r.worker_id,split_part(coalesce(hdr->>'x-forwarded-for',''),',',1),left(hdr->>'user-agent',500),left(_context,200),v);
END $$;

CREATE OR REPLACE FUNCTION public.read_worker_screening(_record_type text,_record_id uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE item record; result jsonb:='[]'::jsonb;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated' USING ERRCODE='42501'; END IF;
 IF _record_type='report' THEN
  FOR item IN SELECT r.* FROM public.screening_reports r JOIN public.screening_orders o ON o.id=r.order_id JOIN public.workers w ON w.id=o.worker_id WHERE w.user_id=auth.uid() AND (_record_id IS NULL OR r.id=_record_id) ORDER BY r.received_at DESC FOR SHARE OF r LOOP
   PERFORM private.screening_write_log('read','report',item.id,'worker screening');
   result:=result || jsonb_build_array(to_jsonb(item)-'document_url' || jsonb_build_object('has_document',item.document_url IS NOT NULL));
  END LOOP;
 ELSIF _record_type='consent' THEN
  FOR item IN SELECT c.* FROM public.screening_consents c JOIN public.workers w ON w.id=c.worker_id WHERE w.user_id=auth.uid() AND (_record_id IS NULL OR c.id=_record_id) ORDER BY c.created_at DESC FOR SHARE OF c LOOP
   PERFORM private.screening_write_log('read','consent',item.id,'worker screening');
   result:=result || jsonb_build_array(to_jsonb(item)-'document_url'-'ip_address'-'user_agent' || jsonb_build_object('has_document',item.document_url IS NOT NULL));
  END LOOP;
 ELSE RAISE EXCEPTION 'invalid record type'; END IF;
 RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.sign_screening_consent_version(_consent_id uuid,_expected_version integer) RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.screening_consents;
BEGIN
 SELECT sc.* INTO c FROM public.screening_consents sc JOIN public.workers w ON w.id=sc.worker_id WHERE sc.id=_consent_id AND w.user_id=auth.uid() FOR UPDATE OF sc;
 IF NOT FOUND THEN RAISE EXCEPTION 'Consent not found or not yours' USING ERRCODE='42501'; END IF;
 IF c.document_version<>_expected_version THEN RAISE EXCEPTION 'Consent changed; reload and review the latest version'; END IF;
 IF nullif(trim(c.consent_text),'') IS NULL THEN RAISE EXCEPTION 'Consent wording is not available; contact your agency'; END IF;
 RETURN private.sign_screening_consent(_consent_id);
END $$;

CREATE OR REPLACE FUNCTION public.download_worker_screening(_record_type text,_record_id uuid,_expected_version integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE item jsonb; v integer; url text;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated' USING ERRCODE='42501'; END IF;
 IF _record_type='report' THEN
  SELECT to_jsonb(r),r.document_version INTO item,v FROM public.screening_reports r JOIN public.screening_orders o ON o.id=r.order_id JOIN public.workers w ON w.id=o.worker_id WHERE r.id=_record_id AND w.user_id=auth.uid() FOR SHARE OF r;
 ELSIF _record_type='consent' THEN
  SELECT to_jsonb(c)-'ip_address'-'user_agent',c.document_version INTO item,v FROM public.screening_consents c JOIN public.workers w ON w.id=c.worker_id WHERE c.id=_record_id AND w.user_id=auth.uid() FOR SHARE OF c;
 ELSE RAISE EXCEPTION 'invalid record type'; END IF;
 IF item IS NULL THEN RAISE EXCEPTION 'Document not found or not yours' USING ERRCODE='42501'; END IF;
 IF v<>_expected_version THEN RAISE EXCEPTION 'Document changed; reload the latest version'; END IF;
 url:=private.get_screening_document(_record_type,_record_id);
 RETURN jsonb_build_object('record',item-'document_url','document_url',url);
END $$;
REVOKE ALL ON FUNCTION public.read_worker_screening(text,uuid),public.sign_screening_consent_version(uuid,integer),public.download_worker_screening(text,uuid,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.read_worker_screening(text,uuid),public.sign_screening_consent_version(uuid,integer),public.download_worker_screening(text,uuid,integer) TO authenticated;
REVOKE ALL ON FUNCTION private.screening_document_version() FROM PUBLIC,anon,authenticated;
NOTIFY pgrst,'reload schema';