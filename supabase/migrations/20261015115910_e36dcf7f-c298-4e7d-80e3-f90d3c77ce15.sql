ALTER TABLE public.tto_payroll_batches ADD COLUMN IF NOT EXISTS file_path text, ADD COLUMN IF NOT EXISTS exported_at timestamptz, ADD COLUMN IF NOT EXISTS exported_by uuid;
ALTER TABLE public.tto_billing_batches ADD COLUMN IF NOT EXISTS file_path text, ADD COLUMN IF NOT EXISTS exported_at timestamptz, ADD COLUMN IF NOT EXISTS exported_by uuid;

CREATE UNIQUE INDEX IF NOT EXISTS tto_payroll_batches_open_week ON public.tto_payroll_batches (agency_id, period_start) WHERE status = 'open';
CREATE UNIQUE INDEX IF NOT EXISTS tto_billing_batches_open_week ON public.tto_billing_batches (agency_id, (coalesce(client_id, '00000000-0000-0000-0000-000000000000'::uuid)), period_start) WHERE status = 'open';

CREATE OR REPLACE FUNCTION public.tto_rollup_ticket(_ticket_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t record; ws date; we date;
BEGIN
  SELECT * INTO t FROM tto_time_tickets WHERE id = _ticket_id;
  IF t IS NULL THEN RETURN; END IF;
  ws := date_trunc('week', t.work_date)::date; we := ws + 6;
  -- skip if already in any batch
  IF NOT EXISTS (SELECT 1 FROM tto_payroll_batches WHERE agency_id = t.agency_id AND _ticket_id = ANY(ticket_ids)) THEN
    INSERT INTO tto_payroll_batches (agency_id, name, period_start, period_end, status, ticket_ids, totals)
    VALUES (t.agency_id, 'Payroll week of ' || to_char(ws, 'Mon DD, YYYY'), ws, we, 'open', ARRAY[_ticket_id], '{}'::jsonb)
    ON CONFLICT (agency_id, period_start) WHERE status = 'open'
    DO UPDATE SET ticket_ids = tto_payroll_batches.ticket_ids || EXCLUDED.ticket_ids, updated_at = now();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM tto_billing_batches WHERE agency_id = t.agency_id AND _ticket_id = ANY(ticket_ids)) THEN
    INSERT INTO tto_billing_batches (agency_id, client_id, name, period_start, period_end, status, ticket_ids, totals)
    VALUES (t.agency_id, t.client_id, 'Billing week of ' || to_char(ws, 'Mon DD, YYYY'), ws, we, 'open', ARRAY[_ticket_id], '{}'::jsonb)
    ON CONFLICT (agency_id, (coalesce(client_id, '00000000-0000-0000-0000-000000000000'::uuid)), period_start) WHERE status = 'open'
    DO UPDATE SET ticket_ids = tto_billing_batches.ticket_ids || EXCLUDED.ticket_ids, updated_at = now();
  END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public.tto_rollup_ticket(uuid) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.tto_on_ticket_approved() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'approved' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'approved') THEN
    PERFORM public.tto_rollup_ticket(NEW.id);
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.tto_on_ticket_approved() FROM public, anon, authenticated;
DROP TRIGGER IF EXISTS trg_tto_ticket_rollup ON public.tto_time_tickets;
CREATE TRIGGER trg_tto_ticket_rollup AFTER INSERT OR UPDATE OF status ON public.tto_time_tickets FOR EACH ROW EXECUTE FUNCTION public.tto_on_ticket_approved();

DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT id FROM public.tto_time_tickets WHERE status = 'approved' LOOP PERFORM public.tto_rollup_ticket(r.id); END LOOP;
END $$;

CREATE POLICY tto_exports_staff_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'tto-exports'
    AND (storage.foldername(name))[1]::uuid IN (SELECT private.current_user_agency_ids())
    AND (private.has_role(auth.uid(),'agency_admin') OR private.has_role(auth.uid(),'payroll') OR private.has_role(auth.uid(),'payroll_specialist') OR private.has_role(auth.uid(),'billing_specialist')));