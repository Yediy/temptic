CREATE OR REPLACE FUNCTION private.tto_contract_access(_agency uuid, _roles text[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
 SELECT private.has_role(auth.uid(),'super_admin') OR EXISTS (SELECT 1 FROM public.agency_members am WHERE am.agency_id=_agency AND am.user_id=auth.uid() AND am.is_active AND am.role::text=ANY(_roles));
$$;
REVOKE ALL ON FUNCTION private.tto_contract_access(uuid,text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.tto_contract_access(uuid,text[]) TO authenticated, service_role;
CREATE TABLE public.tto_contracts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), agency_id uuid NOT NULL REFERENCES public.agencies(id), reference text NOT NULL,
 client_id uuid NOT NULL REFERENCES public.clients(id), site_id uuid REFERENCES public.client_sites(id), supervisor_id uuid NOT NULL REFERENCES public.client_signers(id),
 work_details text NOT NULL, pay_rate numeric NOT NULL, bill_rate numeric, currency text NOT NULL DEFAULT 'USD', starts_on date NOT NULL, ends_on date,
 created_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tto_contracts TO authenticated;
GRANT ALL ON public.tto_contracts TO service_role;
REVOKE INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER ON public.tto_contracts FROM authenticated, anon;
REVOKE SELECT ON public.tto_contracts FROM anon;
ALTER TABLE public.tto_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY contract_staff_read ON public.tto_contracts FOR SELECT TO authenticated USING (private.tto_contract_access(agency_id,ARRAY['agency_admin','agency_owner','dispatcher','scheduler','account_manager','payroll','payroll_specialist']));
CREATE INDEX tto_contracts_agency_idx ON public.tto_contracts(agency_id,created_at DESC);
CREATE INDEX tto_contracts_client_idx ON public.tto_contracts(client_id);
CREATE INDEX tto_contracts_supervisor_idx ON public.tto_contracts(supervisor_id);
CREATE INDEX tto_contracts_site_idx ON public.tto_contracts(site_id);
ALTER TABLE public.assignments ADD COLUMN contract_id uuid REFERENCES public.tto_contracts(id);
CREATE INDEX assignments_contract_idx ON public.assignments(contract_id);
CREATE UNIQUE INDEX assignment_contract_worker_start_idx ON public.assignments(contract_id,worker_id,starts_on) WHERE contract_id IS NOT NULL;
CREATE TABLE public.tto_ticket_terms (
 time_ticket_id uuid PRIMARY KEY REFERENCES public.tto_time_tickets(id), agency_id uuid NOT NULL REFERENCES public.agencies(id), contract_id uuid NOT NULL REFERENCES public.tto_contracts(id), assignment_id uuid NOT NULL REFERENCES public.assignments(id),
 contract_reference text NOT NULL, work_details text NOT NULL, pay_rate numeric NOT NULL, bill_rate numeric, currency text NOT NULL,
 supervisor_id uuid NOT NULL REFERENCES public.client_signers(id), supervisor_email text NOT NULL, worker_name text NOT NULL, worker_code text, client_name text NOT NULL, captured_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tto_ticket_terms TO authenticated;
GRANT ALL ON public.tto_ticket_terms TO service_role;
REVOKE INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER ON public.tto_ticket_terms FROM authenticated,anon;
REVOKE SELECT ON public.tto_ticket_terms FROM anon;
ALTER TABLE public.tto_ticket_terms ENABLE ROW LEVEL SECURITY;
CREATE POLICY terms_staff_read ON public.tto_ticket_terms FOR SELECT TO authenticated USING (private.tto_contract_access(agency_id,ARRAY['agency_admin','agency_owner','dispatcher','scheduler','account_manager','payroll','payroll_specialist']));
CREATE INDEX tto_ticket_terms_agency_idx ON public.tto_ticket_terms(agency_id);
CREATE INDEX tto_ticket_terms_contract_idx ON public.tto_ticket_terms(contract_id);
CREATE INDEX tto_ticket_terms_assignment_idx ON public.tto_ticket_terms(assignment_id);
CREATE INDEX tto_ticket_terms_supervisor_idx ON public.tto_ticket_terms(supervisor_id);
CREATE UNIQUE INDEX tto_assignment_work_date_idx ON public.tto_time_tickets(assignment_id,work_date) WHERE assignment_id IS NOT NULL;
CREATE OR REPLACE FUNCTION private.guard_tto_contract() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF TG_OP <> 'INSERT' THEN RAISE EXCEPTION 'Contract terms are immutable; create a new contract for changed terms'; END IF;
 IF length(trim(NEW.reference)) NOT BETWEEN 1 AND 160 OR length(trim(NEW.work_details)) NOT BETWEEN 1 AND 10000 OR NEW.pay_rate<=0 OR NEW.bill_rate<=0 OR NEW.currency !~ '^[A-Z]{3}$' OR NEW.ends_on < NEW.starts_on THEN RAISE EXCEPTION 'Valid reference, work details, positive agreed rates, currency and effective dates required'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.clients c WHERE c.id=NEW.client_id AND c.agency_id=NEW.agency_id) THEN RAISE EXCEPTION 'Contract client must belong to the agency'; END IF;
 IF NEW.site_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.client_sites s WHERE s.id=NEW.site_id AND s.client_id=NEW.client_id AND s.is_active) THEN RAISE EXCEPTION 'Contract site must belong to its client'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.client_signers s WHERE s.id=NEW.supervisor_id AND s.client_id=NEW.client_id AND s.is_active AND s.email ~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' AND (s.site_id IS NULL OR s.site_id=NEW.site_id)) THEN RAISE EXCEPTION 'Select an active contract supervisor with a recorded email for this client/site'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_tto_contract BEFORE INSERT OR UPDATE OR DELETE ON public.tto_contracts FOR EACH ROW EXECUTE FUNCTION private.guard_tto_contract();
CREATE OR REPLACE FUNCTION private.guard_contracted_assignment() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE c public.tto_contracts;
BEGIN
 IF TG_OP='UPDATE' AND OLD.contract_id IS NOT NULL AND ROW(NEW.contract_id,NEW.agency_id,NEW.worker_id,NEW.client_id,NEW.site_id,NEW.starts_on,NEW.ends_on) IS DISTINCT FROM ROW(OLD.contract_id,OLD.agency_id,OLD.worker_id,OLD.client_id,OLD.site_id,OLD.starts_on,OLD.ends_on) THEN RAISE EXCEPTION 'Contracted assignment terms cannot be changed'; END IF;
 IF NEW.contract_id IS NULL THEN RETURN NEW; END IF;
 SELECT * INTO c FROM public.tto_contracts WHERE id=NEW.contract_id;
 IF NOT FOUND OR c.agency_id<>NEW.agency_id OR c.client_id IS DISTINCT FROM NEW.client_id OR c.site_id IS DISTINCT FROM NEW.site_id THEN RAISE EXCEPTION 'Assignment must use its contract agency, client and site'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.workers w WHERE w.id=NEW.worker_id AND w.agency_id=NEW.agency_id) THEN RAISE EXCEPTION 'Assigned worker must belong to the agency'; END IF;
 IF NEW.starts_on<c.starts_on OR NEW.ends_on<NEW.starts_on OR (c.ends_on IS NOT NULL AND (NEW.ends_on IS NULL OR NEW.ends_on>c.ends_on)) THEN RAISE EXCEPTION 'Assignment dates must fall within the contract'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_contracted_assignment BEFORE INSERT OR UPDATE ON public.assignments FOR EACH ROW EXECUTE FUNCTION private.guard_contracted_assignment();
