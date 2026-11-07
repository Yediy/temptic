CREATE TABLE public.automation_action_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  automation_id uuid,
  event_id uuid,
  action_type text NOT NULL CHECK (action_type IN ('launch_drug_test','generate_payroll','escalate_issue')),
  action_payload jsonb NOT NULL DEFAULT '{}',
  context jsonb NOT NULL DEFAULT '{}',
  required_roles text[] NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','executed','failed','expired')),
  decided_by uuid, decided_at timestamptz, decision_reason text,
  executed_at timestamptz, result jsonb,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '72 hours',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.automation_action_approvals(agency_id, status, created_at DESC);
GRANT SELECT ON public.automation_action_approvals TO authenticated;
GRANT ALL ON public.automation_action_approvals TO service_role;
ALTER TABLE public.automation_action_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agency members read action approvals" ON public.automation_action_approvals FOR SELECT TO authenticated
USING (private.has_role(auth.uid(),'super_admin') OR EXISTS (SELECT 1 FROM agency_members am WHERE am.agency_id = automation_action_approvals.agency_id AND am.user_id = auth.uid() AND am.is_active));

CREATE TABLE public.automation_approval_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_id uuid NOT NULL,
  agency_id uuid NOT NULL,
  action_type text NOT NULL,
  event text NOT NULL CHECK (event IN ('requested','approved','rejected','denied','executed','failed','expired')),
  actor_user_id uuid,
  actor_roles text[] NOT NULL DEFAULT '{}',
  reason text,
  ip_address text, user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.automation_approval_audit(agency_id, created_at DESC);
CREATE INDEX ON public.automation_approval_audit(approval_id);
GRANT SELECT ON public.automation_approval_audit TO authenticated;
GRANT ALL ON public.automation_approval_audit TO service_role;
ALTER TABLE public.automation_approval_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agency members read approval audit" ON public.automation_approval_audit FOR SELECT TO authenticated
USING (private.has_role(auth.uid(),'super_admin') OR EXISTS (SELECT 1 FROM agency_members am WHERE am.agency_id = automation_approval_audit.agency_id AND am.user_id = auth.uid() AND am.is_active));

-- Single source of truth for who may approve each sensitive action
CREATE OR REPLACE FUNCTION private.automation_action_roles(_action text)
RETURNS text[] LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE _action
    WHEN 'launch_drug_test' THEN ARRAY['agency_owner','agency_admin','compliance_specialist']
    WHEN 'generate_payroll' THEN ARRAY['agency_owner','agency_admin','payroll','payroll_specialist']
    WHEN 'escalate_issue'   THEN ARRAY['agency_owner','agency_admin','account_manager','dispatcher']
  END
$$;

