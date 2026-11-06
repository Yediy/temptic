-- Regression test: automation rule versions are forward-only, rollback creates
-- a new version, and history cannot be edited. Runs in a transaction and rolls back.
-- Run: psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/automation_versions_test.sql
BEGIN;
CREATE TEMP TABLE t (k text primary key, id uuid) ON COMMIT DROP;
INSERT INTO t VALUES ('ag',gen_random_uuid()),('u',gen_random_uuid()),('w',gen_random_uuid());
GRANT SELECT ON t TO authenticated;
INSERT INTO auth.users (id,email,aud,role,instance_id) SELECT id, id||'@v.invalid','authenticated','authenticated','00000000-0000-0000-0000-000000000000' FROM t WHERE k='u';
INSERT INTO agencies (id,name) SELECT id,'V test' FROM t WHERE k='ag';
INSERT INTO agency_members (agency_id,user_id,role,is_active) VALUES ((SELECT id FROM t WHERE k='ag'),(SELECT id FROM t WHERE k='u'),'agency_admin',true);
INSERT INTO user_roles (user_id,role) VALUES ((SELECT id FROM t WHERE k='u'),'agency_admin') ON CONFLICT DO NOTHING;
SELECT set_config('request.jwt.claims', json_build_object('sub',(SELECT id FROM t WHERE k='u'),'role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
-- client-supplied version is ignored (forced to 1)
INSERT INTO ttos_automations (id,agency_id,name,trigger_event,conditions,actions,version) VALUES ((SELECT id FROM t WHERE k='w'),(SELECT id FROM t WHERE k='ag'),'Rule v1','ticket.approved','{}','[]',99);
UPDATE ttos_automations SET name='Rule v2 BROKEN' WHERE id=(SELECT id FROM t WHERE k='w');
-- run stats are not a definition change: no new version
UPDATE ttos_automations SET last_run_at=now() WHERE id=(SELECT id FROM t WHERE k='w');
SELECT rollback_automation((SELECT id FROM t WHERE k='w'), 1);
DO $$ DECLARE r record; h text; BEGIN
  SELECT * INTO r FROM ttos_automations WHERE id=(SELECT id FROM t WHERE k='w');
  SELECT string_agg(version||':'||change_kind||':'||coalesce(rolled_back_to::text,'-')||':'||(snapshot->>'name'), ' | ' ORDER BY version) INTO h FROM ttos_automation_versions WHERE automation_id=r.id;
  IF r.version<>3 OR r.name<>'Rule v1' OR h <> '1:create:-:Rule v1 | 2:update:-:Rule v2 BROKEN | 3:rollback:1:Rule v1' THEN RAISE EXCEPTION 'FAIL v=% name=% hist=%', r.version, r.name, h; END IF;
  BEGIN PERFORM rollback_automation(r.id, 5); RAISE EXCEPTION 'FAIL forward rollback allowed'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN UPDATE ttos_automation_versions SET note='x' WHERE automation_id=r.id; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  IF EXISTS (SELECT 1 FROM ttos_automation_versions WHERE note='x') THEN RAISE EXCEPTION 'FAIL history editable'; END IF;
END $$;
RESET ROLE;
SELECT 'VERSIONING OK' AS result;
ROLLBACK;
