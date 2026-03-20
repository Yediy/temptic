
-- Replace register_agency to use auth.uid() instead of accepting arbitrary _user_id
CREATE OR REPLACE FUNCTION public.register_agency(_agency_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _agency_id UUID;
  _existing UUID;
  _user_id UUID;
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT agency_id INTO _existing FROM public.agency_members WHERE user_id = _user_id LIMIT 1;
  IF _existing IS NOT NULL THEN
    RETURN _existing;
  END IF;

  INSERT INTO public.agencies (name) VALUES (_agency_name) RETURNING id INTO _agency_id;
  INSERT INTO public.agency_members (agency_id, user_id, role) VALUES (_agency_id, _user_id, 'agency_admin');
  INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, 'agency_admin');

  RETURN _agency_id;
END;
$$;

-- Lock down user_roles INSERT - only register_agency (security definer) should insert roles
DROP POLICY IF EXISTS "Users insert own roles" ON public.user_roles;
