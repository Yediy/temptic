
-- Add token_hash column
ALTER TABLE public.client_invites ADD COLUMN IF NOT EXISTS token_hash text;

-- Drop unique constraint on plaintext token
ALTER TABLE public.client_invites DROP CONSTRAINT IF EXISTS client_invites_token_key;

-- Backfill: hash existing tokens, replace plaintext with row id
UPDATE public.client_invites
SET token_hash = encode(extensions.digest(token::bytea, 'sha256'), 'hex'),
    token = id::text
WHERE token IS NOT NULL AND token != '';

-- Add unique constraint on token_hash
ALTER TABLE public.client_invites ADD CONSTRAINT client_invites_token_hash_key UNIQUE (token_hash);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_client_invites_token_hash ON public.client_invites (token_hash);
