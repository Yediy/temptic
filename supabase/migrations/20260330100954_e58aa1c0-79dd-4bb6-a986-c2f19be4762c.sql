
-- Drop the plaintext token column to prevent exposure
ALTER TABLE public.client_invites DROP COLUMN IF EXISTS token;

-- Remove the obsolete trigger and function if they exist
DROP TRIGGER IF EXISTS trg_hash_invite_token ON public.client_invites;
DROP FUNCTION IF EXISTS public.hash_invite_token();
