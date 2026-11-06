CREATE TABLE public.ttos_automation_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id uuid NOT NULL,
  agency_id uuid NOT NULL,
  version integer NOT NULL,
  change_kind text NOT NULL CHECK (change_kind IN ('create','update','rollback','delete')),
  rolled_back_to integer,
  snapshot jsonb NOT NULL,
  changed_by uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (automation_id, version)
);
GRANT SELECT ON public.ttos_automation_versions TO authenticated;
GRANT ALL ON public.ttos_automation_versions TO service_role;
ALTER TABLE public.ttos_automation_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY automation_versions_read_agency ON public.ttos_automation_versions
  FOR SELECT TO authenticated
  USING (agency_id IN (SELECT private.current_user_agency_ids()) OR private.has_role(auth.uid(), 'super_admin'::app_role));
CREATE INDEX ttos_automation_versions_auto_idx ON public.ttos_automation_versions (automation_id, version DESC);

CREATE OR REPLACE FUNCTION private.automation_snapshot(r public.ttos_automations)
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT jsonb_build_object(
    'name', r.name, 'description', r.description, 'trigger_event', r.trigger_event,
    'conditions', r.conditions, 'actions', r.actions, 'priority', r.priority,
    'enabled', r.enabled, 'retries', r.retries, 'require_approval', r.require_approval,
    'tags', to_jsonb(r.tags), 'graph', r.graph)
$$;

-- Forward-only versioning: version only ever increases, and only when the definition changes.
CREATE OR REPLACE FUNCTION private.automation_bump_version()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.version := 1;
  ELSIF private.automation_snapshot(NEW) IS DISTINCT FROM private.automation_snapshot(OLD) THEN
    NEW.version := COALESCE(OLD.version, 0) + 1;
  ELSE
    NEW.version := OLD.version;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION private.automation_record_version()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _kind text := COALESCE(NULLIF(current_setting('app.automation_change_kind', true), ''), 'update');
  _target int := NULLIF(current_setting('app.automation_rollback_target', true), '')::int;
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.ttos_automation_versions (automation_id, agency_id, version, change_kind, snapshot, changed_by)
    VALUES (OLD.id, OLD.agency_id, COALESCE(OLD.version, 0) + 1, 'delete', private.automation_snapshot(OLD), auth.uid());
    RETURN OLD;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.version = OLD.version THEN RETURN NEW; END IF;
  INSERT INTO public.ttos_automation_versions (automation_id, agency_id, version, change_kind, rolled_back_to, snapshot, changed_by)
  VALUES (NEW.id, NEW.agency_id, NEW.version,
          CASE WHEN TG_OP = 'INSERT' THEN 'create' ELSE _kind END,
          CASE WHEN _kind = 'rollback' THEN _target END,
          private.automation_snapshot(NEW), auth.uid());
  RETURN NEW;
END $$;

CREATE TRIGGER trg_automation_bump_version BEFORE INSERT OR UPDATE ON public.ttos_automations
  FOR EACH ROW EXECUTE FUNCTION private.automation_bump_version();
CREATE TRIGGER trg_automation_record_version AFTER INSERT OR UPDATE OR DELETE ON public.ttos_automations
  FOR EACH ROW EXECUTE FUNCTION private.automation_record_version();

-- Baseline: snapshot every existing rule as its current version.
INSERT INTO public.ttos_automation_versions (automation_id, agency_id, version, change_kind, snapshot, changed_by, note)
SELECT a.id, a.agency_id, COALESCE(a.version, 1), 'create', private.automation_snapshot(a), a.created_by, 'baseline'
FROM public.ttos_automations a
ON CONFLICT DO NOTHING;

-- Safe rollback: restores an earlier definition as a NEW version (history is never rewritten).
CREATE OR REPLACE FUNCTION public.rollback_automation(_automation_id uuid, _target_version integer)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _rule public.ttos_automations;
  _snap jsonb;
BEGIN
  SELECT * INTO _rule FROM public.ttos_automations WHERE id = _automation_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Automation not found' USING ERRCODE = 'P0002'; END IF;
  IF NOT (private.has_role(auth.uid(), 'super_admin'::app_role)
          OR (private.has_role(auth.uid(), 'agency_admin'::app_role)
              AND _rule.agency_id IN (SELECT private.current_user_agency_ids()))) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  IF _target_version >= _rule.version THEN
    RAISE EXCEPTION 'Can only roll back to an earlier version' USING ERRCODE = '22023';
  END IF;
  SELECT snapshot INTO _snap FROM public.ttos_automation_versions
   WHERE automation_id = _automation_id AND version = _target_version AND change_kind <> 'delete';
  IF _snap IS NULL THEN RAISE EXCEPTION 'Version not found' USING ERRCODE = 'P0002'; END IF;

  PERFORM set_config('app.automation_change_kind', 'rollback', true);
  PERFORM set_config('app.automation_rollback_target', _target_version::text, true);
  UPDATE public.ttos_automations SET
    name = _snap->>'name', description = _snap->>'description', trigger_event = _snap->>'trigger_event',
    conditions = _snap->'conditions', actions = _snap->'actions',
    priority = (_snap->>'priority')::int, enabled = (_snap->>'enabled')::boolean,
    retries = (_snap->>'retries')::int, require_approval = (_snap->>'require_approval')::boolean,
    tags = CASE WHEN jsonb_typeof(_snap->'tags') = 'array' THEN ARRAY(SELECT jsonb_array_elements_text(_snap->'tags')) ELSE NULL END,
    graph = _snap->'graph', updated_at = now()
  WHERE id = _automation_id;
  PERFORM set_config('app.automation_change_kind', '', true);
  PERFORM set_config('app.automation_rollback_target', '', true);

  SELECT version INTO _rule.version FROM public.ttos_automations WHERE id = _automation_id;
  RETURN _rule.version;
END $$;
REVOKE ALL ON FUNCTION public.rollback_automation(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rollback_automation(uuid, integer) TO authenticated;