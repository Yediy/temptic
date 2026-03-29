
-- Drop trigger first, then function
DROP TRIGGER IF EXISTS trg_hash_invite_token ON public.client_invites;
DROP FUNCTION IF EXISTS public.hash_invite_token();
