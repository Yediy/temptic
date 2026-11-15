-- Regression test: passport share-link lifecycle side effects in the database.
--  * owner notices on open (multi-use + one-time), owner revoke, NOT on single-use auto-close
--  * hourly expiry sweep notifies once per link (idempotent) and skips revoked/used-up links
--  * users can only change read_at on their notices; other owners can't see them
-- Runs inside a transaction and ROLLS BACK. Uses any existing passport as a fixture.
-- Run: psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/passport_share_lifecycle_test.sql
BEGIN;

DO $$
DECLARE
  _passport uuid; _owner uuid := gen_random_uuid(); _other uuid := gen_random_uuid();
  _multi uuid; _once uuid; _rev uuid; _exp uuid; _exp_used uuid; _exp_rev uuid; n int;
BEGIN
  SELECT id INTO _passport FROM public.workforce_passports LIMIT 1;
  IF _passport IS NULL THEN RAISE NOTICE 'SKIP: no passport fixture'; RETURN; END IF;

  INSERT INTO public.passport_sharing (passport_id, token_hash, label, scopes, expires_at, max_uses, one_time, created_by)
  VALUES (_passport, md5(random()::text), 'multi', '{skills}', now() + interval '1 day', 3, false, _owner) RETURNING id INTO _multi;
  INSERT INTO public.passport_sharing (passport_id, token_hash, label, scopes, expires_at, max_uses, one_time, created_by)
  VALUES (_passport, md5(random()::text), 'once', '{skills}', now() + interval '1 day', 1, true, _owner) RETURNING id INTO _once;
  INSERT INTO public.passport_sharing (passport_id, token_hash, label, scopes, expires_at, max_uses, one_time, created_by)
  VALUES (_passport, md5(random()::text), 'rev', '{skills}', now() + interval '1 day', 1, true, _owner) RETURNING id INTO _rev;
  INSERT INTO public.passport_sharing (passport_id, token_hash, label, scopes, expires_at, max_uses, one_time, created_by)
  VALUES (_passport, md5(random()::text), 'exp', '{skills}', now() - interval '1 minute', 1, true, _owner) RETURNING id INTO _exp;
  INSERT INTO public.passport_sharing (passport_id, token_hash, label, scopes, expires_at, max_uses, one_time, used_count, created_by)
  VALUES (_passport, md5(random()::text), 'exp-used', '{skills}', now() - interval '1 minute', 1, true, 1, _owner) RETURNING id INTO _exp_used;
  INSERT INTO public.passport_sharing (passport_id, token_hash, label, scopes, expires_at, max_uses, one_time, revoked_at, created_by)
  VALUES (_passport, md5(random()::text), 'exp-rev', '{skills}', now() - interval '1 minute', 1, true, now(), _owner) RETURNING id INTO _exp_rev;

  -- multi-use open → 'accessed'
  UPDATE public.passport_sharing SET used_count = 1 WHERE id = _multi;
  SELECT count(*) INTO n FROM public.passport_share_notifications WHERE link_id = _multi AND kind = 'accessed';
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL multi open: expected 1 accessed notice, got %', n; END IF;

  -- one-time consumption (same shape as passport-share-view) → 'accessed' only, no 'revoked'
  UPDATE public.passport_sharing SET used_count = 1, revoked_at = now(), revoked_reason = 'single_use_consumed' WHERE id = _once;
  SELECT count(*) INTO n FROM public.passport_share_notifications WHERE link_id = _once AND kind = 'accessed';
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL one-time: expected accessed notice'; END IF;
  SELECT count(*) INTO n FROM public.passport_share_notifications WHERE link_id = _once AND kind = 'revoked';
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL one-time: auto-close must not raise revoked notice'; END IF;

  -- owner revoke → 'revoked' with reason
  UPDATE public.passport_sharing SET revoked_at = now(), revoked_by = _owner, revoked_reason = 'changed mind' WHERE id = _rev;
  SELECT count(*) INTO n FROM public.passport_share_notifications WHERE link_id = _rev AND kind = 'revoked' AND body LIKE '%changed mind%';
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL revoke notice'; END IF;
  -- revoking again does not duplicate
  UPDATE public.passport_sharing SET revoked_reason = 'again' WHERE id = _rev;
  SELECT count(*) INTO n FROM public.passport_share_notifications WHERE link_id = _rev AND kind = 'revoked';
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL revoke duplicated'; END IF;

  -- expiry sweep: only the unused, unrevoked expired link; idempotent
  PERFORM private.notify_expired_share_links();
  PERFORM private.notify_expired_share_links();
  SELECT count(*) INTO n FROM public.passport_share_notifications WHERE link_id = _exp AND kind = 'expired';
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL expiry: expected exactly 1 notice, got %', n; END IF;
  SELECT count(*) INTO n FROM public.passport_share_notifications WHERE link_id IN (_exp_used, _exp_rev) AND kind = 'expired';
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL expiry: used-up / revoked links must not get expiry notice'; END IF;

  -- RLS: owner sees own notices, other user sees none, only read_at editable
  PERFORM set_config('request.jwt.claims', json_build_object('sub', _owner, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM public.passport_share_notifications WHERE recipient_id = _owner;
  IF n < 4 THEN RAISE EXCEPTION 'FAIL owner visibility: %', n; END IF;
  UPDATE public.passport_share_notifications SET read_at = now() WHERE link_id = _multi;
  BEGIN
    UPDATE public.passport_share_notifications SET title = 'tampered' WHERE link_id = _multi;
    RAISE EXCEPTION 'FAIL: title edit should be blocked';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'FAIL%' THEN RAISE; END IF;
  END;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', _other, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM public.passport_share_notifications;
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL cross-user visibility: %', n; END IF;
  RESET ROLE;

  RAISE NOTICE 'PASS: passport share lifecycle (notices, expiry sweep, RLS)';
END $$;

ROLLBACK;
