-- Regression test: workers can only read their own screening_reports,
-- screening_orders and screening_consents, across roles and tenants.
-- Runs entirely inside a transaction and ROLLS BACK — no data is kept.
-- Run: psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/screening_rls_test.sql
-- Any failed expectation raises an exception and aborts the run.

BEGIN;

CREATE TEMP TABLE t_ids (k text PRIMARY KEY, id uuid) ON COMMIT DROP;
GRANT SELECT ON t_ids TO authenticated, anon;

-- Fixed fixture ids
INSERT INTO t_ids VALUES
  ('agency_a', gen_random_uuid()), ('agency_b', gen_random_uuid()),
  ('u_worker_a1', gen_random_uuid()), ('u_worker_a2', gen_random_uuid()),
  ('u_worker_b1', gen_random_uuid()), ('u_admin_a', gen_random_uuid()),
  ('u_admin_b', gen_random_uuid()), ('u_client', gen_random_uuid()),
  ('u_orphan', gen_random_uuid()),
  ('w_a1', gen_random_uuid()), ('w_a2', gen_random_uuid()), ('w_b1', gen_random_uuid()),
  ('o_a1', gen_random_uuid()), ('o_a2', gen_random_uuid()), ('o_b1', gen_random_uuid());

CREATE FUNCTION pg_temp.id(_k text) RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT id FROM t_ids WHERE k = _k $$;

INSERT INTO auth.users (id, email, aud, role, instance_id)
SELECT id, k || '-' || id || '@rls-test.invalid', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'
FROM t_ids WHERE k LIKE 'u_%';

INSERT INTO public.agencies (id, name) VALUES
  (pg_temp.id('agency_a'), 'RLS Test Agency A'), (pg_temp.id('agency_b'), 'RLS Test Agency B');

INSERT INTO public.agency_members (agency_id, user_id, role, is_active) VALUES
  (pg_temp.id('agency_a'), pg_temp.id('u_admin_a'), 'agency_admin', true),
  (pg_temp.id('agency_b'), pg_temp.id('u_admin_b'), 'agency_admin', true);

INSERT INTO public.user_roles (user_id, role) VALUES
  (pg_temp.id('u_admin_a'), 'agency_admin'), (pg_temp.id('u_admin_b'), 'agency_admin'),
  (pg_temp.id('u_worker_a1'), 'worker_user'), (pg_temp.id('u_worker_a2'), 'worker_user'),
  (pg_temp.id('u_worker_b1'), 'worker_user'), (pg_temp.id('u_orphan'), 'worker_user'),
  (pg_temp.id('u_client'), 'client_user')
ON CONFLICT DO NOTHING;

INSERT INTO public.workers (id, agency_id, user_id, first_name, last_name) VALUES
  (pg_temp.id('w_a1'), pg_temp.id('agency_a'), pg_temp.id('u_worker_a1'), 'Ann', 'A1'),
  (pg_temp.id('w_a2'), pg_temp.id('agency_a'), pg_temp.id('u_worker_a2'), 'Ben', 'A2'),
  (pg_temp.id('w_b1'), pg_temp.id('agency_b'), pg_temp.id('u_worker_b1'), 'Cal', 'B1');

INSERT INTO public.screening_orders (id, agency_id, worker_id) VALUES
  (pg_temp.id('o_a1'), pg_temp.id('agency_a'), pg_temp.id('w_a1')),
  (pg_temp.id('o_a2'), pg_temp.id('agency_a'), pg_temp.id('w_a2')),
  (pg_temp.id('o_b1'), pg_temp.id('agency_b'), pg_temp.id('w_b1'));

INSERT INTO public.screening_reports (order_id, result) VALUES
  (pg_temp.id('o_a1'), 'clear'), (pg_temp.id('o_a2'), 'consider'), (pg_temp.id('o_b1'), 'clear');

INSERT INTO public.screening_consents (worker_id, order_id, consent_type) VALUES
  (pg_temp.id('w_a1'), pg_temp.id('o_a1'), 'fcra'),
  (pg_temp.id('w_a2'), pg_temp.id('o_a2'), 'fcra'),
  (pg_temp.id('w_b1'), pg_temp.id('o_b1'), 'fcra');

