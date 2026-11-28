CREATE UNIQUE INDEX tto_labor_costs_ticket_kind_unique ON public.tto_labor_costs(agency_id,time_ticket_id,line_kind);
CREATE FUNCTION private.sync_reviewed_payroll_costs() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE t jsonb; p numeric; k text; h numeric; r numeric; worker uuid; BEGIN
 IF jsonb_typeof(NEW.payroll_snapshot->'tickets') IS DISTINCT FROM 'array' THEN RETURN NEW; END IF;
 FOR t IN SELECT value FROM jsonb_array_elements(NEW.payroll_snapshot->'tickets') LOOP
 SELECT terms.pay_rate,tt.worker_id INTO p,worker FROM public.tto_ticket_terms terms JOIN public.tto_time_tickets tt ON tt.id=terms.time_ticket_id AND tt.agency_id=terms.agency_id WHERE tt.id=(t->>'id')::uuid AND tt.agency_id=NEW.agency_id;
 IF p IS NULL OR worker IS NULL THEN RAISE EXCEPTION 'Reviewed payroll requires agreed contract pay'; END IF;
 FOREACH k IN ARRAY ARRAY['regular','overtime','double_time'] LOOP
 h:=(t->>(k||'_hours'))::numeric;r:=p*CASE k WHEN 'overtime' THEN 1.5 WHEN 'double_time' THEN 2 ELSE 1 END;
 INSERT INTO public.tto_labor_costs(agency_id,time_ticket_id,worker_id,line_kind,hours,rate,amount) VALUES(NEW.agency_id,(t->>'id')::uuid,worker,k,h,r,round(h*r,2)) ON CONFLICT(agency_id,time_ticket_id,line_kind) DO UPDATE SET hours=EXCLUDED.hours,rate=EXCLUDED.rate,amount=EXCLUDED.amount;
 END LOOP; END LOOP; RETURN NEW; END $$;
CREATE TRIGGER sync_reviewed_payroll_costs AFTER INSERT OR UPDATE OF payroll_snapshot ON public.tto_payroll_batches FOR EACH ROW EXECUTE FUNCTION private.sync_reviewed_payroll_costs();
CREATE OR REPLACE FUNCTION private.freeze_payroll_export() RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$ BEGIN
 IF OLD.status='exported' THEN RAISE EXCEPTION 'Exported payroll is immutable'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 IF NEW.period_end<NEW.period_start OR (NEW.pay_date IS NOT NULL AND NEW.pay_date<NEW.period_end) THEN RAISE EXCEPTION 'Pay date must not precede the pay period end'; END IF;
 IF jsonb_typeof(NEW.deductions)<>'array' OR jsonb_array_length(NEW.deductions)>200 THEN RAISE EXCEPTION 'Invalid payroll deductions'; END IF;
 RETURN NEW; END $$;
DROP TRIGGER freeze_payroll_export ON public.tto_payroll_batches;
CREATE TRIGGER freeze_payroll_export BEFORE UPDATE OR DELETE ON public.tto_payroll_batches FOR EACH ROW EXECUTE FUNCTION private.freeze_payroll_export();