CREATE OR REPLACE FUNCTION private.capture_tto_ticket_terms() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE a public.assignments; c public.tto_contracts; s public.client_signers; w public.workers; cn text;
BEGIN
 IF TG_OP='UPDATE' THEN
   IF EXISTS(SELECT 1 FROM public.tto_ticket_terms WHERE time_ticket_id=OLD.id) AND ROW(NEW.assignment_id,NEW.agency_id,NEW.worker_id,NEW.client_id,NEW.site_id,NEW.work_date) IS DISTINCT FROM ROW(OLD.assignment_id,OLD.agency_id,OLD.worker_id,OLD.client_id,OLD.site_id,OLD.work_date) THEN RAISE EXCEPTION 'Ticket contract identity and work date are immutable'; END IF;
   RETURN NEW;
 END IF;
 SELECT * INTO a FROM public.assignments WHERE id=NEW.assignment_id FOR SHARE;
 IF NOT FOUND OR a.contract_id IS NULL OR a.status<>'active' THEN RAISE EXCEPTION 'Every new time ticket needs an active contracted assignment'; END IF;
 SELECT * INTO c FROM public.tto_contracts WHERE id=a.contract_id FOR SHARE;
 IF a.agency_id IS DISTINCT FROM NEW.agency_id OR a.worker_id IS DISTINCT FROM NEW.worker_id OR c.client_id IS DISTINCT FROM NEW.client_id OR c.site_id IS DISTINCT FROM NEW.site_id THEN RAISE EXCEPTION 'Ticket must match its assigned worker and contracted client/site'; END IF;
 IF NEW.work_date<a.starts_on OR NEW.work_date<c.starts_on OR NEW.work_date>a.ends_on OR NEW.work_date>c.ends_on THEN RAISE EXCEPTION 'Ticket work date is outside the assignment or contract'; END IF;
 SELECT * INTO s FROM public.client_signers WHERE id=c.supervisor_id;
 SELECT * INTO w FROM public.workers WHERE id=a.worker_id;
 SELECT company_name INTO cn FROM public.clients WHERE id=c.client_id;
 INSERT INTO public.tto_ticket_terms(time_ticket_id,agency_id,contract_id,assignment_id,contract_reference,work_details,pay_rate,bill_rate,currency,supervisor_id,supervisor_email,worker_name,worker_code,client_name)
 VALUES(NEW.id,NEW.agency_id,c.id,a.id,c.reference,c.work_details,c.pay_rate,c.bill_rate,c.currency,s.id,s.email,concat_ws(' ',w.first_name,w.last_name),w.worker_code,cn);
 RETURN NEW;
