
DROP TRIGGER IF EXISTS trg_guard_training_progress ON public.training_progress;
DROP FUNCTION IF EXISTS public.guard_training_progress();

CREATE OR REPLACE FUNCTION private.guard_training_progress()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  wall_delta int;
  claim_delta int;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    wall_delta := GREATEST(0, EXTRACT(EPOCH FROM (now() - OLD.updated_at))::int + 2);
    claim_delta := GREATEST(0, NEW.watched_seconds - OLD.watched_seconds);
    IF claim_delta > wall_delta THEN
      NEW.watched_seconds := OLD.watched_seconds + wall_delta;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION private.guard_training_progress() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_guard_training_progress BEFORE UPDATE ON public.training_progress
  FOR EACH ROW EXECUTE FUNCTION private.guard_training_progress();
