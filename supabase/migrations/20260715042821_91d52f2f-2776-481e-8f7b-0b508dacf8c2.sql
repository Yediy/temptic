DROP POLICY IF EXISTS subs_read_all_auth ON public.ttos_event_subscribers;

-- Only service_role needs to read subscribers; automation dispatch runs server-side.
-- No SELECT policy for authenticated users = deny by default under RLS.
REVOKE SELECT ON public.ttos_event_subscribers FROM authenticated;