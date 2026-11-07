CREATE TABLE public.ticket_ai_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL,
  ticket_version integer NOT NULL DEFAULT 1,
  requested_by uuid,
  recommendation text NOT NULL CHECK (recommendation IN ('sign','reject','review')),
  confidence numeric NOT NULL DEFAULT 0,
  summary text NOT NULL DEFAULT '',
  reasoning_steps jsonb NOT NULL DEFAULT '[]',
  evidence jsonb NOT NULL DEFAULT '[]',
  risks jsonb NOT NULL DEFAULT '[]',
  alternatives jsonb NOT NULL DEFAULT '[]',
  checks jsonb NOT NULL DEFAULT '[]',
  suggested_rejection_reason text,
  model text,
  reasoning_trace_id uuid,
  decision_id uuid,
  final_decision text CHECK (final_decision IN ('signed','rejected')),
  followed boolean,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.ticket_ai_reviews(ticket_id, created_at DESC);
GRANT SELECT ON public.ticket_ai_reviews TO authenticated;
GRANT ALL ON public.ticket_ai_reviews TO service_role;
ALTER TABLE public.ticket_ai_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read reviews of visible tickets" ON public.ticket_ai_reviews FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_ai_reviews.ticket_id));

CREATE OR REPLACE FUNCTION private.ticket_ai_review_outcome()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d text;
BEGIN
  IF NEW.status::text IN ('signed','rejected') AND OLD.status IS DISTINCT FROM NEW.status THEN
    d := NEW.status::text;
    UPDATE ticket_ai_reviews r SET final_decision = d, decided_at = now(),
      followed = CASE WHEN r.recommendation = 'review' THEN NULL ELSE (r.recommendation = 'sign') = (d = 'signed') END
    WHERE r.id = (SELECT id FROM ticket_ai_reviews WHERE ticket_id = NEW.id AND final_decision IS NULL ORDER BY created_at DESC LIMIT 1);
  END IF;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION private.ticket_ai_review_outcome() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_ticket_ai_review_outcome AFTER UPDATE OF status ON public.tickets
FOR EACH ROW EXECUTE FUNCTION private.ticket_ai_review_outcome();