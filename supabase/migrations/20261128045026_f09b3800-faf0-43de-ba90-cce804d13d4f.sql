ALTER TABLE public.tto_payroll_batches ADD COLUMN pay_date date, ADD COLUMN period_type text NOT NULL DEFAULT 'custom', ADD COLUMN deductions jsonb NOT NULL DEFAULT '[]'::jsonb, ADD COLUMN payroll_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb;
DROP POLICY tto_payroll_read ON public.tto_payroll_batches;
CREATE POLICY tto_payroll_read ON public.tto_payroll_batches FOR SELECT TO authenticated USING(private.tto_contract_access(agency_id,ARRAY['agency_owner','agency_admin','payroll','payroll_specialist']));
CREATE FUNCTION private.tto_payroll_actor(_agency uuid,_actor uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$ SELECT _actor IS NOT NULL AND (private.has_role(_actor,'super_admin') OR EXISTS(SELECT 1 FROM public.agency_members WHERE agency_id=_agency AND user_id=_actor AND is_active AND role::text=ANY(ARRAY['agency_owner','agency_admin','payroll','payroll_specialist']))) $$;
CREATE FUNCTION private.freeze_payroll_export() RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$ BEGIN
 IF OLD.status='exported' THEN RAISE EXCEPTION 'Exported payroll is immutable'; END IF;
 IF NEW.period_end<NEW.period_start OR (NEW.pay_date IS NOT NULL AND NEW.pay_date<NEW.period_end) THEN RAISE EXCEPTION 'Pay date must not precede the pay period end'; END IF;
 IF jsonb_typeof(NEW.deductions)<>'array' OR jsonb_array_length(NEW.deductions)>200 THEN RAISE EXCEPTION 'Invalid payroll deductions'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER freeze_payroll_export BEFORE UPDATE ON public.tto_payroll_batches FOR EACH ROW EXECUTE FUNCTION private.freeze_payroll_export();
CREATE FUNCTION public.save_tto_payroll_review(_batch_id uuid,_actor_id uuid,_deductions jsonb,_pay_date date,_period_type text,_totals jsonb,_snapshot jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE b public.tto_payroll_batches; d jsonb; BEGIN
 SELECT * INTO b FROM public.tto_payroll_batches WHERE id=_batch_id FOR UPDATE;
 IF NOT FOUND OR NOT private.tto_payroll_actor(b.agency_id,_actor_id) THEN RAISE EXCEPTION 'Payroll access denied' USING ERRCODE='42501'; END IF;
 IF b.status IN ('exported','exporting') THEN RAISE EXCEPTION 'This payroll is locked'; END IF;
 IF _period_type NOT IN ('weekly','biweekly','semimonthly','monthly','custom') OR _pay_date IS NULL OR _pay_date<b.period_end THEN RAISE EXCEPTION 'Invalid payroll dates'; END IF;
 IF jsonb_typeof(_deductions)<>'array' OR jsonb_array_length(_deductions)>200 THEN RAISE EXCEPTION 'Invalid payroll deductions'; END IF;
 FOR d IN SELECT value FROM jsonb_array_elements(_deductions) LOOP
 IF length(trim(d->>'label')) NOT BETWEEN 1 AND 120 OR (d->>'amount') IS NULL OR (d->>'amount')::numeric<0 OR (d->>'amount') IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'Invalid deduction'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.tto_time_tickets t WHERE t.id=ANY(b.ticket_ids) AND t.agency_id=b.agency_id AND t.worker_id=(d->>'worker_id')::uuid) THEN RAISE EXCEPTION 'Deduction worker must be in this payroll'; END IF;
 END LOOP;
 UPDATE public.tto_payroll_batches SET deductions=_deductions,pay_date=_pay_date,period_type=_period_type,totals=_totals,payroll_snapshot=_snapshot WHERE id=b.id RETURNING * INTO b;
 INSERT INTO public.tto_audit_events(agency_id,actor_id,actor_kind,action,updated_value) VALUES(b.agency_id,_actor_id,'agency','payroll.review_saved',jsonb_build_object('batch_id',b.id,'deduction_count',jsonb_array_length(_deductions),'pay_date',_pay_date));
 RETURN to_jsonb(b); END $$;
REVOKE ALL ON FUNCTION public.save_tto_payroll_review(uuid,uuid,jsonb,date,text,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_tto_payroll_review(uuid,uuid,jsonb,date,text,jsonb,jsonb) TO service_role;
CREATE FUNCTION public.claim_tto_payroll_export(_batch_id uuid,_actor_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE b public.tto_payroll_batches; BEGIN
 SELECT * INTO b FROM public.tto_payroll_batches WHERE id=_batch_id;
 IF NOT FOUND OR NOT private.tto_payroll_actor(b.agency_id,_actor_id) THEN RAISE EXCEPTION 'Payroll access denied' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(b.agency_id::text,0));
 SELECT * INTO b FROM public.tto_payroll_batches WHERE id=_batch_id FOR UPDATE;
 IF b.status IN ('exported','exporting') THEN RAISE EXCEPTION 'Payroll is already exported or exporting'; END IF;
 IF b.pay_date IS NULL THEN RAISE EXCEPTION 'Save a pay date and review before export'; END IF;
 IF EXISTS(SELECT 1 FROM public.tto_payroll_batches other WHERE other.agency_id=b.agency_id AND other.id<>b.id AND other.status IN ('exported','exporting') AND other.ticket_ids && b.ticket_ids) THEN RAISE EXCEPTION 'A ticket is already included in another payroll export'; END IF;
 UPDATE public.tto_payroll_batches SET status='exporting' WHERE id=b.id;
 RETURN to_jsonb(b); END $$;
REVOKE ALL ON FUNCTION public.claim_tto_payroll_export(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_tto_payroll_export(uuid,uuid) TO service_role;
NOTIFY pgrst,'reload schema';