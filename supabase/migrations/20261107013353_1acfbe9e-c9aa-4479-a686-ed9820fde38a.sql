CREATE OR REPLACE FUNCTION private.publish_module_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _module text := TG_ARGV[0];
  _prefix text := TG_ARGV[1];
  _row jsonb; _old jsonb; _name text; _agency uuid; _meta jsonb; _eid uuid; _new_id uuid;
  _deny text[] := ARRAY['email','phone','ip_address','user_agent','signature_image_url','storage_path','pdf_storage_path',
    'notes','typed_name','middle_name','billing_email','billing_phone','supervisor_notes','worker_notes','file_name','content_sha256','description'];
  k text;
BEGIN
  _row := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  _old := CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END;

  IF TG_OP = 'INSERT' THEN
    _name := _prefix || CASE _prefix WHEN 'candidate' THEN '.applied' WHEN 'shift' THEN '.scheduled'
                                     WHEN 'document' THEN CASE WHEN TG_TABLE_NAME = 'document_signatures' THEN '.signed' ELSE '.uploaded' END
                                     ELSE '.created' END;
  ELSIF TG_OP = 'DELETE' THEN
    _name := _prefix || CASE WHEN _prefix = 'shift' THEN '.cancelled' ELSE '.deleted' END;
  ELSE
    IF _row ? 'status' AND (_row->>'status') IS DISTINCT FROM (_old->>'status') THEN
      _name := _prefix || '.' || lower(_row->>'status');
    ELSIF _row ? 'is_active' AND (_row->>'is_active') IS DISTINCT FROM (_old->>'is_active') THEN
      _name := _prefix || CASE WHEN (_row->>'is_active')::boolean THEN '.reactivated' ELSE '.deactivated' END;
    ELSIF _prefix IN ('worker','client') THEN
      _name := _prefix || '.updated';
    ELSE
      RETURN NULL; -- non-status edits on transactional records are not events
    END IF;
  END IF;

  _agency := NULLIF(_row->>'agency_id','')::uuid;
  IF _agency IS NULL AND _row ? 'worker_id' THEN
    SELECT w.agency_id INTO _agency FROM workers w WHERE w.id = (_row->>'worker_id')::uuid;
  END IF;
  IF _agency IS NULL THEN RETURN NULL; END IF;

  _meta := _row;
  FOREACH k IN ARRAY _deny LOOP _meta := _meta - k; END LOOP;
  IF _old IS NOT NULL AND _old ? 'status' THEN _meta := _meta || jsonb_build_object('previous_status', _old->>'status'); END IF;
  _meta := _meta || jsonb_build_object('source', 'db_trigger', 'operation', lower(TG_OP), 'table', TG_TABLE_NAME,
    'search_title', initcap(_prefix) || ' ' || left(_row->>'id', 8));
  _eid := NULLIF(_row->>'id','')::uuid;

  BEGIN
    INSERT INTO ttos_events(agency_id, module, name, actor_id, entity_type, entity_id, metadata)
    VALUES (_agency, _module, _name, auth.uid(), TG_TABLE_NAME, _eid, _meta)
    RETURNING id INTO _new_id;
    BEGIN
      PERFORM net.http_post(
        url := 'https://nwyjqphqszonzlulezsq.supabase.co/functions/v1/ttos-dispatch',
        headers := jsonb_build_object('Content-Type','application/json','Authorization',
          'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53eWpxcGhxc3pvbnpsdWxlenNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMTg0OTUsImV4cCI6MjA4OTU5NDQ5NX0.hfKgD7Od9EhORBLR6wAiPMu3pFbYbL26wB1FMd_m0AM'),
        body := jsonb_build_object('event_id', _new_id));
    EXCEPTION WHEN others THEN NULL; -- cron sweep will pick it up
    END;
  EXCEPTION WHEN others THEN
    RAISE WARNING 'publish_module_event failed for %: %', TG_TABLE_NAME, SQLERRM;
  END;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION private.publish_module_event() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_publish_event AFTER INSERT OR UPDATE OR DELETE ON public.workers FOR EACH ROW EXECUTE FUNCTION private.publish_module_event('workers','worker');
CREATE TRIGGER trg_publish_event AFTER INSERT OR UPDATE OF status OR DELETE ON public.applications FOR EACH ROW EXECUTE FUNCTION private.publish_module_event('candidates','candidate');
CREATE TRIGGER trg_publish_event AFTER INSERT OR UPDATE OF status ON public.job_orders FOR EACH ROW EXECUTE FUNCTION private.publish_module_event('candidates','job');
CREATE TRIGGER trg_publish_event AFTER INSERT OR UPDATE OR DELETE ON public.clients FOR EACH ROW EXECUTE FUNCTION private.publish_module_event('clients','client');
CREATE TRIGGER trg_publish_event AFTER INSERT OR UPDATE OF status ON public.placements FOR EACH ROW EXECUTE FUNCTION private.publish_module_event('assignments','placement');
CREATE TRIGGER trg_publish_event AFTER INSERT OR UPDATE OF status ON public.assignments FOR EACH ROW EXECUTE FUNCTION private.publish_module_event('assignments','assignment');
CREATE TRIGGER trg_publish_event AFTER INSERT OR UPDATE OF status OR DELETE ON public.shifts FOR EACH ROW EXECUTE FUNCTION private.publish_module_event('scheduling','shift');
CREATE TRIGGER trg_publish_event AFTER INSERT OR UPDATE OF status ON public.pb_payroll_runs FOR EACH ROW EXECUTE FUNCTION private.publish_module_event('payroll','payroll');
CREATE TRIGGER trg_publish_event AFTER INSERT ON public.worker_documents FOR EACH ROW EXECUTE FUNCTION private.publish_module_event('documents','document');
CREATE TRIGGER trg_publish_event AFTER INSERT ON public.document_signatures FOR EACH ROW EXECUTE FUNCTION private.publish_module_event('documents','document');