END $$;
CREATE TRIGGER capture_tto_ticket_terms AFTER INSERT OR UPDATE ON public.tto_time_tickets FOR EACH ROW EXECUTE FUNCTION private.capture_tto_ticket_terms();
CREATE OR REPLACE FUNCTION private.immutable_tto_terms() RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$ BEGIN RAISE EXCEPTION 'Ticket agreed terms are immutable'; END $$;
CREATE TRIGGER immutable_tto_terms BEFORE UPDATE OR DELETE ON public.tto_ticket_terms FOR EACH ROW EXECUTE FUNCTION private.immutable_tto_terms();
CREATE OR REPLACE FUNCTION public.create_tto_contract(_agency_id uuid,_reference text,_client_id uuid,_site_id uuid,_supervisor_id uuid,_work_details text,_pay_rate numeric,_bill_rate numeric,_currency text,_starts_on date,_ends_on date)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE cid uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT private.tto_contract_access(_agency_id,ARRAY['agency_admin','agency_owner']) THEN RAISE EXCEPTION 'Agency administrator access required' USING ERRCODE='42501'; END IF;
 INSERT INTO public.tto_contracts(agency_id,reference,client_id,site_id,supervisor_id,work_details,pay_rate,bill_rate,currency,starts_on,ends_on,created_by)
 VALUES(_agency_id,trim(_reference),_client_id,_site_id,_supervisor_id,trim(_work_details),_pay_rate,_bill_rate,upper(_currency),_starts_on,_ends_on,auth.uid()) RETURNING id INTO cid;
 INSERT INTO public.tto_audit_events(agency_id,actor_id,actor_kind,action,updated_value) VALUES(_agency_id,auth.uid(),'agency','contract.created',jsonb_build_object('contract_id',cid));
 RETURN cid;
