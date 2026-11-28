CREATE OR REPLACE FUNCTION private.guard_tto_creation_state() RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN
 IF TG_OP='INSERT' AND NEW.status<>'open' THEN RAISE EXCEPTION 'Time tickets must start open'; END IF;
 IF TG_OP='UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
   IF auth.role()='authenticated' THEN RAISE EXCEPTION 'Time ticket status changes require the secure service' USING ERRCODE='42501'; END IF;
   IF NEW.status IN ('approved','rejected','corrected') AND OLD.status<>'submitted' THEN RAISE EXCEPTION 'Only submitted tickets can receive an approval decision'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_tto_creation_state BEFORE INSERT OR UPDATE ON public.tto_time_tickets FOR EACH ROW EXECUTE FUNCTION private.guard_tto_creation_state();
CREATE OR REPLACE FUNCTION private.validate_contract_numbers() RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$ BEGIN
 IF NEW.pay_rate::text IN ('NaN','Infinity','-Infinity') OR NEW.bill_rate::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'Agreed rates must be finite positive amounts'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER validate_contract_numbers BEFORE INSERT ON public.tto_contracts FOR EACH ROW EXECUTE FUNCTION private.validate_contract_numbers();
CREATE OR REPLACE FUNCTION private.validate_assignment_actor() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
 IF NEW.contract_id IS NOT NULL AND auth.uid() IS NOT NULL AND auth.role()='authenticated' AND NOT private.tto_contract_access(NEW.agency_id,ARRAY['agency_admin','agency_owner','dispatcher','scheduler','account_manager']) THEN RAISE EXCEPTION 'Agency assignment manager access required' USING ERRCODE='42501'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER validate_assignment_actor BEFORE INSERT OR UPDATE ON public.assignments FOR EACH ROW EXECUTE FUNCTION private.validate_assignment_actor();
CREATE FUNCTION public.decide_contracted_time_ticket(_ticket_id uuid,_actor_id uuid,_decision text,_comment text DEFAULT NULL) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE t public.tto_time_tickets; next_status public.tto_ticket_status;
BEGIN
 SELECT * INTO t FROM public.tto_time_tickets WHERE id=_ticket_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Ticket not found'; END IF;
 IF _actor_id IS NULL OR NOT (private.has_role(_actor_id,'super_admin') OR EXISTS(SELECT 1 FROM public.agency_members am WHERE am.agency_id=t.agency_id AND am.user_id=_actor_id AND am.is_active AND am.role::text=ANY(ARRAY['agency_owner','agency_admin','dispatcher','scheduler','account_manager']))) THEN RAISE EXCEPTION 'Agency approval access required' USING ERRCODE='42501'; END IF;
 IF t.status<>'submitted' THEN RAISE EXCEPTION 'Only submitted tickets can be decided'; END IF;
 IF _decision NOT IN ('approve','reject','correction') THEN RAISE EXCEPTION 'Invalid approval decision'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.tto_ticket_terms WHERE time_ticket_id=t.id AND agency_id=t.agency_id) THEN RAISE EXCEPTION 'Contracted assignment and agreed pay required'; END IF;
 IF _decision='approve' AND (t.actual_start IS NULL OR t.actual_end IS NULL OR t.regular_hours+t.overtime_hours+t.double_time_hours<=0) THEN RAISE EXCEPTION 'Record and submit real worked time before approval'; END IF;
 next_status := CASE _decision WHEN 'approve' THEN 'approved' WHEN 'reject' THEN 'rejected' ELSE 'corrected' END;
 INSERT INTO public.tto_ticket_approvals(agency_id,time_ticket_id,approver_id,approver_kind,decision,comment,channel) VALUES(t.agency_id,t.id,_actor_id,'agency',_decision,left(_comment,2000),'portal');
 UPDATE public.tto_time_tickets SET status=next_status,approved_at=CASE WHEN _decision='approve' THEN now() ELSE approved_at END,approved_by=CASE WHEN _decision='approve' THEN _actor_id ELSE approved_by END WHERE id=t.id;
 INSERT INTO public.tto_audit_events(agency_id,time_ticket_id,actor_id,actor_kind,action,reason) VALUES(t.agency_id,t.id,_actor_id,'agency','ticket.'||_decision,left(_comment,2000));
 INSERT INTO public.ttos_events(agency_id,module,name,actor_id,entity_type,entity_id,metadata) VALUES(t.agency_id,'time_ticket','time.ticket.'||_decision,_actor_id,'tto_time_ticket',t.id,'{}'::jsonb);
 RETURN next_status::text;
END $$;
REVOKE ALL ON FUNCTION public.decide_contracted_time_ticket(uuid,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.decide_contracted_time_ticket(uuid,uuid,text,text) TO service_role;
NOTIFY pgrst,'reload schema';