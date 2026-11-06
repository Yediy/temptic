-- Screening access audit regression test. Runs in a transaction and rolls back.
BEGIN;
DO $$
DECLARE a1 uuid := gen_random_uuid(); a2 uuid := gen_random_uuid();
  admin1 uuid; outsider uuid; wuser uuid; w1 uuid := gen_random_uuid();
  o1 uuid := gen_random_uuid(); c1 uuid := gen_random_uuid(); n int; url text;
BEGIN
  SELECT id INTO admin1 FROM auth.users ORDER BY created_at LIMIT 1 OFFSET 0;
  SELECT id INTO outsider FROM auth.users ORDER BY created_at LIMIT 1 OFFSET 1;
  SELECT id INTO wuser FROM auth.users ORDER BY created_at LIMIT 1 OFFSET 2;
  INSERT INTO agencies(id, name) VALUES (a1,'T1'),(a2,'T2');
  INSERT INTO agency_members(agency_id,user_id,role,is_active) VALUES (a1,admin1,'agency_admin',true),(a2,outsider,'agency_admin',true);
  INSERT INTO workers(id, agency_id, user_id, first_name, last_name) VALUES (w1,a1,wuser,'W','One');
  INSERT INTO screening_orders(id,agency_id,worker_id) VALUES (o1,a1,w1);
  INSERT INTO screening_consents(id,worker_id,order_id,consent_type,document_url) VALUES (c1,w1,o1,'fcra','doc://c1');

  -- worker signs -> logged
  PERFORM set_config('request.jwt.claims', json_build_object('sub',wuser,'role','authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  PERFORM public.sign_screening_consent(c1);
  url := public.get_screening_document('consent', c1);
  RESET ROLE;
  -- outsider read is ignored, download denied
  PERFORM set_config('request.jwt.claims', json_build_object('sub',outsider,'role','authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  n := public.log_screening_access('order', ARRAY[o1]);
  IF n <> 0 THEN RAISE EXCEPTION 'outsider read was logged'; END IF;
  BEGIN PERFORM public.get_screening_document('consent', c1); RAISE EXCEPTION 'outsider download allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  IF EXISTS (SELECT 1 FROM screening_access_log WHERE agency_id=a1) THEN RAISE EXCEPTION 'outsider sees other agency log'; END IF;
  RESET ROLE;
  -- admin reads -> logged, sees trail, cannot edit
  PERFORM set_config('request.jwt.claims', json_build_object('sub',admin1,'role','authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  n := public.log_screening_access('order', ARRAY[o1]);
  IF n <> 1 THEN RAISE EXCEPTION 'admin read not logged'; END IF;
  SELECT count(*) INTO n FROM screening_access_log WHERE agency_id=a1;
  IF n <> 3 THEN RAISE EXCEPTION 'expected 3 entries (sign, download, read), got %', n; END IF;
  BEGIN DELETE FROM screening_access_log WHERE agency_id=a1; GET DIAGNOSTICS n = ROW_COUNT;
    IF n > 0 THEN RAISE EXCEPTION 'log deletable'; END IF;
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RESET ROLE;
  RAISE NOTICE 'ALL SCREENING ACCESS LOG CHECKS PASSED';
END $$;
ROLLBACK;
