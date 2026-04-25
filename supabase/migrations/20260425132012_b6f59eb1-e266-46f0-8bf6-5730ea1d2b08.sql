-- Distributed rate limiting table
CREATE TABLE public.rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  reset_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for cleanup queries
CREATE INDEX idx_rate_limits_reset_at ON public.rate_limits(reset_at);

-- Enable RLS — no user policies = no user access (only service role bypasses RLS)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Atomic check-and-increment function
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _key TEXT,
  _max_requests INTEGER,
  _window_seconds INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _now TIMESTAMPTZ := now();
  _new_count INTEGER;
  _reset_at TIMESTAMPTZ;
BEGIN
  -- Opportunistic cleanup of expired entries (sampled)
  IF random() < 0.01 THEN
    DELETE FROM public.rate_limits WHERE reset_at < _now;
  END IF;

  -- Atomic upsert: insert new window or increment existing
  INSERT INTO public.rate_limits (key, count, reset_at)
  VALUES (_key, 1, _now + (_window_seconds || ' seconds')::interval)
  ON CONFLICT (key) DO UPDATE
    SET count = CASE
          WHEN public.rate_limits.reset_at < _now THEN 1
          ELSE public.rate_limits.count + 1
        END,
        reset_at = CASE
          WHEN public.rate_limits.reset_at < _now THEN _now + (_window_seconds || ' seconds')::interval
          ELSE public.rate_limits.reset_at
        END
  RETURNING count, reset_at INTO _new_count, _reset_at;

  -- Return true if rate limited (count exceeds max)
  RETURN _new_count > _max_requests;
END;
$$;

-- Restrict function execution to service_role only
REVOKE ALL ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) FROM authenticated;
REVOKE ALL ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) FROM anon;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) TO service_role;