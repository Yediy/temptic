CREATE TABLE public.screening_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid,
  actor_user_id uuid,
  actor_roles text[] NOT NULL DEFAULT '{}',
  action text NOT NULL CHECK (action IN ('read','sign','download')),
  record_type text NOT NULL CHECK (record_type IN ('order','report','consent')),
  record_id uuid NOT NULL,
  order_id uuid,
  worker_id uuid,
  ip_address text,
  user_agent text,
  context text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX screening_access_log_agency_idx ON public.screening_access_log(agency_id, created_at DESC);
CREATE INDEX screening_access_log_record_idx ON public.screening_access_log(record_id);
GRANT SELECT ON public.screening_access_log TO authenticated;
GRANT ALL ON public.screening_access_log TO service_role;
ALTER TABLE public.screening_access_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "compliance reads agency screening access log" ON public.screening_access_log
FOR SELECT TO authenticated USING (
  private.has_role(auth.uid(),'super_admin')
  OR EXISTS (SELECT 1 FROM public.agency_members am
    WHERE am.agency_id = screening_access_log.agency_id AND am.user_id = auth.uid()
      AND am.is_active AND am.role::text IN ('agency_admin','agency_owner','compliance_specialist'))
);

CREATE OR REPLACE FUNCTION private.screening_resolve(_type text, _id uuid,
  OUT agency_id uuid, OUT order_id uuid, OUT worker_id uuid)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _type = 'order' THEN
    SELECT o.agency_id, o.id, o.worker_id INTO agency_id, order_id, worker_id FROM screening_orders o WHERE o.id = _id;
  ELSIF _type = 'report' THEN
    SELECT o.agency_id, o.id, o.worker_id INTO agency_id, order_id, worker_id
      FROM screening_reports r JOIN screening_orders o ON o.id = r.order_id WHERE r.id = _id;
  ELSIF _type = 'consent' THEN
    SELECT o.agency_id, c.order_id, c.worker_id INTO agency_id, order_id, worker_id
      FROM screening_consents c LEFT JOIN screening_orders o ON o.id = c.order_id WHERE c.id = _id;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION private.screening_can_access(_uid uuid, _agency uuid, _worker uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM agency_members am WHERE am.user_id = _uid AND am.agency_id = _agency)
      OR EXISTS (SELECT 1 FROM workers w WHERE w.id = _worker AND w.user_id = _uid)
$$;

CREATE OR REPLACE FUNCTION private.screening_write_log(_action text, _type text, _id uuid, _context text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; hdr json; roles text[];
BEGIN
  SELECT * INTO r FROM private.screening_resolve(_type, _id);
  BEGIN hdr := current_setting('request.headers', true)::json; EXCEPTION WHEN others THEN hdr := NULL; END;
  SELECT coalesce(array_agg(DISTINCT role::text), '{}') INTO roles FROM user_roles WHERE user_id = auth.uid();
  INSERT INTO screening_access_log(agency_id, actor_user_id, actor_roles, action, record_type, record_id, order_id, worker_id, ip_address, user_agent, context)
  VALUES (r.agency_id, auth.uid(), roles, _action, _type, _id, r.order_id, r.worker_id,
    split_part(coalesce(hdr->>'x-forwarded-for', ''), ',', 1), left(hdr->>'user-agent', 500), left(_context, 200));
END $$;

-- Log reads of one or many records (only ones the caller may actually see)
CREATE OR REPLACE FUNCTION public.log_screening_access(_record_type text, _record_ids uuid[], _context text DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE rid uuid; r record; n int := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501'; END IF;
  IF _record_type NOT IN ('order','report','consent') THEN RAISE EXCEPTION 'invalid record type'; END IF;
  IF coalesce(array_length(_record_ids,1),0) > 500 THEN RAISE EXCEPTION 'too many records'; END IF;
  FOREACH rid IN ARRAY coalesce(_record_ids, '{}') LOOP
    SELECT * INTO r FROM private.screening_resolve(_record_type, rid);
    IF r.order_id IS NOT NULL OR r.worker_id IS NOT NULL THEN
      IF private.screening_can_access(auth.uid(), r.agency_id, r.worker_id) THEN
        PERFORM private.screening_write_log('read', _record_type, rid, _context); n := n + 1;
      END IF;
    END IF;
  END LOOP;
  RETURN n;
END $$;

-- Return a document link and log the download
CREATE OR REPLACE FUNCTION public.get_screening_document(_record_type text, _record_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; url text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501'; END IF;
  SELECT * INTO r FROM private.screening_resolve(_record_type, _record_id);
  IF NOT private.screening_can_access(auth.uid(), r.agency_id, r.worker_id) THEN
    RAISE EXCEPTION 'access denied' USING ERRCODE = '42501';
  END IF;
  IF _record_type = 'report' THEN SELECT document_url INTO url FROM screening_reports WHERE id = _record_id;
  ELSIF _record_type = 'consent' THEN SELECT document_url INTO url FROM screening_consents WHERE id = _record_id;
  ELSE RAISE EXCEPTION 'no document for this record type'; END IF;
  PERFORM private.screening_write_log('download', _record_type, _record_id, NULL);
  RETURN url;
END $$;

-- Worker signs own consent
CREATE OR REPLACE FUNCTION public.sign_screening_consent(_consent_id uuid)
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ts timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501'; END IF;
  UPDATE screening_consents c SET signed_at = now()
   WHERE c.id = _consent_id AND c.signed_at IS NULL
     AND EXISTS (SELECT 1 FROM workers w WHERE w.id = c.worker_id AND w.user_id = auth.uid())
  RETURNING signed_at INTO ts;
  IF ts IS NULL THEN RAISE EXCEPTION 'consent not found, not yours, or already signed' USING ERRCODE = '42501'; END IF;
  RETURN ts; -- sign is logged by trigger
END $$;

-- Any signing (app or server) is logged
CREATE OR REPLACE FUNCTION private.screening_consent_sign_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.signed_at IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.signed_at IS NULL) THEN
    PERFORM private.screening_write_log('sign', 'consent', NEW.id, TG_OP);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_screening_consent_sign_audit AFTER INSERT OR UPDATE OF signed_at ON public.screening_consents
FOR EACH ROW EXECUTE FUNCTION private.screening_consent_sign_audit();

REVOKE ALL ON FUNCTION private.screening_resolve(text,uuid), private.screening_can_access(uuid,uuid,uuid),
  private.screening_write_log(text,text,uuid,text), private.screening_consent_sign_audit() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_screening_access(text,uuid[],text), public.get_screening_document(text,uuid), public.sign_screening_consent(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_screening_access(text,uuid[],text), public.get_screening_document(text,uuid), public.sign_screening_consent(uuid) TO authenticated;