ALTER FUNCTION public.woic_match_memory(uuid, public.vector, integer, text) SET search_path = public, extensions;
ALTER EXTENSION vector SET SCHEMA extensions;
NOTIFY pgrst, 'reload schema';