CREATE OR REPLACE FUNCTION private.automation_audit(_approval public.automation_action_approvals, _event text, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE hdr json; roles text[];
BEGIN
  BEGIN hdr := current_setting('request.headers', true)::json; EXCEPTION WHEN others THEN hdr := NULL; END;
  SELECT coalesce(array_agg(DISTINCT r), '{}') INTO roles FROM (
    SELECT role::text r FROM agency_members WHERE user_id = auth.uid() AND agency_id = _approval.agency_id AND is_active
    UNION SELECT role::text FROM user_roles WHERE user_id = auth.uid() AND role = 'super_admin') x;
  INSERT INTO automation_approval_audit(approval_id, agency_id, action_type, event, actor_user_id, actor_roles, reason, ip_address, user_agent)
  VALUES (_approval.id, _approval.agency_id, _approval.action_type, _event, auth.uid(), roles, left(_reason, 1000),
    split_part(coalesce(hdr->>'x-forwarded-for',''), ',', 1), left(hdr->>'user-agent', 500));
END $$;

-- Fill required roles + log 'requested' on creation (by the engine)
CREATE OR REPLACE FUNCTION private.automation_approval_on_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.required_roles := private.automation_action_roles(NEW.action_type);
  NEW.status := 'pending';
  RETURN NEW;
END $$;
CREATE TRIGGER trg_automation_approval_before_insert BEFORE INSERT ON public.automation_action_approvals
FOR EACH ROW EXECUTE FUNCTION private.automation_approval_on_insert();
CREATE OR REPLACE FUNCTION private.automation_approval_after_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM private.automation_audit(NEW, 'requested', NULL); RETURN NULL; END $$;
CREATE TRIGGER trg_automation_approval_after_insert AFTER INSERT ON public.automation_action_approvals
FOR EACH ROW EXECUTE FUNCTION private.automation_approval_after_insert();

CREATE OR REPLACE FUNCTION private.execute_automation_action(_a public.automation_action_approvals)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p jsonb := _a.action_payload; c jsonb := _a.context; wid uuid; rid uuid; ps date; pe date; m record;
BEGIN
  IF _a.action_type = 'launch_drug_test' THEN
    wid := coalesce(NULLIF(p->>'worker_id','')::uuid, NULLIF(c->>'worker_id','')::uuid);
    IF wid IS NULL THEN RAISE EXCEPTION 'No worker on this event to test'; END IF;
    IF NOT EXISTS (SELECT 1 FROM workers WHERE id = wid AND agency_id = _a.agency_id) THEN RAISE EXCEPTION 'Worker not in this agency'; END IF;
    INSERT INTO screening_orders(agency_id, worker_id, ordered_by, metadata)
    VALUES (_a.agency_id, wid, auth.uid(), jsonb_build_object('kind','drug_test','panel', coalesce(p->>'panel','10-panel'),'approval_id',_a.id))
    RETURNING id INTO rid;
    RETURN jsonb_build_object('screening_order_id', rid, 'worker_id', wid);
  ELSIF _a.action_type = 'generate_payroll' THEN
    ps := coalesce(NULLIF(p->>'period_start','')::date, date_trunc('week', now())::date - 7);
    pe := coalesce(NULLIF(p->>'period_end','')::date, ps + 6);
    INSERT INTO pb_payroll_runs(agency_id, name, period_start, period_end, created_by)
    VALUES (_a.agency_id, coalesce(p->>'name', 'Payroll ' || ps || ' – ' || pe), ps, pe, auth.uid()) RETURNING id INTO rid;
    RETURN jsonb_build_object('payroll_run_id', rid, 'period_start', ps, 'period_end', pe);
  ELSIF _a.action_type = 'escalate_issue' THEN
    INSERT INTO ttos_tasks(agency_id, title, description, owner_id, priority, entity_type, entity_id, metadata)
    VALUES (_a.agency_id, coalesce(p->>'title', 'Escalation: ' || coalesce(c->>'event_name','issue')), coalesce(p->>'description',''),
      auth.uid(), 'urgent', c->>'entity_type', NULLIF(c->>'entity_id','')::uuid, jsonb_build_object('approval_id', _a.id))
    RETURNING id INTO rid;
    FOR m IN SELECT user_id FROM agency_members WHERE agency_id = _a.agency_id AND is_active AND role::text IN ('agency_owner','agency_admin') LOOP
      INSERT INTO ttos_notifications(agency_id, recipient_id, title, body, level, entity_type, entity_id)
      VALUES (_a.agency_id, m.user_id, coalesce(p->>'title','Issue escalated'), coalesce(p->>'description',''), 'high', 'ttos_task', rid);
    END LOOP;
    RETURN jsonb_build_object('task_id', rid);
  END IF;
  RAISE EXCEPTION 'Unknown action';
END $$;

CREATE OR REPLACE FUNCTION private.decide_automation_action(_approval_id uuid, _approve boolean, _reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a automation_action_approvals; allowed boolean; res jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501'; END IF;
  SELECT * INTO a FROM automation_action_approvals WHERE id = _approval_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'not_found'); END IF;
  -- not visible to caller at all -> behave as not found, but still trace
  allowed := private.has_role(auth.uid(),'super_admin') OR EXISTS (
    SELECT 1 FROM agency_members am WHERE am.user_id = auth.uid() AND am.agency_id = a.agency_id AND am.is_active
      AND am.role::text = ANY (a.required_roles));
  IF NOT allowed THEN
    PERFORM private.automation_audit(a, 'denied', 'Role not permitted to ' || (CASE WHEN _approve THEN 'approve' ELSE 'reject' END));
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden', 'required_roles', a.required_roles);
  END IF;
  IF a.status <> 'pending' THEN RETURN jsonb_build_object('ok', false, 'error', 'already_' || a.status); END IF;
  IF a.expires_at < now() THEN
    UPDATE automation_action_approvals SET status = 'expired' WHERE id = a.id;
    PERFORM private.automation_audit(a, 'expired', NULL);
    RETURN jsonb_build_object('ok', false, 'error', 'expired');
  END IF;
  IF NOT _approve THEN
    IF coalesce(btrim(_reason),'') = '' THEN RETURN jsonb_build_object('ok', false, 'error', 'reason_required'); END IF;
    UPDATE automation_action_approvals SET status='rejected', decided_by=auth.uid(), decided_at=now(), decision_reason=left(_reason,1000) WHERE id=a.id;
    PERFORM private.automation_audit(a, 'rejected', _reason);
    RETURN jsonb_build_object('ok', true, 'status', 'rejected');
  END IF;

  UPDATE automation_action_approvals SET status='approved', decided_by=auth.uid(), decided_at=now(), decision_reason=left(_reason,1000) WHERE id=a.id;
  PERFORM private.automation_audit(a, 'approved', _reason);
  BEGIN
    res := private.execute_automation_action(a);
    UPDATE automation_action_approvals SET status='executed', executed_at=now(), result=res WHERE id=a.id;
    PERFORM private.automation_audit(a, 'executed', NULL);
    RETURN jsonb_build_object('ok', true, 'status', 'executed', 'result', res);
  EXCEPTION WHEN others THEN
    UPDATE automation_action_approvals SET status='failed', result=jsonb_build_object('error', SQLERRM) WHERE id=a.id;
    PERFORM private.automation_audit(a, 'failed', SQLERRM);
    RETURN jsonb_build_object('ok', false, 'status', 'failed', 'error', SQLERRM);
  END;
END $$;

REVOKE ALL ON FUNCTION private.automation_audit(public.automation_action_approvals,text,text), private.automation_approval_on_insert(),
  private.automation_approval_after_insert(), private.execute_automation_action(public.automation_action_approvals) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.decide_automation_action(uuid,boolean,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.decide_automation_action(uuid,boolean,text) TO authenticated;

CREATE FUNCTION public.decide_automation_action(_approval_id uuid, _approve boolean, _reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$ SELECT private.decide_automation_action(_approval_id, _approve, _reason) $$;
REVOKE ALL ON FUNCTION public.decide_automation_action(uuid,boolean,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decide_automation_action(uuid,boolean,text) TO authenticated;