-- Visible fixture order ids per table for the current session (fixtures only).
CREATE FUNCTION pg_temp.visible(_tbl text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE r text;
BEGIN
  EXECUTE format($q$
    SELECT coalesce(string_agg(k, ',' ORDER BY k), '') FROM (
      SELECT DISTINCT t.k FROM public.%I x JOIN t_ids t ON t.id = x.%s
      WHERE t.k LIKE 'o_%%') s $q$,
    _tbl, CASE WHEN _tbl = 'screening_orders' THEN 'id' ELSE 'order_id' END) INTO r;
  RETURN r;
END $$;

CREATE FUNCTION pg_temp.expect(_who text, _tbl text, _expected text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE got text := pg_temp.visible(_tbl);
BEGIN
  IF got IS DISTINCT FROM _expected THEN
    RAISE EXCEPTION 'FAIL [%] % visible=% expected=%', _who, _tbl, got, _expected;
  END IF;
  RAISE NOTICE 'ok   [%] % -> {%}', _who, _tbl, got;
END $$;

CREATE FUNCTION pg_temp.act_as(_k text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', pg_temp.id(_k), 'role', 'authenticated')::text, true);
END $$;

CREATE FUNCTION pg_temp.check_all(_who text, _expected text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_temp.expect(_who, 'screening_orders', _expected);
  PERFORM pg_temp.expect(_who, 'screening_reports', _expected);
  PERFORM pg_temp.expect(_who, 'screening_consents', _expected);
END $$;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pg_temp TO authenticated, anon;

-- ---------- Scenarios ----------
SET LOCAL ROLE authenticated;

SELECT pg_temp.act_as('u_worker_a1');  SELECT pg_temp.check_all('worker A1 (own only)', 'o_a1');
SELECT pg_temp.act_as('u_worker_a2');  SELECT pg_temp.check_all('worker A2 same tenant', 'o_a2');
SELECT pg_temp.act_as('u_worker_b1');  SELECT pg_temp.check_all('worker B1 other tenant', 'o_b1');
SELECT pg_temp.act_as('u_orphan');     SELECT pg_temp.check_all('worker role, no worker record', '');
SELECT pg_temp.act_as('u_client');     SELECT pg_temp.check_all('client user', '');
SELECT pg_temp.act_as('u_admin_a');    SELECT pg_temp.check_all('agency A admin', 'o_a1,o_a2');
SELECT pg_temp.act_as('u_admin_b');    SELECT pg_temp.check_all('agency B admin', 'o_b1');

-- Workers cannot write any screening data.
SELECT pg_temp.act_as('u_worker_a1');
DO $$ DECLARE n int; BEGIN
  UPDATE public.screening_reports SET result = 'tampered' WHERE order_id = pg_temp.id('o_a1');
  GET DIAGNOSTICS n = ROW_COUNT; IF n > 0 THEN RAISE EXCEPTION 'FAIL worker updated own report'; END IF;
  UPDATE public.screening_orders SET status = 'completed' WHERE id = pg_temp.id('o_a1');
  GET DIAGNOSTICS n = ROW_COUNT; IF n > 0 THEN RAISE EXCEPTION 'FAIL worker updated own order'; END IF;
  DELETE FROM public.screening_consents WHERE worker_id = pg_temp.id('w_a1');
  GET DIAGNOSTICS n = ROW_COUNT; IF n > 0 THEN RAISE EXCEPTION 'FAIL worker deleted own consent'; END IF;
  BEGIN
    INSERT INTO public.screening_reports (order_id, result) VALUES (pg_temp.id('o_a1'), 'forged');
    RAISE EXCEPTION 'FAIL worker inserted report';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    INSERT INTO public.screening_orders (agency_id, worker_id) VALUES (pg_temp.id('agency_a'), pg_temp.id('w_a1'));
    RAISE EXCEPTION 'FAIL worker inserted order';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RAISE NOTICE 'ok   [worker A1] cannot write screening data';
END $$;

-- Anonymous visitors see nothing.
RESET ROLE;
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.screening_reports) OR EXISTS (SELECT 1 FROM public.screening_orders)
     OR EXISTS (SELECT 1 FROM public.screening_consents) THEN
    RAISE EXCEPTION 'FAIL anon can read screening data';
  END IF;
  RAISE NOTICE 'ok   [anon] no access';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok   [anon] no access (no grant)';
END $$;

RESET ROLE;
SELECT 'ALL SCREENING RLS CHECKS PASSED' AS result;
ROLLBACK;
