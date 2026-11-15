-- Read-only regression checks: division by zero fails if an invariant is broken.
SELECT 1 / CASE WHEN (
  SELECT n.nspname = 'extensions'
  FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace
  WHERE e.extname = 'vector'
) THEN 1 ELSE 0 END AS extension_schema_ok;

SELECT 1 / CASE WHEN (
  SELECT 'search_path=public, extensions' = ANY(p.proconfig)
  FROM pg_proc p
  WHERE p.oid = 'public.woic_match_memory(uuid,extensions.vector,integer,text)'::regprocedure
) THEN 1 ELSE 0 END AS memory_search_path_ok;

SELECT 1 / CASE WHEN
  '[1,0]'::extensions.vector OPERATOR(extensions.<=>) '[1,0]'::extensions.vector = 0
  AND '[1,0]'::extensions.vector OPERATOR(extensions.<=>) '[0,1]'::extensions.vector = 1
THEN 1 ELSE 0 END AS vector_operator_ok;