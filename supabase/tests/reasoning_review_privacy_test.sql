BEGIN;
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['woic_reasoning_reviews','woic_reasoning_review_actions','woic_reasoning_gateway_state'] LOOP
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = ('public.' || t)::regclass) THEN
      RAISE EXCEPTION 'RLS must be enabled for %', t;
    END IF;
    IF NOT has_table_privilege('authenticated', 'public.' || t, 'SELECT') THEN
      RAISE EXCEPTION 'Authorized readers need SELECT on %', t;
    END IF;
    IF has_table_privilege('authenticated', 'public.' || t, 'INSERT,UPDATE,DELETE') THEN
      RAISE EXCEPTION 'Browser writes must not be allowed on %', t;
    END IF;
    IF has_table_privilege('anon', 'public.' || t, 'SELECT') THEN
      RAISE EXCEPTION 'Anonymous readers must not see %', t;
    END IF;
  END LOOP;
END $$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000000","role":"authenticated"}',true);
DO $$
BEGIN
  IF EXISTS(SELECT 1 FROM public.woic_reasoning_reviews)
    OR EXISTS(SELECT 1 FROM public.woic_reasoning_review_actions)
    OR EXISTS(SELECT 1 FROM public.woic_reasoning_gateway_state) THEN
    RAISE EXCEPTION 'A user without tenant membership must not see reasoning data';
  END IF;
END $$;
ROLLBACK;