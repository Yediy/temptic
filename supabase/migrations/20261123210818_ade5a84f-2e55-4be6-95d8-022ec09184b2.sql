CREATE INDEX IF NOT EXISTS reviews_trace_idx ON public.woic_reasoning_reviews(trace_id);
CREATE INDEX IF NOT EXISTS review_actions_agency_idx ON public.woic_reasoning_review_actions(agency_id);
