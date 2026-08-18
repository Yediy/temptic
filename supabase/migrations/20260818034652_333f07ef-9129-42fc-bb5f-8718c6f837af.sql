ALTER TABLE public.passport_sharing
  ADD COLUMN IF NOT EXISTS max_uses integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS used_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS one_time boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS revoked_by uuid,
  ADD COLUMN IF NOT EXISTS revoked_reason text,
  ADD COLUMN IF NOT EXISTS last_viewed_ip text,
  ADD COLUMN IF NOT EXISTS last_viewed_user_agent text;

CREATE UNIQUE INDEX IF NOT EXISTS passport_sharing_token_hash_key ON public.passport_sharing (token_hash);

DROP POLICY IF EXISTS "Worker manages own passport sharing" ON public.passport_sharing;

CREATE POLICY "Owner views own share links"
ON public.passport_sharing FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.workforce_passports wp
  JOIN public.workers w ON w.id = wp.worker_id
  WHERE wp.id = passport_sharing.passport_id AND w.user_id = auth.uid()
));

CREATE POLICY "Owner revokes own share links"
ON public.passport_sharing FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.workforce_passports wp
  JOIN public.workers w ON w.id = wp.worker_id
  WHERE wp.id = passport_sharing.passport_id AND w.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.workforce_passports wp
  JOIN public.workers w ON w.id = wp.worker_id
  WHERE wp.id = passport_sharing.passport_id AND w.user_id = auth.uid()
));

REVOKE ALL ON public.passport_sharing FROM anon;
REVOKE INSERT, DELETE ON public.passport_sharing FROM authenticated;
GRANT SELECT ON public.passport_sharing TO authenticated;
GRANT UPDATE (revoked_at, revoked_reason, revoked_by, label) ON public.passport_sharing TO authenticated;
GRANT ALL ON public.passport_sharing TO service_role;

CREATE OR REPLACE FUNCTION public.protect_passport_share_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('role', true) = 'service_role'
     OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  NEW.passport_id := OLD.passport_id;
  NEW.token_hash := OLD.token_hash;
  NEW.scopes := OLD.scopes;
  NEW.expires_at := OLD.expires_at;
  NEW.max_uses := OLD.max_uses;
  NEW.used_count := OLD.used_count;
  NEW.one_time := OLD.one_time;
  NEW.view_count := OLD.view_count;
  NEW.last_viewed_at := OLD.last_viewed_at;
  NEW.last_viewed_ip := OLD.last_viewed_ip;
  NEW.last_viewed_user_agent := OLD.last_viewed_user_agent;
  NEW.created_by := OLD.created_by;
  NEW.created_at := OLD.created_at;

  IF OLD.revoked_at IS NOT NULL THEN
    NEW.revoked_at := OLD.revoked_at;
  ELSIF NEW.revoked_at IS NOT NULL THEN
    NEW.revoked_at := now();
    NEW.revoked_by := auth.uid();
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_passport_share_link ON public.passport_sharing;
CREATE TRIGGER trg_protect_passport_share_link
BEFORE UPDATE ON public.passport_sharing
FOR EACH ROW EXECUTE FUNCTION public.protect_passport_share_link();