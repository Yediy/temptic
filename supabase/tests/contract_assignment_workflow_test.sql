BEGIN;
CREATE TEMP TABLE contract_test_context(agency uuid, actor uuid, worker uuid, client uuid, supervisor uuid, contract uuid, assignment uuid, ticket uuid);
INSERT INTO contract_test_context(agency,actor)
SELECT agency_id,user_id FROM public.agency_members WHERE is_active AND role::text IN ('agency_admin','agency_owner') ORDER BY created_at LIMIT 1;
DO $$
DECLARE f contract_test_context; cid uuid; aid uuid; tid uuid; denied boolean;
BEGIN
 SELECT * INTO f FROM contract_test_context;
 IF f.actor IS NULL THEN RAISE EXCEPTION 'An agency manager is needed for this rollback-only test'; END IF;
 INSERT INTO public.clients(agency_id,company_name) VALUES(f.agency,'Rollback fixture client') RETURNING id INTO f.client;
 INSERT INTO public.workers(agency_id,first_name,last_name) VALUES(f.agency,'Rollback','Fixture') RETURNING id INTO f.worker;
 INSERT INTO public.client_signers(client_id,first_name,last_name,email) VALUES(f.client,'Rollback','Supervisor','fixture@example.invalid') RETURNING id INTO f.supervisor;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',f.actor,'role','authenticated')::text,true);
 cid:=public.create_tto_contract(f.agency,'Rollback $40 contract',f.client,NULL,f.supervisor,'Rollback-only fixture work',40,NULL,'USD','2026-11-01','2026-11-30');
 aid:=public.create_tto_assignment(cid,f.worker,'2026-11-01','2026-11-30');
 tid:=public.create_contracted_time_ticket(aid,'2026-11-25','2026-11-25T08:00:00Z','2026-11-25T16:00:00Z');
 IF NOT EXISTS(SELECT 1 FROM public.tto_ticket_terms WHERE time_ticket_id=tid AND contract_id=cid AND assignment_id=aid AND pay_rate=40 AND currency='USD' AND supervisor_email='fixture@example.invalid') THEN RAISE EXCEPTION 'Ticket must freeze its contract, assignment, $40 pay, USD and named supervisor'; END IF;
 denied:=false; BEGIN PERFORM public.create_contracted_time_ticket(aid,'2026-10-31'); EXCEPTION WHEN OTHERS THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Work dates outside the assignment must be rejected'; END IF;
 denied:=false; BEGIN INSERT INTO public.tto_time_tickets(agency_id,worker_id,client_id,work_date) VALUES(f.agency,f.worker,f.client,'2026-11-26'); EXCEPTION WHEN OTHERS THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Uncontracted time tickets must be rejected'; END IF;
 denied:=false; BEGIN UPDATE public.tto_ticket_terms SET pay_rate=99 WHERE time_ticket_id=tid; EXCEPTION WHEN OTHERS THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Agreed ticket pay must be immutable'; END IF;
 denied:=false; BEGIN UPDATE public.tto_time_tickets SET status='approved' WHERE id=tid; EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Direct browser approval must be rejected'; END IF;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('role','service_role')::text,true);
 UPDATE public.tto_time_tickets SET status='submitted',regular_hours=8 WHERE id=tid;
 PERFORM public.decide_contracted_time_ticket(tid,f.actor,'approve','Rollback-only approval check');
 IF NOT EXISTS(SELECT 1 FROM public.tto_time_tickets WHERE id=tid AND status='approved' AND approved_by=f.actor) THEN RAISE EXCEPTION 'Authorized approval must update status'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.tto_payroll_batches WHERE agency_id=f.agency AND tid=ANY(ticket_ids)) THEN RAISE EXCEPTION 'Approved ticket must enter Payroll Prep'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.tto_audit_events WHERE time_ticket_id=tid AND action='ticket.approve' AND actor_id=f.actor) THEN RAISE EXCEPTION 'Approval must have an access-trail entry'; END IF;
 denied:=false; BEGIN PERFORM public.decide_contracted_time_ticket(tid,f.actor,'approve'); EXCEPTION WHEN OTHERS THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'A second approval must be rejected'; END IF;
 UPDATE contract_test_context SET worker=f.worker,client=f.client,supervisor=f.supervisor,contract=cid,assignment=aid,ticket=tid;
END $$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000000","role":"authenticated"}',true);
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.tto_contracts) OR EXISTS(SELECT 1 FROM public.tto_ticket_terms) THEN RAISE EXCEPTION 'Unrelated signed-in users must not see contract pay'; END IF;
 IF has_table_privilege('authenticated','public.tto_ticket_terms','UPDATE') OR has_table_privilege('anon','public.tto_ticket_terms','SELECT') THEN RAISE EXCEPTION 'Private pay must not be browser-editable or public'; END IF;
END $$;
ROLLBACK;