END $$;
CREATE OR REPLACE FUNCTION public.create_tto_assignment(_contract_id uuid,_worker_id uuid,_starts_on date,_ends_on date)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE c public.tto_contracts; aid uuid;
BEGIN
 SELECT * INTO c FROM public.tto_contracts WHERE id=_contract_id;
 IF NOT FOUND OR auth.uid() IS NULL OR NOT private.tto_contract_access(c.agency_id,ARRAY['agency_admin','agency_owner','dispatcher','scheduler','account_manager']) THEN RAISE EXCEPTION 'Contract access denied' USING ERRCODE='42501'; END IF;
 INSERT INTO public.assignments(agency_id,contract_id,worker_id,client_id,site_id,starts_on,ends_on,status) VALUES(c.agency_id,c.id,_worker_id,c.client_id,c.site_id,_starts_on,_ends_on,'active') RETURNING id INTO aid;
 INSERT INTO public.tto_audit_events(agency_id,actor_id,actor_kind,action,updated_value) VALUES(c.agency_id,auth.uid(),'agency','assignment.created',jsonb_build_object('assignment_id',aid,'contract_id',c.id));
 RETURN aid;
END $$;
CREATE OR REPLACE FUNCTION public.create_contracted_time_ticket(_assignment_id uuid,_work_date date,_actual_start timestamptz DEFAULT NULL,_actual_end timestamptz DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE a public.assignments; tid uuid;
BEGIN
 SELECT * INTO a FROM public.assignments WHERE id=_assignment_id FOR SHARE;
 IF NOT FOUND OR auth.uid() IS NULL OR NOT private.tto_contract_access(a.agency_id,ARRAY['agency_admin','agency_owner','dispatcher','scheduler','account_manager']) THEN RAISE EXCEPTION 'Assignment access denied' USING ERRCODE='42501'; END IF;
 IF (_actual_start IS NULL) <> (_actual_end IS NULL) OR _actual_end<=_actual_start OR _actual_end>now() THEN RAISE EXCEPTION 'Provide both real worked timestamps, in order, not in the future'; END IF;
 INSERT INTO public.tto_time_tickets(agency_id,assignment_id,worker_id,client_id,site_id,work_date,actual_start,actual_end,status)
 VALUES(a.agency_id,a.id,a.worker_id,a.client_id,a.site_id,_work_date,_actual_start,_actual_end,'open') RETURNING id INTO tid;
 IF _actual_start IS NOT NULL THEN
 INSERT INTO public.tto_time_entries(agency_id,time_ticket_id,worker_id,kind,source,occurred_at,metadata) VALUES(a.agency_id,tid,a.worker_id,'clock_in','supervisor',_actual_start,jsonb_build_object('recorded_by',auth.uid())),(a.agency_id,tid,a.worker_id,'clock_out','supervisor',_actual_end,jsonb_build_object('recorded_by',auth.uid()));
 END IF;
 INSERT INTO public.tto_audit_events(agency_id,time_ticket_id,actor_id,actor_kind,action,updated_value) VALUES(a.agency_id,tid,auth.uid(),'agency','ticket.created_from_assignment',jsonb_build_object('assignment_id',a.id,'contract_id',a.contract_id,'recorded_time',_actual_start IS NOT NULL));
 RETURN tid;
END $$;
REVOKE ALL ON FUNCTION public.create_tto_contract(uuid,text,uuid,uuid,uuid,text,numeric,numeric,text,date,date),public.create_tto_assignment(uuid,uuid,date,date),public.create_contracted_time_ticket(uuid,date,timestamptz,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_tto_contract(uuid,text,uuid,uuid,uuid,text,numeric,numeric,text,date,date),public.create_tto_assignment(uuid,uuid,date,date),public.create_contracted_time_ticket(uuid,date,timestamptz,timestamptz) TO authenticated;
NOTIFY pgrst,'reload schema';