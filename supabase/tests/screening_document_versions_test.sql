-- Transactional regression; no production records survive the test.
BEGIN;
DO $$
DECLARE agency uuid:=gen_random_uuid(); worker uuid:=gen_random_uuid(); other_worker uuid:=gen_random_uuid();
  order_id uuid:=gen_random_uuid(); consent uuid:=gen_random_uuid(); report uuid:=gen_random_uuid();
  owner_user uuid; other_user uuid; n integer; payload jsonb;
BEGIN
  SELECT id INTO owner_user FROM auth.users ORDER BY created_at LIMIT 1;
  SELECT id INTO other_user FROM auth.users ORDER BY created_at LIMIT 1 OFFSET 1;
  IF owner_user IS NULL OR other_user IS NULL THEN RAISE EXCEPTION 'Two existing auth users are needed'; END IF;
  INSERT INTO agencies(id,name) VALUES(agency,'Screening regression');
  INSERT INTO workers(id,agency_id,user_id,first_name,last_name) VALUES(worker,agency,owner_user,'Test','Owner'),(other_worker,agency,other_user,'Test','Other');
  INSERT INTO screening_orders(id,agency_id,worker_id) VALUES(order_id,agency,worker);
  INSERT INTO screening_reports(id,order_id,result,summary) VALUES(report,order_id,'clear','{}');
  INSERT INTO screening_consents(id,worker_id,order_id,consent_type,consent_text) VALUES(consent,worker,order_id,'background','Test authorization');
  UPDATE screening_consents SET consent_text='Revised authorization' WHERE id=consent;
  SELECT document_version INTO n FROM screening_consents WHERE id=consent;
  IF n<>2 THEN RAISE EXCEPTION 'Consent revision did not increment to version 2'; END IF;
  PERFORM set_config('request.jwt.claims',json_build_object('sub',owner_user,'role','authenticated')::text,true);
  SET LOCAL ROLE authenticated;
  payload:=public.read_worker_screening('consent',consent);
  IF jsonb_array_length(payload)<>1 THEN RAISE EXCEPTION 'Own consent missing'; END IF;
  BEGIN PERFORM public.sign_screening_consent_version(consent,1); RAISE EXCEPTION 'Stale signing allowed'; EXCEPTION WHEN raise_exception THEN IF SQLERRM='Stale signing allowed' THEN RAISE; END IF; END;
  PERFORM public.sign_screening_consent_version(consent,2);
  PERFORM public.download_worker_screening('consent',consent,2);
  RESET ROLE;
  SELECT count(*) INTO n FROM screening_access_log WHERE record_id=consent AND document_version=2 AND action IN ('read','sign','download');
  IF n<>3 THEN RAISE EXCEPTION 'Expected version 2 read, sign and download logs'; END IF;
  BEGIN UPDATE screening_consents SET consent_text='Tampered' WHERE id=consent; RAISE EXCEPTION 'Signed wording changed'; EXCEPTION WHEN raise_exception THEN IF SQLERRM='Signed wording changed' THEN RAISE; END IF; END;
  PERFORM set_config('request.jwt.claims',json_build_object('sub',other_user,'role','authenticated')::text,true);
  SET LOCAL ROLE authenticated;
  payload:=public.read_worker_screening('report',report);
  IF jsonb_array_length(payload)<>0 THEN RAISE EXCEPTION 'Other worker report leaked'; END IF;
  BEGIN PERFORM public.download_worker_screening('consent',consent,2); RAISE EXCEPTION 'Other worker download allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RESET ROLE;
END $$;
ROLLBACK;