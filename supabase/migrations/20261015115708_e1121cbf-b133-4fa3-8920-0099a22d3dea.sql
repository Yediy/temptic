CREATE TABLE public.tto_ticket_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  time_ticket_id uuid NOT NULL REFERENCES public.tto_time_tickets(id) ON DELETE CASCADE,
  time_entry_id uuid REFERENCES public.tto_time_entries(id) ON DELETE SET NULL,
  worker_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('photo','gps','expense','mileage')),
  photo_path text,
  latitude numeric, longitude numeric, accuracy_m numeric,
  category text,
  amount numeric CHECK (amount IS NULL OR amount >= 0),
  miles numeric CHECK (miles IS NULL OR miles >= 0),
  rate_per_mile numeric CHECK (rate_per_mile IS NULL OR rate_per_mile >= 0),
  mileage_total numeric GENERATED ALWAYS AS (round(coalesce(miles,0) * coalesce(rate_per_mile,0), 2)) STORED,
  note text CHECK (note IS NULL OR length(note) <= 1000),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  captured_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.tto_ticket_evidence(time_ticket_id);
CREATE INDEX ON public.tto_ticket_evidence(time_entry_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tto_ticket_evidence TO authenticated;
GRANT ALL ON public.tto_ticket_evidence TO service_role;
ALTER TABLE public.tto_ticket_evidence ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.tto_evidence_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t record; is_staff boolean;
BEGIN
  SELECT * INTO t FROM tto_time_tickets WHERE id = NEW.time_ticket_id;
  IF t IS NULL THEN RAISE EXCEPTION 'Ticket not found'; END IF;
  NEW.agency_id := t.agency_id; NEW.worker_id := t.worker_id;
  IF NEW.time_entry_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tto_time_entries e WHERE e.id = NEW.time_entry_id AND e.time_ticket_id = NEW.time_ticket_id) THEN
    RAISE EXCEPTION 'Shift event does not belong to this ticket';
  END IF;
  IF NEW.kind = 'photo' AND NEW.photo_path IS NULL THEN RAISE EXCEPTION 'Photo required'; END IF;
  IF NEW.kind = 'gps' AND (NEW.latitude IS NULL OR NEW.longitude IS NULL) THEN RAISE EXCEPTION 'Location required'; END IF;
  IF NEW.kind = 'expense' AND NEW.amount IS NULL THEN RAISE EXCEPTION 'Amount required'; END IF;
  IF NEW.kind = 'mileage' AND NEW.miles IS NULL THEN RAISE EXCEPTION 'Miles required'; END IF;
  IF NEW.photo_path IS NOT NULL AND NEW.photo_path NOT LIKE '%/' || NEW.time_ticket_id::text || '/%' THEN RAISE EXCEPTION 'Invalid photo path'; END IF;
  is_staff := private.has_role(auth.uid(),'agency_admin') OR private.has_role(auth.uid(),'recruiter') OR auth.role() = 'service_role';
  IF TG_OP = 'INSERT' THEN
    IF NOT is_staff THEN NEW.status := 'pending'; NEW.created_by := auth.uid(); END IF;
  ELSIF NOT is_staff THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN RAISE EXCEPTION 'Only agency staff can review evidence'; END IF;
    IF t.status NOT IN ('open','in_progress','rejected','corrected') THEN RAISE EXCEPTION 'Ticket is locked'; END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER trg_tto_evidence_guard BEFORE INSERT OR UPDATE ON public.tto_ticket_evidence FOR EACH ROW EXECUTE FUNCTION public.tto_evidence_guard();
REVOKE EXECUTE ON FUNCTION public.tto_evidence_guard() FROM public, anon, authenticated;

CREATE POLICY ev_staff_all ON public.tto_ticket_evidence FOR ALL TO authenticated
  USING ((private.has_role(auth.uid(),'agency_admin') OR private.has_role(auth.uid(),'recruiter')) AND agency_id IN (SELECT private.current_user_agency_ids()))
  WITH CHECK ((private.has_role(auth.uid(),'agency_admin') OR private.has_role(auth.uid(),'recruiter')) AND agency_id IN (SELECT private.current_user_agency_ids()));
CREATE POLICY ev_worker_read ON public.tto_ticket_evidence FOR SELECT TO authenticated
  USING (worker_id IN (SELECT id FROM public.workers WHERE user_id = auth.uid()));
CREATE POLICY ev_worker_insert ON public.tto_ticket_evidence FOR INSERT TO authenticated
  WITH CHECK (time_ticket_id IN (SELECT t.id FROM public.tto_time_tickets t JOIN public.workers w ON w.id = t.worker_id WHERE w.user_id = auth.uid() AND t.status IN ('open','in_progress','rejected','corrected')));
CREATE POLICY ev_worker_update ON public.tto_ticket_evidence FOR UPDATE TO authenticated
  USING (created_by = auth.uid() AND status = 'pending') WITH CHECK (created_by = auth.uid());
CREATE POLICY ev_worker_delete ON public.tto_ticket_evidence FOR DELETE TO authenticated
  USING (created_by = auth.uid() AND status = 'pending' AND time_ticket_id IN (SELECT id FROM public.tto_time_tickets WHERE status IN ('open','in_progress','rejected','corrected')));
CREATE POLICY ev_client_read ON public.tto_ticket_evidence FOR SELECT TO authenticated
  USING (time_ticket_id IN (SELECT t.id FROM public.tto_time_tickets t JOIN public.client_signers s ON s.client_id = t.client_id WHERE s.user_id = auth.uid()));

CREATE POLICY punch_photos_worker_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'punch-photos' AND (storage.foldername(name))[1] = auth.uid()::text);