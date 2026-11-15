CREATE TABLE public.passport_share_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL,
  link_id uuid NOT NULL REFERENCES public.passport_sharing(id) ON DELETE CASCADE,
  passport_id uuid NOT NULL,
  kind text NOT NULL,
  title text NOT NULL,
  body text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.passport_share_notifications TO authenticated;
GRANT ALL ON public.passport_share_notifications TO service_role;
ALTER TABLE public.passport_share_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner reads own share notifications" ON public.passport_share_notifications
  FOR SELECT TO authenticated USING (recipient_id = auth.uid());
CREATE POLICY "Owner marks own share notifications read" ON public.passport_share_notifications
  FOR UPDATE TO authenticated USING (recipient_id = auth.uid()) WITH CHECK (recipient_id = auth.uid());
CREATE INDEX ON public.passport_share_notifications (recipient_id, created_at DESC);
CREATE UNIQUE INDEX passport_share_notifications_expired_once ON public.passport_share_notifications (link_id) WHERE kind = 'expired';

CREATE OR REPLACE FUNCTION private.protect_share_notification_update() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF auth.role() <> 'service_role' AND (
     NEW.recipient_id IS DISTINCT FROM OLD.recipient_id OR NEW.link_id IS DISTINCT FROM OLD.link_id OR
     NEW.kind IS DISTINCT FROM OLD.kind OR NEW.title IS DISTINCT FROM OLD.title OR
     NEW.body IS DISTINCT FROM OLD.body OR NEW.metadata IS DISTINCT FROM OLD.metadata OR
     NEW.created_at IS DISTINCT FROM OLD.created_at OR NEW.passport_id IS DISTINCT FROM OLD.passport_id) THEN
    RAISE EXCEPTION 'Only read status can be changed';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER protect_share_notification_update BEFORE UPDATE ON public.passport_share_notifications
  FOR EACH ROW EXECUTE FUNCTION private.protect_share_notification_update();

CREATE OR REPLACE FUNCTION private.notify_share_owner() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _label text := coalesce(NEW.label, 'Share link');
BEGIN
  IF NEW.created_by IS NULL THEN RETURN NEW; END IF;
  IF NEW.used_count > OLD.used_count THEN
    INSERT INTO public.passport_share_notifications (recipient_id, link_id, passport_id, kind, title, body, metadata)
    VALUES (NEW.created_by, NEW.id, NEW.passport_id, 'accessed',
      _label || ' was opened',
      CASE WHEN NEW.one_time THEN 'Your one-time link was used and is now closed.'
           ELSE format('Use %s of %s.', NEW.used_count, NEW.max_uses) END,
      jsonb_build_object('use', NEW.used_count, 'max_uses', NEW.max_uses, 'one_time', NEW.one_time));
  END IF;
  IF OLD.revoked_at IS NULL AND NEW.revoked_at IS NOT NULL
     AND coalesce(NEW.revoked_reason, '') <> 'single_use_consumed' THEN
    INSERT INTO public.passport_share_notifications (recipient_id, link_id, passport_id, kind, title, body, metadata)
    VALUES (NEW.created_by, NEW.id, NEW.passport_id, 'revoked',
      _label || ' was revoked',
      coalesce('Reason: ' || NEW.revoked_reason, 'The link can no longer be used.'),
      jsonb_build_object('revoked_by_self', NEW.revoked_by = NEW.created_by));
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.notify_share_owner() FROM PUBLIC;
CREATE TRIGGER notify_share_owner AFTER UPDATE ON public.passport_sharing
  FOR EACH ROW EXECUTE FUNCTION private.notify_share_owner();

-- Persist expiry notices; the owner's open app also raises an instant toast at the exact expiry time.
CREATE OR REPLACE FUNCTION private.notify_expired_share_links() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  INSERT INTO public.passport_share_notifications (recipient_id, link_id, passport_id, kind, title, body, metadata)
  SELECT s.created_by, s.id, s.passport_id, 'expired',
         coalesce(s.label, 'Share link') || ' expired',
         CASE WHEN s.used_count = 0 THEN 'It expired without being opened.' ELSE format('It was opened %s time(s) before expiring.', s.used_count) END,
         jsonb_build_object('expires_at', s.expires_at, 'used_count', s.used_count)
  FROM public.passport_sharing s
  WHERE s.created_by IS NOT NULL AND s.revoked_at IS NULL AND s.expires_at IS NOT NULL
    AND s.expires_at <= now() AND s.expires_at > now() - interval '30 days'
    AND s.used_count < s.max_uses
  ON CONFLICT (link_id) WHERE kind = 'expired' DO NOTHING;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION private.notify_expired_share_links() FROM PUBLIC;
SELECT cron.schedule('passport-share-expiry-notify', '0 * * * *', 'SELECT private.notify_expired_share_links()');

ALTER PUBLICATION supabase_realtime ADD TABLE public.passport_share_notifications;